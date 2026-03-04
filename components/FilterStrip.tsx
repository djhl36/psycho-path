"use client";

export type FilterId = "none" | "mono" | "hot" | "cold" | "dream";

export const FILTERS: { id: FilterId; label: string; css: (strength: number) => string }[] = [
  { id: "none", label: "기본", css: () => "none" },
  { id: "mono", label: "모노", css: (s) => `grayscale(${s}%) contrast(${100 + s * 0.4}%)` },
  { id: "hot", label: "열감", css: (s) => `saturate(${100 + s}%) hue-rotate(${Math.min(20, s * 0.2)}deg) contrast(${100 + s * 0.3}%)` },
  { id: "cold", label: "한기", css: (s) => `saturate(${100 + s * 0.4}%) hue-rotate(${-Math.min(25, s * 0.25)}deg) brightness(${100 - s * 0.1}%)` },
  { id: "dream", label: "몽롱", css: (s) => `contrast(${100 - s * 0.15}%) saturate(${100 + s * 0.6}%) blur(${Math.floor(s / 25)}px)` },
];

export function FilterStrip(props: {
  filterId: FilterId;
  strength: number; // 0~100
  onFilter: (id: FilterId) => void;
  onStrength: (v: number) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => props.onFilter(f.id)}
            style={{
              borderRadius: 999,
              padding: "8px 12px",
              background: props.filterId === f.id ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "#fff",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 700
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ opacity: 0.9 }}>필터 강도</div>
        <input
          type="range"
          min={0}
          max={100}
          value={props.strength}
          onChange={(e) => props.onStrength(Number(e.target.value))}
          style={{ width: "100%" }}
        />
        <div style={{ width: 44, textAlign: "right", fontWeight: 700 }}>{props.strength}</div>
      </div>
    </div>
  );
}