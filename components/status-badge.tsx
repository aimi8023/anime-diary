import type { AnimeStatus } from "@/lib/types";

const statusConfig: Record<
  AnimeStatus,
  { bg: string; text: string; dot: string }
> = {
  想看: {
    bg: "bg-amber-400/10",
    text: "text-amber-300",
    dot: "bg-amber-400",
  },
  在看: {
    bg: "bg-blue-400/10",
    text: "text-blue-300",
    dot: "bg-blue-400",
  },
  看完: {
    bg: "bg-emerald-400/10",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  弃番: {
    bg: "bg-white/5",
    text: "text-white/40",
    dot: "bg-white/30",
  },
};

interface StatusBadgeProps {
  status: AnimeStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm border border-white/10 ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
}
