export default function ArchiveLoadError() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4">
      <div
        role="alert"
        className="glass w-full rounded-2xl border border-red-200/60 p-8 text-center"
      >
        <h1 className="text-xl font-bold text-gray-900">
          暂时无法读取追番记录
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          数据服务暂时不可用，请稍后重新加载页面。
        </p>
        <a
          href="/"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          重新加载
        </a>
      </div>
    </div>
  );
}
