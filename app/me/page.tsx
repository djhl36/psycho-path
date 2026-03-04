"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { EMOTIONS } from "@/lib/emotions";
import { FILTERS } from "@/components/FilterStrip";
import { DonutChart, BarList, DominantEmotionSummary } from "@/components/MiniCharts";
import { useAuth } from "@/components/AuthProvider";

type PostMini = {
  id: string;
  created_at: string;
  emotion_id: string | null;
  media_type: "photo" | "video";
  media_path: string;
  filter_id: string | null;
  filter_strength: number | null;
};

function startOfWeek(d: Date) {
  // 월요일 00:00 시작
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toChartData(counts: Record<string, number>) {
  const mapped = EMOTIONS.map((e) => ({ label: `${e.emoji} ${e.label}`, value: counts[e.id] ?? 0 }));
  const none = counts["none"] ?? 0;
  return none ? [...mapped, { label: "선택 없음", value: none }] : mapped;
}

export default function MePage() {
  const { user, ready, signOut } = useAuth();

  const [loading, setLoading] = useState(true);

  const [myPosts, setMyPosts] = useState<PostMini[]>([]);
  const [weekPostCounts, setWeekPostCounts] = useState<Record<string, number>>({});
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!ready || !user) return;

    (async () => {
      setLoading(true);
      try {
        const now = new Date();
        const weekStartIso = startOfWeek(now).toISOString();

        // 1) 이번주 내가 올린 포스트(타임라인)
        const { data: posts, error: pErr } = await supabase
          .from("posts")
          .select("id, created_at, emotion_id, media_type, media_path, filter_id, filter_strength")
          .eq("user_id", user.id)
          .gte("created_at", weekStartIso)
          .order("created_at", { ascending: true })
          .limit(400);

        if (pErr) throw pErr;

        const postList = (posts ?? []) as PostMini[];
        setMyPosts(postList);

        const pc: Record<string, number> = {};
        for (const p of postList) {
          const k = p.emotion_id ?? "none";
          pc[k] = (pc[k] ?? 0) + 1;
        }
        setWeekPostCounts(pc);

        // 2) 내가 본 감정 분포(view) (최근 600)
        const { data: views, error: vErr } = await supabase
          .from("interactions")
          .select("post_id")
          .eq("user_id", user.id)
          .eq("type", "view")
          .order("created_at", { ascending: false })
          .limit(600);

        if (vErr) throw vErr;

        const ids = Array.from(new Set((views ?? []).map((v: any) => v.post_id))).slice(0, 200);
        if (!ids.length) {
          setViewCounts({});
        } else {
          const { data: viewedPosts, error: vpErr } = await supabase
            .from("posts")
            .select("id, emotion_id")
            .in("id", ids);

          if (vpErr) throw vpErr;

          const vc: Record<string, number> = {};
          for (const vp of viewedPosts ?? []) {
            const k = (vp as any).emotion_id ?? "none";
            vc[k] = (vc[k] ?? 0) + 1;
          }
          setViewCounts(vc);
        }
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "히스토리 로드 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, user]);

  const weekPostData = useMemo(() => toChartData(weekPostCounts), [weekPostCounts]);
  const viewData = useMemo(() => toChartData(viewCounts), [viewCounts]);

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto", display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>내 감정 히스토리</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
            {ready ? (user ? `내 ID: ${user.id.slice(0, 8)}… (익명)` : "세션 없음") : "세션 준비 중..."}
          </div>
        </div>
        <button onClick={signOut} style={btnGhost}>
          세션 초기화
        </button>
      </div>

      {/* 타임라인: x축 시간 / point=이모지 / 아래 썸네일 */}
      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>이번 주 감정 흐름</div>
        {loading ? (
          <div style={{ opacity: 0.7 }}>로딩...</div>
        ) : myPosts.length ? (
          <Timeline posts={myPosts} />
        ) : (
          <div style={{ opacity: 0.7 }}>이번 주 업로드가 아직 없어요.</div>
        )}
      </section>

      {/* 이번 주 도넛 + 퍼센트 + 지배 감정 */}
      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>이번 주 감정 분포 (내 업로드)</div>
        {loading ? (
          <div style={{ opacity: 0.7 }}>로딩...</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <DominantEmotionSummary data={weekPostData} />
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <DonutChart data={weekPostData} />
              <BarList data={weekPostData} />
            </div>
          </div>
        )}
      </section>

      {/* 내가 본 감정 */}
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

function Timeline({ posts }: { posts: PostMini[] }) {
  return (
    <div style={{ overflowX: "auto", paddingBottom: 6 }}>
      <div style={{ display: "flex", gap: 10 }}>
        {posts.map((p) => (
          <TimelineItem key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ post }: { post: PostMini }) {
  const emo = EMOTIONS.find((e) => e.id === post.emotion_id) ?? null;

  const publicUrl = supabase.storage.from("media").getPublicUrl(post.media_path).data.publicUrl;

  const postFilterCss = useMemo(() => {
    const id = (post.filter_id ?? "none") as any;
    const strength = post.filter_strength ?? 40;
    const f = FILTERS.find((x) => x.id === id) ?? FILTERS[0];
    return f.css(strength);
  }, [post.filter_id, post.filter_strength]);

  const t = new Date(post.created_at);
  const timeLabel = `${String(t.getMonth() + 1).padStart(2, "0")}/${String(t.getDate()).padStart(
    2,
    "0"
  )} ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;

  return (
    <div
      style={{
        width: 104,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.04)",
        padding: 8,
        flex: "0 0 auto",
      }}
      title={timeLabel}
    >
      <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{emo ? emo.emoji : "⬜️"}</div>

      <div
        style={{
          marginTop: 6,
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "#111",
        }}
      >
        {post.media_type === "photo" ? (
          <img
            src={publicUrl}
            alt=""
            style={{ width: "100%", height: 74, objectFit: "cover", display: "block", filter: postFilterCss }}
          />
        ) : (
          <video
            src={publicUrl}
            playsInline
            muted
            loop
            style={{ width: "100%", height: 74, objectFit: "cover", display: "block", filter: postFilterCss }}
          />
        )}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 10,
          opacity: 0.75,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {timeLabel}
      </div>
    </div>
  );
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