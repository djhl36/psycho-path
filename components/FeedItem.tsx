"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { EMOTIONS } from "@/lib/emotions";
import { useAuth } from "@/components/AuthProvider";
import { FILTERS } from "@/components/FilterStrip";

type PostRow = {
  id: string;
  created_at: string;
  user_id: string;
  media_type: "video" | "photo";
  media_path: string;
  emotion_id: string | null;
  intensity: number | null;
  caption: string | null;
  repost_of: string | null;
  filter_id: string | null;
  filter_strength: number | null;
};

export function FeedItem({ post }: { post: PostRow }) {
  const { user, ready } = useAuth();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [muted, setMuted] = useState(true);
  const [sending, setSending] = useState(false);
  const [viewLogged, setViewLogged] = useState(false);

  // NEW: 퍼가기 코멘트(캡션)
  const [repostCaption, setRepostCaption] = useState("");

  const publicUrl = useMemo(() => {
    return supabase.storage.from("media").getPublicUrl(post.media_path).data.publicUrl;
  }, [post.media_path]);

  const emo = useMemo(() => {
    return EMOTIONS.find((e) => e.id === post.emotion_id) ?? null;
  }, [post.emotion_id]);

  const postFilterCss = useMemo(() => {
    const id = (post.filter_id ?? "none") as any;
    const strength = post.filter_strength ?? 40;
    const f = FILTERS.find((x) => x.id === id) ?? FILTERS[0];
    return f.css(strength);
  }, [post.filter_id, post.filter_strength]);

  // Auto play/pause + view log
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      async (entries) => {
        const ent = entries[0];
        if (!ent) return;

        const isActive = ent.isIntersecting && ent.intersectionRatio >= 0.75;

        if (post.media_type === "video") {
          const v = videoRef.current;
          if (v) {
            if (isActive) {
              try {
                v.muted = muted;
                await v.play();
              } catch {}
            } else {
              v.pause();
            }
          }
        }

        if (isActive && !viewLogged && ready && user) {
          setViewLogged(true);
          try {
            await supabase.from("interactions").insert({
              user_id: user.id,
              post_id: post.id,
              type: "view",
            });
          } catch {}
        }
      },
      { threshold: [0.0, 0.5, 0.75, 1.0] }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [muted, post.id, post.media_type, ready, user, viewLogged]);

  async function share() {
    if (!ready || !user) return;
    await supabase.from("interactions").insert({ user_id: user.id, post_id: post.id, type: "share" });

    const url = `${window.location.origin}/feed#${post.id}`;
    if (navigator.share) {
      await navigator.share({ title: "Psycho Path", url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("링크 복사됨");
    }
  }

  // NEW: 퍼가기 시 코멘트(캡션)도 같이 저장
  async function repostWithCaption() {
    if (!ready || !user) return;

    const cap = repostCaption.trim().slice(0, 40); // 퍼가기는 40자까지 허용(원하면 20자로 줄여도 됨)
    setSending(true);

    try {
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        media_type: post.media_type,
        media_path: post.media_path,
        emotion_id: post.emotion_id,
        intensity: post.intensity,
        filter_id: post.filter_id,
        filter_strength: post.filter_strength,
        repost_of: post.id,
        caption: cap ? cap : null,
      });

      if (error) {
        alert(`퍼가기 실패: ${error.message}`);
        return;
      }

      await supabase.from("interactions").insert({ user_id: user.id, post_id: post.id, type: "repost" });

      setRepostCaption("");
      alert("내 계정으로 퍼가기 완료!");
    } finally {
      setSending(false);
    }
  }

  // (선택) 이모지 리액션만 남김: 댓글 테이블이 없거나 정책이 없으면 에러나니 MVP에서 안전하게
  async function reactEmoji(emoji: string) {
    if (!ready || !user) return;
    setSending(true);
    try {
      // comments 테이블/정책이 없다면 그냥 interactions로 남기기 (안전)
      await supabase.from("interactions").insert({
        user_id: user.id,
        post_id: post.id,
        type: "emoji",
        body: emoji as any, // 테이블에 body 없으면 이 줄은 제거 필요
      } as any);
    } catch {
      // 프로젝트마다 스키마가 달라서 일단 UX 끊지 않음
    } finally {
      setSending(false);
    }
  }

  return (
    <div id={post.id} ref={containerRef} style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 900 }}>{emo ? `${emo.emoji} ${emo.label}` : "감정 없음"}</div>
          {post.intensity ? <div style={{ opacity: 0.75 }}>강도 {post.intensity}</div> : null}
          {post.repost_of ? <div style={{ opacity: 0.75 }}>· 퍼감</div> : null}
        </div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>{new Date(post.created_at).toLocaleString("ko-KR")}</div>
      </div>

      <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)", background: "#111" }}>
        {post.media_type === "photo" ? (
          <img src={publicUrl} alt="" style={{ width: "100%", display: "block", filter: postFilterCss }} />
        ) : (
          <div style={{ position: "relative" }}>
            <video
              ref={videoRef}
              src={publicUrl}
              playsInline
              muted={muted}
              loop
              controls={false}
              style={{ width: "100%", display: "block", filter: postFilterCss }}
              onClick={() => setMuted((m) => !m)}
            />
            <button
              onClick={() => setMuted((m) => !m)}
              style={{
                position: "absolute",
                right: 10,
                bottom: 10,
                borderRadius: 999,
                padding: "8px 10px",
                background: "rgba(0,0,0,0.45)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.18)",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </div>
        )}
      </div>

      {post.caption ? <div style={{ marginTop: 8, opacity: 0.9 }}>{post.caption}</div> : null}

      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <button onClick={share} style={btn}>링크 공유</button>
      </div>

      {/* NEW: 퍼가기 코멘트 입력 + 퍼가기 */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={repostCaption}
          onChange={(e) => setRepostCaption(e.target.value.slice(0, 40))}
          placeholder="퍼가며 한마디 (최대 40자)"
          style={input}
        />
        <button disabled={sending} onClick={repostWithCaption} style={btnPrimary}>
          {sending ? "..." : "퍼가기"}
        </button>
      </div>

      {/* (선택) 이모지 반응만 남기고 싶으면 */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button disabled={sending} onClick={() => reactEmoji("😊")} style={chip}>😊</button>
        <button disabled={sending} onClick={() => reactEmoji("😢")} style={chip}>😢</button>
        <button disabled={sending} onClick={() => reactEmoji("😡")} style={chip}>😡</button>
        <button disabled={sending} onClick={() => reactEmoji("😱")} style={chip}>😱</button>
        <button disabled={sending} onClick={() => reactEmoji("🤢")} style={chip}>🤢</button>
        <button disabled={sending} onClick={() => reactEmoji("😲")} style={chip}>😲</button>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  borderRadius: 12,
  padding: "8px 10px",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.12)",
  cursor: "pointer",
  fontWeight: 800,
};

const btnPrimary: React.CSSProperties = {
  ...btn,
  background: "#fff",
  color: "#000",
  border: "none",
  whiteSpace: "nowrap",
};

const chip: React.CSSProperties = {
  ...btn,
  borderRadius: 999,
  fontWeight: 900,
};

const input: React.CSSProperties = {
  flex: 1,
  minWidth: 160,
  borderRadius: 12,
  padding: "8px 10px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#fff",
  outline: "none",
};