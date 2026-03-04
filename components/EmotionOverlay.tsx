"use client";

import { EMOTIONS, EmotionId } from "@/lib/emotions";

export function EmotionOverlay(props: {
  open: boolean;
  selectedEmotion: EmotionId | null;
  intensity: number; // 1~5
  onSelectEmotion: (id: EmotionId | null) => void;
  onIntensity: (v: number) => void;
  onClose: () => void;
}) {
  if (!props.open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16
    }}>
      <div style={{
        width: "min(520px, 100%)",
        borderRadius: 18,
        background: "rgba(20,20,20,0.85)",
        border: "1px solid rgba(255,255,255,0.12)",
        padding: 16
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>지금 감정</div>
          <button onClick={props.onClose} style={btnGhost}>닫기</button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <button
            onClick={() => props.onSelectEmotion(null)}
            style={{
              ...chip,
              opacity: props.selectedEmotion === null ? 1 : 0.7,
              borderColor: props.selectedEmotion === null ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.14)"
            }}
          >
            선택 안 함
          </button>

          {EMOTIONS.map((e) => (
            <button
              key={e.id}
              onClick={() => props.onSelectEmotion(e.id)}
              style={{
                ...chip,
                opacity: props.selectedEmotion === e.id ? 1 : 0.75,
                borderColor: props.selectedEmotion === e.id ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.14)"
              }}
            >
              <span style={{ fontSize: 18 }}>{e.emoji}</span>
              <span style={{ marginLeft: 6 }}>{e.label}</span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ opacity: 0.9 }}>강도</div>
          <input
            type="range"
            min={1}
            max={5}
            value={props.intensity}
            onChange={(e) => props.onIntensity(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ width: 28, textAlign: "right", fontWeight: 700 }}>{props.intensity}</div>
        </div>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={props.onClose} style={btnPrimary}>카메라로</button>
        </div>
      </div>
    </div>
  );
}

const chip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#fff",
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  borderRadius: 12,
  padding: "10px 12px",
  background: "#fff",
  color: "#000",
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  borderRadius: 12,
  padding: "8px 10px",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.12)",
  cursor: "pointer",
};