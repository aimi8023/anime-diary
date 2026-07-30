import Link from "next/link";

export default function ArchiveLoadError() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4">
      <div
        role="alert"
        className="ui-panel-strong w-full border border-red-200/70 p-8 text-center"
      >
        <span
          aria-hidden="true"
          className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--danger-soft)] text-xl text-[var(--danger)]"
        >
          !
        </span>
        <h1 className="mt-4 text-xl font-bold text-[var(--ink)]">
          暂时无法读取追番记录
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          数据服务暂时不可用，请稍后重新加载页面。
        </p>
        <Link
          href="/"
          className="ui-button ui-button-primary mt-6"
        >
          重新加载
        </Link>
      </div>
    </div>
  );
}
