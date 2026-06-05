"use client";

interface StarRatingProps {
  rating: number; // 1-10, supports 0.5 increments
  size?: "sm" | "md";
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export default function StarRating({
  rating,
  size = "sm",
  interactive = false,
  onChange,
}: StarRatingProps) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const threshold = (i + 1) * 2; // 2, 4, 6, 8, 10
    const full = rating >= threshold;
    const half = !full && rating >= threshold - 1; // between threshold-1 and threshold

    const sizeClass = size === "sm" ? "w-4 h-4" : "w-6 h-6";

    return (
      <button
        key={i}
        type="button"
        disabled={!interactive}
        onClick={() => onChange?.(threshold)}
        className={`${sizeClass} ${
          interactive ? "cursor-pointer hover:scale-110" : "cursor-default"
        } transition-transform inline-block relative`}
        aria-label={`${threshold} 分`}
      >
        {/* Background star (empty, gray) */}
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full text-white/15"
          fill="currentColor"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>

        {/* Filled overlay */}
        {(full || half) && (
          <svg
            viewBox="0 0 24 24"
            className="absolute inset-0 w-full h-full text-amber-400"
            fill="currentColor"
            style={half ? { clipPath: "inset(0 50% 0 0)" } : undefined}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )}
      </button>
    );
  });

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">{stars}</div>
      <span className="text-xs text-amber-400 ml-1 font-medium tabular-nums">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}
