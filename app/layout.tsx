import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import BackToTop from "@/components/back-to-top";
import { ArchiveSearchProvider } from "@/components/archive/archive-search-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://anime.zhanghome.qzz.io";
const SITE_DESCRIPTION =
  "记录每个季度追过的番剧：评分、感想与标签，按年份和季度随时回顾。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "追番记录 · 我的追番档案",
    template: "%s · 追番记录",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "追番记录 · 我的追番档案",
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "zh_CN",
    siteName: "追番记录",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "追番记录 · 我的追番档案",
    description: SITE_DESCRIPTION,
  },
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
        <ArchiveSearchProvider>
          <SiteHeader />
          <main className="relative z-10 flex-1">{children}</main>
          <BackToTop />
          <footer className="relative z-10 mt-auto border-t border-white/60 bg-white/72 py-6">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
              <p className="text-xs font-semibold text-[var(--ink-muted)]">
                追番记录 · 收藏每一个季度的回忆
              </p>
              <p className="text-[11px] text-[var(--ink-subtle)]">
                Made with care | {new Date().getFullYear()}
              </p>
            </div>
          </footer>
        </ArchiveSearchProvider>
      </body>
    </html>
  );
}
