"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { EMOTIONS } from "@/lib/emotions";
import { DonutChart, BarList } from "@/components/MiniCharts";
import { useAuth } from "@/components/AuthProvider";

export default function MePage() {
  const { user, ready, signOut } = useAuth();
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !user) return;

    (async () => {
      setLoading(true);
      try {
        // 내가 올린 posts (최근 300)
        const { data: posts, error: pErr } = await supabase
          .from("posts")
          .select("emotion_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(300);

        if (pErr) throw pErr;

        const pc: Record<string, number> = {};
        for (const p of posts ?? []) {
          const k = p.emotion_id ?? "none";
          pc[k] = (pc[k] ?? 0) + 1;
        }
        setPostCounts(pc);

        // 내가 본(view) interactions (최근 600)
        const { data: views, error: vErr } = await supabase
          .from("interactions")
          .select("post_id")
          .eq("user_id", user.id)
          .eq("type", "view")
          .order("created_at", { ascending: false })
          .limit(600);

        if (vErr) throw vErr;

        const ids = Array.from(new Set((views ?? []).map((v) => v.post_id))).slice(0, 200);
        if (!ids.length) {
          setViewCounts({});
          return;
        }

        const { data: viewedPosts, error: vpErr } = await supabase.from("posts").select("id, emotion_id").in("id", ids);
        if (vpErr) throw vpErr;

        const vc: Record<string, number> = {};
        for (const vp of viewedPosts ?? []) {
          const k = vp.emotion_id ?? "none";
          vc[k] = (vc[k] ?? 0) + 1;
        }
        setViewCounts(vc);
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "히스토리 로드 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, user]);

  const postData = useMemo(() => toChartData(postCounts), [postCounts]);
  const viewData = useMemo(() => toChartData(viewCounts), [viewCounts]);

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto", display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>내 감정 히스토리</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
            {ready ? (user ? `내 ID: ${user.id.slice(0, 8)}… (익명)` : "세션 없음") : "세션 준비 중..."}
          </div>
        </div>
        <button onClick={signOut} style={btnGhost}>세션 초기화</button>
      </div>

      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>내가 올린 감정 분포</div>
        {loading ? (
          <div style={{ opacity: 0.7 }}>로딩...</div>
        ) : (
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <DonutChart data={postData} />
            <BarList data={postData} />
          </div>
        )}
      </section>

      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>내가 본 감정 분포 (view)</div>
        {loading ? (
          <div style={{ opacity: 0.7 }}>로딩...</div>
        ) : (
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <DonutChart data={viewData} />
            <BarList data={viewData} />
          </div>
        )}
      </section>
    </div>
  );
}

function toChartData(counts: Record<string, number>) {
  const mapped = EMOTIONS.map((e) => ({ label: `${e.emoji} ${e.label}`, value: counts[e.id] ?? 0 }));
  const none = counts["none"] ?? 0;
  return none ? [...mapped, { label: "선택 없음", value: none }] : mapped;
}

const card: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 18,
  padding: 12,
  background: "rgba(255,255,255,0.04)",
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