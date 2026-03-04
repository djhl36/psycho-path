"use client";

import { useMemo, useState } from "react";
import { EmotionOverlay } from "@/components/EmotionOverlay";
import { CameraCapture } from "@/components/CameraCapture";
import { FilterStrip, FilterId, FILTERS } from "@/components/FilterStrip";
import { EmotionId } from "@/lib/emotions";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

type Capture =
  | { kind: "photo"; blob: Blob; url: string }
  | { kind: "video"; blob: Blob; url: string; seconds: number };

export default function Home() {
  const { user, ready } = useAuth();

  const [overlayOpen, setOverlayOpen] = useState(true);
  const [emotionId, setEmotionId] = useState<EmotionId | null>(null);
  const [intensity, setIntensity] = useState(3);

  const [filterId, setFilterId] = useState<FilterId>("none");
  const [filterStrength, setFilterStrength] = useState(40);

  const [cap, setCap] = useState<Capture | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const filterCss = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filterId)!;
    return f.css(filterStrength);
  }, [filterId, filterStrength]);

  async function upload() {
    console.log("ready:", ready, "user:", user?.id);
    if (!ready) return;
    if (!user) {
      alert("로그인이 아직 준비되지 않았어요. 잠시 후 다시 시도해줘.");
      return;
    }
    if (!cap) return;
    if (cap.kind === "video" && cap.seconds < 5) {
      alert("영상은 최소 5초 이상이어야 해요.");
      return;
    }

    setUploading(true);
    try {
      const ext = cap.kind === "photo" ? "jpg" : "webm";
      const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("media").upload(path, cap.blob, {
        contentType: cap.blob.type,
        upsert: false,
      });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from("posts").insert({
        user_id: user.id,
        media_type: cap.kind === "photo" ? "photo" : "video",
        media_path: path,
        emotion_id: emotionId,
        intensity,
        filter_id: filterId,
        filter_strength: filterStrength,
        caption: caption.trim() ? caption.trim().slice(0, 20) : null,
      });
      if (dbErr) throw dbErr;

      alert("업로드 완료. 피드로 이동합니다.");
      window.location.href = "/feed";
    } catch (e: any) {
      console.error(e);
      alert(`업로드 실패: ${e?.message ?? "unknown"}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto", display: "grid", gap: 14 }}>
      <EmotionOverlay
        open={overlayOpen}
        selectedEmotion={emotionId}
        intensity={intensity}
        onSelectEmotion={setEmotionId}
        onIntensity={setIntensity}
        onClose={() => setOverlayOpen(false)}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>즉각 배출</div>
          <div style={{ opacity: 0.75, marginTop: 4, fontSize: 13 }}>검열 없음 · 죄책감 없음 · 빠른 소비</div>
          <div style={{ opacity: 0.65, marginTop: 4, fontSize: 12 }}>
            {ready ? (user ? `세션: ${user.id.slice(0, 8)}… (익명)` : "세션 없음") : "세션 준비 중..."}
          </div>
        </div>
        <button onClick={() => setOverlayOpen(true)} style={btnGhost}>
          감정
        </button>
      </div>

      <CameraCapture filterId={filterId} filterStrength={filterStrength} onCaptured={setCap} />

      <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 18, padding: 12, display: "grid", gap: 12 }}>
        <FilterStrip filterId={filterId} strength={filterStrength} onFilter={setFilterId} onStrength={setFilterStrength} />
      </div>

      {cap && (
        <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 18, padding: 12, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>미리보기</div>

          <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
            {cap.kind === "photo" ? (
              <img src={cap.url} alt="preview" style={{ width: "100%", display: "block" }} />
            ) : (
              <video src={cap.url} controls playsInline style={{ width: "100%", display: "block", filter: filterCss }} />
            )}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 20))}
              placeholder="(선택) 20자 이하"
              style={input}
            />
            <button disabled={uploading || !ready || !user} onClick={upload} style={btnPrimary}>
              {uploading ? "업로드 중..." : "업로드"}
            </button>
          </div>

          <div style={{ opacity: 0.7, fontSize: 12 }}>* MVP: 영상 필터는 표시만 적용(파일 자체 변환은 나중에).</div>
        </div>
      )}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  borderRadius: 12,
  padding: "10px 12px",
  background: "#fff",
  color: "#000",
  border: "none",
  cursor: "pointer",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const btnGhost: React.CSSProperties = {
  borderRadius: 12,
  padding: "8px 10px",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.12)",
  cursor: "pointer",
  fontWeight: 800,
};

const input: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#fff",
  outline: "none",
};