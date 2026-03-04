"use client";

export function DonutChart({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  const r = 46;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="14" />
      {data.map((d, i) => {
        const frac = d.value / total;
        const dash = frac * c;
        const gap = c - dash;
        const offset = -acc * c;
        acc += frac;

        return (
          <circle
            key={d.label}
            cx="60" cy="60" r={r}
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeOpacity={0.18 + (i % 5) * 0.14}
            strokeWidth="14"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
          />
        );
      })}
      <text x="60" y="64" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="12" fontWeight="800">
        {total}건
      </text>
    </svg>
  );
}

export function BarList({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "grid", gap: 8, width: "100%" }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: "grid", gridTemplateColumns: "72px 1fr 44px", gap: 10, alignItems: "center" }}>
          <div style={{ opacity: 0.9, fontWeight: 800 }}>{d.label}</div>
          <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(d.value / max) * 100}%`, background: "rgba(255,255,255,0.75)" }} />
          </div>
          <div style={{ textAlign: "right", opacity: 0.85, fontWeight: 800 }}>{d.value}</div>
        </div>
      ))}
    </div>
  );
}