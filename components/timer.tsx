"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

export default function Timer() {
  const reduceMotion = useReducedMotion();
  const [timeElapsed, setTimeElapsed] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    // Set start date to when the site was launched (today)
    const startDate = new Date("2026-06-08T21:45:00").getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = now - startDate;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeElapsed({ days, hours, minutes, seconds });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.28 }}
      className="ui-panel inline-flex items-center gap-2 rounded-full px-4 py-2.5"
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-[var(--ink-muted)] sm:text-sm">本站已运行</span>
        <span className="font-black tabular-nums text-[var(--accent-strong)]">
          {formatNumber(timeElapsed.days)}
        </span>
        <span className="text-[10px] text-[var(--ink-subtle)]">天</span>
        <span className="ml-1 font-black tabular-nums text-[var(--info)]">
          {formatNumber(timeElapsed.hours)}
        </span>
        <span className="text-[10px] text-[var(--ink-subtle)]">时</span>
        <span className="ml-1 font-black tabular-nums text-purple-700">
          {formatNumber(timeElapsed.minutes)}
        </span>
        <span className="text-[10px] text-[var(--ink-subtle)]">分</span>
        <span className="ml-1 font-black tabular-nums text-rose-700">
          {formatNumber(timeElapsed.seconds)}
        </span>
        <span className="text-[10px] text-[var(--ink-subtle)]">秒</span>
      </div>
    </motion.div>
  );
}
