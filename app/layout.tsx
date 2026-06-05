import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "追番记录",
  description: "记录每个季度追过的番剧",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        {/* Header — glass */}
        <header className="sticky top-0 z-50 glass border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold text-white hover:text-amber-400 transition-colors"
            >
              <span className="text-xl">📺</span>
              <span className="hidden sm:inline">追番记录</span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className="px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                首页
              </Link>
              <Link
                href="/admin"
                className="px-3 py-2 text-sm text-white/50 hover:text-amber-400 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span className="hidden sm:inline">管理</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 relative z-10">{children}</main>

        {/* Footer — glass */}
        <footer className="border-t border-white/10 mt-auto glass py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-white/30">
            <p>📺 追番记录 — 记录每一个季度的回忆</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
