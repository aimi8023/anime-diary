"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Timer() {
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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass"
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-gray-700 font-medium">本站已运行</span>
        <span className="text-lg font-bold text-pink-600 tabular-nums">
          {formatNumber(timeElapsed.days)}
        </span>
        <span className="text-xs text-gray-600">天</span>
        <span className="text-lg font-bold text-blue-600 tabular-nums ml-1">
          {formatNumber(timeElapsed.hours)}
        </span>
        <span className="text-xs text-gray-600">时</span>
        <span className="text-lg font-bold text-purple-600 tabular-nums ml-1">
          {formatNumber(timeElapsed.minutes)}
        </span>
        <span className="text-xs text-gray-600">分</span>
        <span className="text-lg font-bold text-rose-600 tabular-nums ml-1">
          {formatNumber(timeElapsed.seconds)}
        </span>
        <span className="text-xs text-gray-600">秒</span>
      </div>
    </motion.div>
  );
}
