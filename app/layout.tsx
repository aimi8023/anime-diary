import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SearchProvider } from "@/components/search-context";
import SearchButtonClient from "@/components/search-button-client";
import SearchFilter from "@/components/search-filter";

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
        <SearchProvider>
          {/* Global Search Overlay */}
          <SearchFilter />

          {/* Header — Ultra Light Glass */}
          <header className="sticky top-0 z-50 bg-white/20 border-w border-white/10">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between relative">
              {/* Background glow - very subtle */}
              <div className="absolute inset-0 bg-gradient-to-r from-pink-300/5 via-transparent to-purple-300/5 pointer-events-none" />
              
              {/* Left side: Logo */}
              <div className="flex items-center gap-3 relative z-10">
                {/* Logo with pink-blue gradient */}
                <Link
                  href="/"
                  className="group flex items-center gap-2.5 text-lg font-bold"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-300"></span>
                  <span className="hidden sm:inline bg-gradient-to-r from-pink-600 via-blue-600 to-rose-600 bg-clip-text text-transparent group-hover:from-pink-700 group-hover:via-blue-700 group-hover:to-rose-700 transition-all duration-300">
                    追番记录
                  </span>
                </Link>
              </div>
              
              {/* Navigation with pill style - Light theme */}
              <nav className="flex items-center gap-2 relative z-10">
                {/* Search Button in Header - to the left of 首页 */}
                <SearchButtonClient />
                
                <Link
                  href="/"
                  className="px-4 py-2 text-sm font-medium text-gray-800 hover:text-pink-600 hover:bg-white/50 rounded-full transition-all duration-300 active:scale-95"
                >
                  首页
                </Link>
                <Link
                  href="/admin"
                  className="px-4 py-2 text-sm font-medium text-gray-800 hover:text-blue-600 hover:bg-white/50 rounded-full transition-all duration-300 active:scale-95 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span className="hidden sm:inline">管理</span>
                </Link>
              </nav>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 relative z-10">{children}</main>

          {/* Footer — Ultra Light Glass */}
          <footer className="border-t border-white/20 mt-auto bg-white/10  py-8">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <p className="text-xs text-gray-700 mb-2 font-medium">
                 追番记录 — 记录每一个季度的回忆
              </p>
              <p className="text-[10px] text-gray-500">
                Made with  | {new Date().getFullYear()}
              </p>
            </div>
          </footer>
        </SearchProvider>
      </body>
    </html>
  );
}
