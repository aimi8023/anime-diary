import type { ReactNode } from "react";

interface InlineFeedbackProps {
  tone: "error" | "success";
  children: ReactNode;
  className?: string;
}

const toneClasses = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-green-200 bg-green-50 text-green-700",
} as const;

export default function InlineFeedback({
  tone,
  children,
  className = "",
}: InlineFeedbackProps) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${toneClasses[tone]} ${className}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
