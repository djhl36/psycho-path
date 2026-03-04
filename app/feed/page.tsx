"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FeedItem } from "@/components/FeedItem";

type PostRow = {
  id: string;
  created_at: string;
  user_id: string;
  media_type: "video" | "photo";
  media_path: string;
  emotion_id: string | null;
  intensity: number | null;
  filter_id: string | null;
  filter_strength: number | null;
  caption: string | null;
  repost_of: string | null;
};

const PAGE = 8;

export default function FeedPage() {
  const [items, setItems] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  async function loadMore() {
    if (loading) return;
    setLoading(true);
    try {
      let q = supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(PAGE);
      if (cursor) q = q.lt("created_at", cursor);

      const { data, error } = await q;
      if (error) throw error;

      const next = (data ?? []) as PostRow[];
      setItems((prev) => [...prev, ...next]);
      setCursor(next.length ? next[next.length - 1].created_at : cursor);
    } catch (e: any) {
      alert(e?.message ?? "로드 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMore(); }, []);

  useEffect(() => {
    function onScroll() {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 800;
      if (nearBottom) loadMore();
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {items.map((p) => <FeedItem key={p.id} post={p} />)}
      <div style={{ padding: 16, textAlign: "center", opacity: 0.75 }}>{loading ? "불러오는 중..." : " "}</div>
    </div>
  );
}