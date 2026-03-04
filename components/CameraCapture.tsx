"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FILTERS, FilterId } from "./FilterStrip";

type Capture =
  | { kind: "photo"; blob: Blob; url: string }
  | { kind: "video"; blob: Blob; url: string; seconds: number };

export function CameraCapture(props: {
  filterId: FilterId;
  filterStrength: number;
  onCaptured: (cap: Capture | null) => void;

  // NEW: flip control
  facingMode: "user" | "environment";
  onFlip: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const filterCss = useMemo(() => {
    const f = FILTERS.find((x) => x.id === props.filterId)!;
    return f.css(props.filterStrength);
  }, [props.filterId, props.filterStrength]);

  async function stopStream() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setSeconds(0);

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }

  async function initStream() {
    await stopStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: props.facingMode },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch (e) {
      console.error(e);
      alert("카메라/마이크 권한이 필요합니다.");
    }
  }

  useEffect(() => {
    initStream();
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.facingMode]);

  function takePhoto() {
    const v = videoRef.current;
    if (!v) return;

    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;

    const ctx = canvas.getContext("2d")!;
    ctx.filter = "none"; // ✅ 원본 캡처
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

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "#111",
          position: "relative",
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: "100%", height: "auto", display: "block", filter: filterCss }}
        />

        <button
          onClick={props.onFlip}
          style={{
            position: "absolute",
            right: 10,
            top: 10,
            borderRadius: 999,
            padding: "8px 10px",
            background: "rgba(0,0,0,0.45)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.18)",
            cursor: "pointer",
            fontWeight: 900,
          }}
          title="전면/후면 전환"
        >
          🔁
        </button>

        {recording ? (
          <div
            style={{
              position: "absolute",
              left: 10,
              top: 10,
              borderRadius: 999,
              padding: "6px 10px",
              background: "rgba(255,0,0,0.20)",
              border: "1px solid rgba(255,0,0,0.35)",
              fontWeight: 900,
              fontSize: 12,
            }}
          >
            REC {seconds}s
          </div>
        ) : null}
      </div>

      {/* Controls row (camera 바로 아래) */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button disabled={!ready || recording} onClick={takePhoto} style={btn}>
          📸 사진
        </button>

        {!recording ? (
          <button disabled={!ready} onClick={startRecording} style={btnPrimary}>
            ⏺️ 영상 시작
          </button>
        ) : (
          <button onClick={stopRecording} style={btnDanger}>
            ⏹️ 정지
          </button>
        )}

        <button onClick={() => props.onCaptured(null)} style={btnGhost}>
          초기화
        </button>
      </div>

      <div style={{ opacity: 0.75, fontSize: 12 }}>
        영상은 5~20초 (20초 자동 제한)
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  borderRadius: 12,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.10)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.14)",
  cursor: "pointer",
  fontWeight: 900,
};

const btnPrimary: React.CSSProperties = { ...btn, background: "#fff", color: "#000", border: "none" };
const btnDanger: React.CSSProperties = { ...btn, background: "rgba(255,60,60,0.9)", border: "none" };
const btnGhost: React.CSSProperties = { ...btn, background: "transparent" };