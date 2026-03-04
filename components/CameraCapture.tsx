"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FILTERS, FilterId } from "./FilterStrip";

type Capture =
  | { kind: "photo"; blob: Blob; url: string }
  | { kind: "video"; blob: Blob; url: string; seconds: number };

function isSecureContextForCamera() {
  // https or localhost 는 OK, 그 외 http(ip접속)는 대부분 모바일에서 막힘
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const isLocalhost = host === "localhost" || host === "127.0.0.1";
  return window.isSecureContext || isLocalhost;
}

export function CameraCapture(props: {
  filterId: FilterId;
  filterStrength: number;
  onCaptured: (cap: Capture | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filterCss = useMemo(() => {
    const f = FILTERS.find((x) => x.id === props.filterId)!;
    return f.css(props.filterStrength);
  }, [props.filterId, props.filterStrength]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setErrorMsg(null);

        // 1) HTTPS/보안 컨텍스트 체크
        if (!isSecureContextForCamera()) {
          setErrorMsg(
            "카메라 사용을 위해 HTTPS가 필요해요.\n\n" +
              "로컬에서 폰으로 테스트 중이면:\n" +
              "1) Vercel(또는 HTTPS 도메인)에 배포해서 접속하거나\n" +
              "2) 개발용 HTTPS 프록시(ngrok/cloudflared)를 사용해줘."
          );
          return;
        }

        // 2) 지원 여부 체크
        const md = navigator?.mediaDevices;
        if (!md?.getUserMedia) {
          setErrorMsg(
            "이 브라우저에서 카메라 API(getUserMedia)를 지원하지 않거나 권한이 막혔어요.\n\n" +
              "iOS라면 Safari/Chrome 모두 HTTPS에서 동작해야 하고,\n" +
              "설정에서 카메라 권한을 허용해야 해요."
          );
          return;
        }

        const stream = await md.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });

        if (cancelled) return;
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setReady(true);
      } catch (e: any) {
        console.error(e);
        setErrorMsg(
          "카메라를 시작할 수 없어요.\n\n" +
            "가능한 원인:\n" +
            "- 카메라 권한 거부\n" +
            "- HTTPS 아님\n" +
            "- 다른 앱이 카메라 사용 중\n\n" +
            `에러: ${e?.message ?? "unknown"}`
        );
      }
    }

    init();

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function takePhoto() {
    const v = videoRef.current;
    if (!v) return;

    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;

    const ctx = canvas.getContext("2d")!;
    ctx.filter = filterCss;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      props.onCaptured({ kind: "photo", blob, url });
    }, "image/jpeg", 0.92);
  }

  function startRecording() {
    if (!streamRef.current) return;

    chunksRef.current = [];

    const options: MediaRecorderOptions = {};
    const preferred = "video/webm;codecs=vp8,opus";
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(preferred)) {
      options.mimeType = preferred;
    }

    const rec = new MediaRecorder(streamRef.current, options);
    recorderRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      props.onCaptured({ kind: "video", blob, url, seconds });
    };

    setSeconds(0);
    setRecording(true);
    rec.start(200);

    timerRef.current = window.setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        if (next >= 20) stopRecording();
        return next;
      });
    }, 1000);
  }

  function stopRecording() {
    if (!recording) return;
    setRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
    recorderRef.current?.stop();
  }

  if (errorMsg) {
    return (
      <div style={panel}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>카메라를 사용할 수 없음</div>
        <pre style={{ whiteSpace: "pre-wrap", opacity: 0.9, margin: 0 }}>{errorMsg}</pre>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,0.14)", background: "#111" }}>
        <video ref={videoRef} playsInline muted style={{ width: "100%", height: "auto", display: "block", filter: filterCss }} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button disabled={!ready || recording} onClick={takePhoto} style={btn}>
          📸 사진
        </button>

        {!recording ? (
          <button disabled={!ready} onClick={startRecording} style={btnPrimary}>
            ⏺️ 영상 시작 (최대 20초)
          </button>
        ) : (
          <button onClick={stopRecording} style={btnDanger}>
            ⏹️ 정지 ({seconds}s)
          </button>
        )}

        <button onClick={() => props.onCaptured(null)} style={btnGhost}>
          초기화
        </button>
      </div>

      <div style={{ opacity: 0.75, fontSize: 12 }}>영상은 5~20초. (20초 자동 제한)</div>
    </div>
  );
}

const panel: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  padding: 12,
};

const btn: React.CSSProperties = {
  borderRadius: 12,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.10)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.14)",
  cursor: "pointer",
  fontWeight: 800,
};

const btnPrimary: React.CSSProperties = { ...btn, background: "#fff", color: "#000", border: "none" };
const btnDanger: React.CSSProperties = { ...btn, background: "rgba(255,60,60,0.9)", border: "none" };
const btnGhost: React.CSSProperties = { ...btn, background: "transparent" };