"use client";

import { useEffect, useState } from "react";

// 站点启用时间，用于计算运行时长。
const LAUNCHED_AT = new Date("2026-06-08T21:45:00").getTime();

function elapsed(now: number) {
  const diff = Math.max(0, now - LAUNCHED_AT);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}

const pad = (value: number) => value.toString().padStart(2, "0");

/**
 * 站点运行时长徽章：天/时/分/秒逐秒跳动，
 * 挂载后开始计算，避免注水期时钟不一致。
 */
export default function RunningTimer() {
  const [time, setTime] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const update = () => setTime(elapsed(Date.now()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      aria-label={`本站已运行 ${time.days} 天 ${time.hours} 小时 ${time.minutes} 分 ${time.seconds} 秒`}
      className="ui-panel inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm"
      role="timer"
    >
      <span className="mr-0.5 font-semibold text-[var(--ink-muted)]">
        已运行
      </span>
      <span className="font-black tabular-nums text-[var(--accent-strong)]">
        {time.days}
      </span>
      <span className="text-[10px] text-[var(--ink-subtle)]">天</span>
      <span className="font-black tabular-nums text-[var(--info)]">
        {pad(time.hours)}
      </span>
      <span className="text-[10px] text-[var(--ink-subtle)]">时</span>
      <span className="font-black tabular-nums text-purple-700">
        {pad(time.minutes)}
      </span>
      <span className="text-[10px] text-[var(--ink-subtle)]">分</span>
      <span className="font-black tabular-nums text-rose-600">
        {pad(time.seconds)}
      </span>
      <span className="text-[10px] text-[var(--ink-subtle)]">秒</span>
    </div>
  );
}
