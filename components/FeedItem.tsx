"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { EMOTIONS } from "@/lib/emotions";
import { useAuth } from "@/components/AuthProvider";

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
};

export function FeedItem({ post }: { post: PostRow }) {
  const { user, ready } = useAuth();
  const ref = useRef<HTMLDivElement | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const publicUrl = useMemo(() => supabase.storage.from("media").getPublicUrl(post.media_path).data.publicUrl, [post.media_path]);
  const emo = useMemo(() => EMOTIONS.find((e) => e.id === post.emotion_id) ?? null, [post.emotion_id]);

  useEffect(() => {
    if (!ready || !user) return;

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      async (entries) => {
        for (const ent of entries) {
          if (ent.isIntersecting && ent.intersectionRatio >= 0.6) {
            io.disconnect();
            await supabase.from("interactions").insert({ user_id: user.id, post_id: post.id, type: "view" });
          }
        }
      },
      { threshold: [0.6] }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [post.id, ready, user]);

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

  async function repost() {
    if (!ready || !user) return;

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      media_type: post.media_type,
      media_path: post.media_path,
      emotion_id: post.emotion_id,
      intensity: post.intensity,
      repost_of: post.id,
      caption: null,
      filter_id: null,
      filter_strength: null,
    });

    if (error) {
      alert(`퍼가기 실패: ${error.message}`);
      return;
    }

    await supabase.from("interactions").insert({ user_id: user.id, post_id: post.id, type: "repost" });
    alert("내 계정으로 퍼가기 완료!");
  }

  async function sendEmoji(emoji: string) {
    if (!ready || !user) return;
    setSending(true);
    try {
      await supabase.from("comments").insert({ user_id: user.id, post_id: post.id, kind: "emoji", body: emoji });
    } finally {
      setSending(false);
    }
  }

  async function sendText() {
    if (!ready || !user) return;
    const v = comment.trim();
    if (!v) return;
    setSending(true);
    try {
      const { error } = await supabase.from("comments").insert({ user_id: user.id, post_id: post.id, kind: "text", body: v.slice(0, 20) });
      if (error) throw error;
      setComment("");
    } catch (e: any) {
      alert(e?.message ?? "댓글 실패");
    } finally {
      setSending(false);
    }
  }

  return (
    <div id={post.id} ref={ref} style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
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
          <img src={publicUrl} alt="" style={{ width: "100%", display: "block" }} />
        ) : (
          <video src={publicUrl} controls playsInline style={{ width: "100%", display: "block" }} />
        )}
      </div>

      {post.caption ? <div style={{ marginTop: 8, opacity: 0.9 }}>{post.caption}</div> : null}

      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <button onClick={repost} style={btn}>퍼가기</button>
        <button onClick={share} style={btn}>링크 공유</button>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button disabled={sending} onClick={() => sendEmoji("🔥")} style={chip}>🔥</button>
        <button disabled={sending} onClick={() => sendEmoji("😡")} style={chip}>😡</button>
        <button disabled={sending} onClick={() => sendEmoji("💔")} style={chip}>💔</button>
        <button disabled={sending} onClick={() => sendEmoji("🫠")} style={chip}>🫠</button>

        <input value={comment} onChange={(e) => setComment(e.target.value.slice(0, 20))} placeholder="짧게(20자)" style={input} />
        <button disabled={sending} onClick={sendText} style={btnPrimary}>보내기</button>
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
const btnPrimary: React.CSSProperties = { ...btn, background: "#fff", color: "#000", border: "none" };
const chip: React.CSSProperties = { ...btn, borderRadius: 999, fontWeight: 900 };
const input: React.CSSProperties = {
  flex: 1,
  minWidth: 120,
  borderRadius: 12,
  padding: "8px 10px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#fff",
  outline: "none",
};