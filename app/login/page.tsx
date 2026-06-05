"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        const data = await res.json();
        setError(data.error || "密码错误");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🔒</span>
          <h1 className="mt-3 text-xl font-bold text-white">
            需要密码
          </h1>
          <p className="mt-1 text-sm text-white/40">
            管理功能仅限本人使用
          </p>
        </div>

        {/* Glass card */}
        <form
          onSubmit={handleSubmit}
          className="glass rounded-xl p-6"
        >
          {error && (
            <div className="mb-4 bg-red-400/10 text-red-300 text-sm px-4 py-2.5 rounded-lg border border-red-400/20">
              {error}
            </div>
          )}

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入管理密码"
            className="w-full px-4 py-3 min-h-[44px] rounded-lg text-sm transition bg-white/10 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10"
            autoFocus
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 min-h-[44px] bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? "验证中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
