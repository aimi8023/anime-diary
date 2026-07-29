import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-xl">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-pink-100/40 via-transparent to-blue-100/40" />
        <Link
          aria-label="追番记录"
          className="relative text-lg font-bold tracking-tight text-gray-900"
          href="/"
        >
          <span className="bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            追番记录
          </span>
        </Link>

        <nav
          aria-label="主导航"
          className="relative flex items-center gap-1 sm:gap-2"
        >
          <Link
            className="rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-pink-700 sm:px-4"
            href="/#archive"
          >
            浏览档案
          </Link>
          <Link
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-pink-700 sm:inline-flex"
            href="/"
          >
            首页
          </Link>
          <Link
            aria-label="管理"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/55 px-3 py-2 text-sm text-gray-500 transition hover:border-blue-200 hover:text-blue-700 sm:px-4"
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
