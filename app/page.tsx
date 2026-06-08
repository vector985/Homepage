"use client";

import { AuthPanel } from "@/components/auth-panel";
import { Dashboard } from "@/components/dashboard";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    const timeout = window.setTimeout(() => {
      if (!active) return;
      setLoading(false);
    }, 4000);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
      })
      .finally(() => {
        if (!active) return;
        window.clearTimeout(timeout);
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.clearTimeout(timeout);
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  if (!supabase) {
    return (
      <main className="setup-screen">
        <section className="setup-card">
          <p className="eyebrow">服务暂不可用</p>
          <h1>正在等待数据服务配置</h1>
          <p>请稍后再试，或联系维护者检查线上配置。</p>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="setup-screen">
        <section className="setup-card">
          <h1>正在加载</h1>
          <p>正在检查登录状态。</p>
        </section>
      </main>
    );
  }

  if (!session?.user) {
    return <AuthPanel supabase={supabase} />;
  }

  return <Dashboard supabase={supabase} user={session.user} />;
}
