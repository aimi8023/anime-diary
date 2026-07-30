import type { ReactNode } from "react";

interface InlineFeedbackProps {
  tone: "error" | "success";
  children: ReactNode;
  className?: string;
}

const toneClasses = {
  error:
    "border-[rgba(197,69,84,0.24)] bg-[var(--danger-soft)] text-[var(--danger)]",
  success:
    "border-[rgba(57,124,174,0.22)] bg-[var(--info-soft)] text-[var(--info)]",
} as const;

export default function InlineFeedback({
  tone,
  children,
  className = "",
}: InlineFeedbackProps) {
  return (
    <div
      className={`rounded-xl border px-3.5 py-3 text-sm leading-6 ${toneClasses[tone]} ${className}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
