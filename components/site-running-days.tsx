"use client";

import { useEffect, useState } from "react";

interface SiteRunningDaysProps {
  /** 站点启用时间（ISO 字符串）。 */
  launchedAt: string;
}

/**
 * 站点运行天数：挂载后计算并每小时刷新，
 * 避免在服务端渲染期读取时钟造成注水不一致。
 */
export default function SiteRunningDays({ launchedAt }: SiteRunningDaysProps) {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const launched = new Date(launchedAt).getTime();
    const update = () =>
      setDays(Math.max(0, Math.floor((Date.now() - launched) / 86_400_000)));
    update();
    const interval = setInterval(update, 3_600_000);
    return () => clearInterval(interval);
  }, [launchedAt]);

  return (
    <p
      className="text-xs tabular-nums text-[var(--ink-subtle)]"
      suppressHydrationWarning
    >
      {days === null ? "" : `已运行 ${days} 天`}
    </p>
  );
}
