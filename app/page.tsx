"use client";

import { useMemo, useState, useEffect } from "react";
import { EmotionOverlay } from "@/components/EmotionOverlay";
import { CameraCapture } from "@/components/CameraCapture";
import { FilterStrip, FilterId, FILTERS } from "@/components/FilterStrip";
import { EmotionId } from "@/lib/emotions";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

type Capture =
  | { kind: "photo"; blob: Blob; url: string }
  | { kind: "video"; blob: Blob; url: string; seconds: number };

function recommendedFilterForEmotion(e: EmotionId | null): FilterId {
  // MVP 추천 매핑 (원하면 더 다듬자)
  switch (e) {
    case "impulse":
      return "hot";
    case "anger":
      return "mono";
    case "pleasure":
      return "dream";
    case "hurt":
      return "mono";
    case "anxiety":
      return "cold";
    case "void":
      return "mono";
    default:
      return "none";
  }
}

export default function Home() {
  const { user, ready } = useAuth();

  const [overlayOpen, setOverlayOpen] = useState(true);
  const [emotionId, setEmotionId] = useState<EmotionId | null>(null);
  const [intensity, setIntensity] = useState(3);

  const [filterId, setFilterId] = useState<FilterId>("none");
  const [filterStrength, setFilterStrength] = useState(40);

  // NEW: camera flip
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const [cap, setCap] = useState<Capture | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  // NEW: emotion -> recommended filter auto-apply (only when emotion changes)
  useEffect(() => {
    const rec = recommendedFilterForEmotion(emotionId);
    setFilterId(rec);

    // 감정이 강할수록 필터 강도도 좀 올리는 느낌(선택)
    setFilterStrength((prev) => {
      const base = 25 + intensity * 12; // intensity 1..5 -> 37..85
      // 사용자가 이미 강도 만지고 있다면 너무 튀지 않게 clamp
      const next = Math.max(0, Math.min(100, base));
      // emotion 바뀔 때만 살짝 맞춰주고 싶으면 prev보다 크거나 같게 유지:
      return Math.round(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emotionId]);

  const filterCss = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filterId)!;
    return f.css(filterStrength);
  }, [filterId, filterStrength]);

  async function upload() {
    if (!ready || !user) {
      alert("세션이 아직 준비되지 않았어요. 잠시 후 다시 시도해줘.");
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
      if (upErr) throw new Error("Storage upload failed: " + upErr.message);

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
      if (dbErr) throw new Error("DB insert failed: " + dbErr.message);

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
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto", display: "grid", gap: 12 }}>
      <EmotionOverlay
        open={overlayOpen}
        selectedEmotion={emotionId}
        intensity={intensity}
        onSelectEmotion={setEmotionId}
        onIntensity={setIntensity}
        onClose={() => setOverlayOpen(false)}
      />

      {/* 1) Camera */}
      <CameraCapture
        filterId={filterId}
        filterStrength={filterStrength}
        onCaptured={setCap}
        facingMode={facingMode}
        onFlip={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
      />

      {/* 2) Emotion button row */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => setOverlayOpen(true)} style={btn}>
          {emotionId ? "감정 변경" : "감정 선택"}
        </button>
        <div style={{ opacity: 0.65, fontSize: 12 }}>
          {ready ? (user ? `세션 ${user.id.slice(0, 8)}…` : "세션 없음") : "세션 준비 중..."}
        </div>
      </div>

      {/* 3) Filters immediately visible */}
      <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 18, padding: 12, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
          <div style={{ fontWeight: 900 }}>필터</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            {emotionId ? `추천: ${labelFilter(filterId)}` : "감정 선택 시 추천됨"}
          </div>
        </div>

        <FilterStrip
          filterId={filterId}
          strength={filterStrength}
          onFilter={setFilterId}
          onStrength={setFilterStrength}
        />
      </div>

      {/* Preview + upload */}
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

          <div style={{ opacity: 0.7, fontSize: 12 }}>
            * MVP: 영상 필터는 표시만 적용(파일 자체 변환은 나중에).
          </div>
        </div>
      )}
    </div>
  );
}

function labelFilter(id: FilterId) {
  const f = FILTERS.find((x) => x.id === id);
  return f?.label ?? id;
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

const input: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#fff",
  outline: "none",
};