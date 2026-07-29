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
        <footer className="mt-auto border-t border-white/20 bg-white/10 py-8">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <p className="mb-2 text-xs font-medium text-gray-700">
              追番记录 — 记录每一个季度的回忆
            </p>
            <p className="text-[10px] text-gray-500">
              Made with care | {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
