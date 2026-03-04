"use client";

import { supabase } from "@/lib/supabase";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  ready: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      // 1) 기존 세션 확인
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      // 2) 세션 없으면 익명 로그인
      if (!data.session) {
        const { data: anon, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error(error);
          alert(
            "익명 로그인 실패. Supabase에서 Anonymous Sign-Ins 활성화 여부를 확인해줘.\n\n" +
              error.message
          );
        } else {
          setSession(anon.session ?? null);
        }
      } else {
        setSession(data.session);
      }
      setReady(true);
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user: session?.user ?? null,
      session,
      ready,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}