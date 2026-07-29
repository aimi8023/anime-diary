"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import InlineFeedback from "@/components/feedback/inline-feedback";
import { readApiError } from "@/lib/http/client";

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
        setError(await readApiError(res, "密码错误"));
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 relative">
      {/* Background glow - subtle */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/3 via-transparent to-blue-500/3 blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <motion.span 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, type: "spring", bounce: 0.5 }}
            className="inline-block text-5xl"
          >
            🔒
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-4 text-2xl font-bold bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent"
          >
            需要密码
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-2 text-sm text-gray-700 font-medium"
          >
            管理功能仅限本人使用
          </motion.p>
        </div>

        {/* Glass card - light theme */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          onSubmit={handleSubmit}
          className="glass rounded-xl p-8 shadow-md"
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-5"
            >
              <InlineFeedback tone="error" className="font-medium">
                {error}
              </InlineFeedback>
            </motion.div>
          )}

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入管理密码"
            className="w-full px-4 py-3.5 min-h-[48px] rounded-lg text-sm transition-all duration-300 glass-input focus:border-pink-400/50 focus:ring-2 focus:ring-pink-400/20"
            autoFocus
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 min-h-[48px] bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.98]"
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
        </motion.form>
      </div>
    </div>
  );
}
