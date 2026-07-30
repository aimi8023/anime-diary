import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/site-header";

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
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="relative z-10 flex-1">{children}</main>
        <footer className="relative z-10 mt-auto border-t border-white/60 bg-white/45 py-6 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
            <p className="text-xs font-semibold text-[var(--ink-muted)]">
              追番记录 · 收藏每一个季度的回忆
            </p>
            <p className="text-[11px] text-[var(--ink-subtle)]">
              Made with care | {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
