"use client";

export type AdminSection = "records" | "entry" | "backups";

interface AdminSectionNavProps {
  current: AdminSection;
  recordCount: number;
  onChange: (section: AdminSection) => void;
}

const sections: Array<{
  id: AdminSection;
  label: string;
  description: string;
}> = [
  { id: "records", label: "记录", description: "查找与维护" },
  { id: "entry", label: "添加记录", description: "Bangumi 或手动" },
  { id: "backups", label: "备份恢复", description: "导出与历史版本" },
];

export default function AdminSectionNav({
  current,
  recordCount,
  onChange,
}: AdminSectionNavProps) {
  return (
    <div
      aria-label="管理工作区"
      className="grid grid-cols-3 gap-1 rounded-2xl border border-white/70 bg-white/45 p-1.5 shadow-sm backdrop-blur"
      role="tablist"
    >
      {sections.map((section) => {
        const selected = current === section.id;
        return (
          <button
            aria-controls={`admin-panel-${section.id}`}
            aria-label={section.label}
            aria-selected={selected}
            className={`min-h-14 rounded-xl px-2 py-2 text-left transition sm:min-h-16 sm:px-4 ${
              selected
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:bg-white/45 hover:text-gray-900"
            }`}
            id={`admin-tab-${section.id}`}
            key={section.id}
            onClick={() => onChange(section.id)}
            role="tab"
            type="button"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              {section.label}
              {section.id === "records" && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                  {recordCount}
                </span>
              )}
            </span>
            <span className="mt-1 hidden text-xs text-gray-500 sm:block">
              {section.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
