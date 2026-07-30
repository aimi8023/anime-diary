"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import InlineFeedback from "@/components/feedback/inline-feedback";
import { readApiError } from "@/lib/http/client";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const reduceMotion = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password.trim()) {
      setError("请输入密码");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Use window.location for a full navigation so the cookie is definitely sent
        window.location.href = "/admin";
      } else {
        setError(await readApiError(res, "密码错误"));
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[76vh] items-center justify-center px-4 py-12">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="ui-panel-strong relative z-10 w-full max-w-md overflow-hidden p-6 sm:p-8"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
        transition={{ duration: reduceMotion ? 0 : 0.32 }}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[var(--info-soft)] blur-3xl" />
        <div className="relative">
          <span
            aria-hidden="true"
            className="grid h-12 w-12 place-items-center rounded-2xl border border-white/90 bg-white/75 text-xl text-[var(--accent-strong)] shadow-sm"
          >
            ◇
          </span>
          <p className="ui-kicker mt-6">PRIVATE WORKSPACE</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--ink)]">
            欢迎回来
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            输入密码进入追番管理后台
          </p>
        </div>

        <form className="relative mt-8" onSubmit={handleSubmit}>
          {error && (
            <div className="mb-5">
              <InlineFeedback tone="error" className="font-medium">
                {error}
              </InlineFeedback>
            </div>
          )}

          <label
            className="mb-2 block text-xs font-bold text-[var(--ink-muted)]"
            htmlFor="admin-password"
          >
            管理密码
          </label>
          <input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入管理密码"
            className="ui-field min-h-12 w-full px-4 text-sm"
            autoFocus
            id="admin-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="ui-button ui-button-primary mt-5 min-h-12 w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                验证中...
              </span>
            ) : (
              "登录"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
