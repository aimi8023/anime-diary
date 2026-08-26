"use client";

import { useState } from "react";
import Image from "next/image";

interface CoverImageProps {
  src: string;
  /** 替代文本；空字符串表示纯装饰图片。 */
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  /** 加载失败占位中展示的标题；缺省时从 alt 中去掉“封面”后缀。 */
  fallbackLabel?: string;
  /**
   * hidden：失败时整块隐藏（用于装饰性模糊背景）；
   * placeholder（默认）：失败时显示标题首字占位海报。
   */
  fallbackMode?: "placeholder" | "hidden";
}

function placeholderTitle(label: string): string {
  const cleaned = label.replace(/封面$/, "").trim();
  return cleaned ? cleaned[0] : "◌";
}

/**
 * 外链封面的统一入口：封面 URL 由管理员填写，随时可能失效。
 * 加载失败时不再露出破图图标，而是回退到占位海报或整块隐藏。
 */
export default function CoverImage({
  src,
  alt,
  sizes,
  className,
  priority,
  loading,
  fallbackLabel,
  fallbackMode = "placeholder",
}: CoverImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    if (fallbackMode === "hidden") return null;
    const label = fallbackLabel ?? alt;
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#fdeef5] to-[#e8f2fc]">
        <span
          aria-hidden="true"
          className="text-3xl font-black tracking-tight text-[var(--ink-subtle)]"
        >
          {placeholderTitle(label)}
        </span>
        <span className="px-2 text-center text-[10px] font-semibold text-[var(--ink-subtle)]">
          封面暂缺
        </span>
      </div>
    );
  }

  return (
    <Image
      alt={alt}
      className={className}
      fill
      loading={loading}
      onError={() => setFailed(true)}
      priority={priority}
      sizes={sizes}
      src={src}
      unoptimized
    />
  );
}
