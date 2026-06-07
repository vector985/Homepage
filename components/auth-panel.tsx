"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { KeyRound, LogIn, Mail, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";

type Mode = "login" | "signup" | "reset";

export function AuthPanel({ supabase }: { supabase: SupabaseClient }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });
        if (error) throw error;
        setMessage("注册邮件已发送，请检查邮箱完成确认。");
      }

      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        });
        if (error) throw error;
        setMessage("找回密码邮件已发送。");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败，请稍后再试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div>
          <p className="eyebrow">每日打卡</p>
          <h1>登录后同步你的打卡记录</h1>
          <p className="muted">邮箱账号可在电脑和手机间同步。所有记录由 Supabase RLS 隔离。</p>
        </div>

        <div className="mode-tabs" role="tablist" aria-label="登录方式">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            <LogIn size={16} />
            登录
          </button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>
            <UserPlus size={16} />
            注册
          </button>
          <button className={mode === "reset" ? "active" : ""} onClick={() => setMode("reset")}>
            <KeyRound size={16} />
            找回
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            邮箱
            <span>
              <Mail size={16} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </span>
          </label>

          {mode !== "reset" ? (
            <label>
              密码
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
                minLength={6}
                required
              />
            </label>
          ) : null}

          <button className="primary-button" disabled={busy}>
            {busy ? "处理中..." : mode === "login" ? "登录" : mode === "signup" ? "注册" : "发送找回邮件"}
          </button>
        </form>

        {message ? <p className="message">{message}</p> : null}
      </section>
    </main>
  );
}
