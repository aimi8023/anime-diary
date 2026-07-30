"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  countActiveArchiveFilters,
  parseArchiveFilters,
} from "@/lib/archive/filter";
import { useArchiveSearch } from "@/components/archive/archive-search-context";

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSearchOpen, openSearch } = useArchiveSearch();
  const activeFilterCount = countActiveArchiveFilters(
    parseArchiveFilters(new URLSearchParams(searchParams.toString())),
  );

  function launchSearch() {
    openSearch();
    if (pathname !== "/") router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/72 shadow-[0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-2xl">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          aria-label="追番记录首页"
          className="ui-focus group relative inline-flex min-h-11 items-center gap-2 rounded-full pr-2 text-lg font-bold tracking-tight text-gray-900"
          href="/"
        >
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/80 bg-white/70 text-sm shadow-sm transition group-hover:rotate-6"
          >
            ✦
          </span>
          <span className="bg-gradient-to-r from-pink-700 via-purple-700 to-blue-700 bg-clip-text text-transparent">
            追番记录
          </span>
        </Link>

        <nav
          aria-label="主导航"
          className="relative flex items-center gap-1 sm:gap-2"
        >
          <Link
            className="ui-focus hidden min-h-11 items-center rounded-full px-4 text-sm font-semibold text-gray-700 transition hover:bg-white/75 hover:text-pink-700 sm:inline-flex"
            href="/"
          >
            首页
          </Link>
          <button
            aria-controls="archive-search-panel"
            aria-expanded={isSearchOpen}
            aria-label="搜索档案"
            className="ui-button ui-button-secondary relative px-3 sm:px-4"
            onClick={launchSearch}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="7" />
              <path
                d="m16.25 16.25 4 4"
                strokeLinecap="round"
              />
            </svg>
            <span className="hidden sm:inline">搜索</span>
            {activeFilterCount > 0 && (
              <span
                aria-label={`${activeFilterCount} 个筛选条件`}
                className="grid min-h-5 min-w-5 place-items-center rounded-full bg-[var(--accent-strong)] px-1 text-[10px] font-black text-white"
              >
                {activeFilterCount}
              </span>
            )}
          </button>
          <Link
            aria-label="管理后台"
            className="ui-button ui-button-secondary px-3 sm:px-4"
            href="/admin"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="hidden sm:inline">管理</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
