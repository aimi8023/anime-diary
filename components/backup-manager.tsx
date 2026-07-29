"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type {
  BackupMetadata,
  DatasetDiff,
} from "@/lib/backups/types";
import InlineFeedback from "@/components/feedback/inline-feedback";
import { readApiError } from "@/lib/http/client";

interface BackupManagerProps {
  collapsible?: boolean;
  currentCount: number;
  onDataChanged: () => void | Promise<void>;
}

interface SnapshotPreview {
  metadata: BackupMetadata;
  diff: DatasetDiff;
}

interface ImportPreview {
  format: "legacy" | "versioned";
  recordCount: number;
  isEmpty: boolean;
  warnings: Array<{ code: string; message: string }>;
  diff: DatasetDiff;
}

const reasonLabels: Record<BackupMetadata["reason"], string> = {
  add: "添加记录",
  update: "编辑记录",
  delete: "删除记录",
  import: "导入数据",
  restore: "恢复历史版本",
};

function formatTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function DiffSummary({ diff }: { diff: DatasetDiff }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
      <div className="rounded-lg bg-green-50 px-3 py-2 text-green-700">
        新增 {diff.added} 条
      </div>
      <div className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
        移除 {diff.removed} 条
      </div>
      <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
        修改 {diff.changed} 条
      </div>
      <div className="rounded-lg bg-gray-50 px-3 py-2 text-gray-600">
        不变 {diff.unchanged} 条
      </div>
    </div>
  );
}

export default function BackupManager({
  collapsible = true,
  currentCount,
  onDataChanged,
}: BackupManagerProps) {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [restorePreview, setRestorePreview] =
    useState<SnapshotPreview | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [importPreview, setImportPreview] =
    useState<ImportPreview | null>(null);
  const [importText, setImportText] = useState("");
  const [importName, setImportName] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const loadBackups = useCallback(async () => {
    try {
      const response = await fetch("/api/backups", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            `请求失败（${response.status}）`,
          ),
        );
      }
      const body = await response.json();
      setBackups(Array.isArray(body.backups) ? body.backups : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "读取备份列表失败",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/backups", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            await readApiError(
              response,
              `请求失败（${response.status}）`,
            ),
          );
        }
        return response.json();
      })
      .then((body) => {
        if (active) {
          setBackups(Array.isArray(body.backups) ? body.backups : []);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "读取备份列表失败",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openRestore = async (backup: BackupMetadata) => {
    setError("");
    setNotice("");
    setRestoreLoading(true);
    try {
      const response = await fetch(`/api/backups/${backup.id}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            `请求失败（${response.status}）`,
          ),
        );
      }
      setRestorePreview(await response.json());
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "读取备份差异失败",
      );
    } finally {
      setRestoreLoading(false);
    }
  };

  const applyRestore = async () => {
    if (!restorePreview || restoreLoading) return;
    setRestoreLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/backups/${restorePreview.metadata.id}/restore`,
        { method: "POST" },
      );
      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            `请求失败（${response.status}）`,
          ),
        );
      }
      setRestorePreview(null);
      setNotice("已恢复到所选历史版本");
      await onDataChanged();
      await loadBackups();
    } catch (restoreError) {
      setError(
        restoreError instanceof Error ? restoreError.message : "恢复失败",
      );
    } finally {
      setRestoreLoading(false);
    }
  };

  const selectImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setNotice("");
    setImportPreview(null);
    setConfirmEmpty(false);

    if (file.size > 5 * 1024 * 1024) {
      setError("备份文件不能超过 5 MB");
      return;
    }

    setImportLoading(true);
    try {
      const text = await file.text();
      const response = await fetch("/api/backups/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            `请求失败（${response.status}）`,
          ),
        );
      }
      setImportText(text);
      setImportName(file.name);
      setImportPreview(await response.json());
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "读取导入文件失败",
      );
    } finally {
      setImportLoading(false);
      event.target.value = "";
    }
  };

  const applyImport = async () => {
    if (
      !importPreview ||
      importLoading ||
      (importPreview.isEmpty && !confirmEmpty)
    ) {
      return;
    }
    setImportLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/backups/import/apply?confirmEmpty=${String(confirmEmpty)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: importText,
        },
      );
      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            `请求失败（${response.status}）`,
          ),
        );
      }
      setImportPreview(null);
      setImportText("");
      setImportName("");
      setConfirmEmpty(false);
      setNotice("备份导入成功");
      await onDataChanged();
      await loadBackups();
    } catch (importError) {
      setError(
        importError instanceof Error ? importError.message : "导入失败",
      );
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <section className="mb-8 glass rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="min-h-[44px] text-left"
            aria-expanded={expanded}
          >
            <h2 className="font-semibold text-gray-900">备份与恢复</h2>
            <p className="text-sm text-gray-600 mt-1">
              当前 {currentCount} 条记录 ·{" "}
              {loading ? "正在读取历史版本" : `${backups.length} 个历史版本`}
            </p>
          </button>
        ) : (
          <div>
            <h2 className="font-semibold text-gray-900">备份与恢复</h2>
            <p className="text-sm text-gray-600 mt-1">
              当前 {currentCount} 条记录 ·{" "}
              {loading ? "正在读取历史版本" : `${backups.length} 个历史版本`}
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/api/backups/export"
            download
            className="min-h-[44px] inline-flex items-center rounded-lg border border-gray-300 bg-white/60 px-3 py-2 text-sm font-medium text-gray-700 hover:border-green-500 hover:text-green-700"
          >
            下载当前数据
          </Link>
          <label className="min-h-[44px] inline-flex cursor-pointer items-center rounded-lg bg-gradient-to-r from-pink-500 to-blue-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:from-pink-600 hover:to-blue-600">
            {importLoading ? "正在读取…" : "导入 JSON"}
            <input
              type="file"
              accept=".json,application/json"
              aria-label="选择备份 JSON"
              className="sr-only"
              disabled={importLoading}
              onChange={selectImportFile}
            />
          </label>
        </div>
      </div>

      {notice && (
        <InlineFeedback tone="success" className="mt-4">
          {notice}
        </InlineFeedback>
      )}
      {error && (
        <InlineFeedback tone="error" className="mt-4">
          {error}
        </InlineFeedback>
      )}

      {(!collapsible || expanded) && (
        <div className="mt-4">
          <p className="mb-3 text-xs leading-5 text-gray-500">
            自动快照与当前数据位于同一存储中。建议偶尔下载 JSON，保留一份独立副本。
          </p>
          {!loading && backups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
              修改记录后，这里会自动出现历史版本。
            </div>
          ) : (
            <ul className="space-y-2">
              {backups.map((backup) => (
                <li
                  key={backup.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/50 bg-white/45 px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {reasonLabels[backup.reason]}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatTime(backup.createdAt)} · {backup.recordCount} 条记录
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/api/backups/${backup.id}?download=1`}
                      download
                      className="min-h-[40px] inline-flex items-center rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-white/70 hover:text-green-700"
                    >
                      下载
                    </Link>
                    <button
                      type="button"
                      aria-label={`恢复 ${backup.createdAt}`}
                      disabled={restoreLoading}
                      onClick={() => void openRestore(backup)}
                      className="min-h-[40px] rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      恢复
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {restorePreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/30 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h3
              id="restore-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              恢复备份
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              将恢复到 {formatTime(restorePreview.metadata.createdAt)}。恢复前会自动保存当前状态。
            </p>
            <div className="mt-4">
              <DiffSummary diff={restorePreview.diff} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRestorePreview(null)}
                className="min-h-[44px] rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                type="button"
                disabled={restoreLoading}
                onClick={() => void applyRestore()}
                className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {restoreLoading ? "正在恢复…" : "确认恢复"}
              </button>
            </div>
          </div>
        </div>
      )}

      {importPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/30 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h3
              id="import-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              导入预览
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {importName} · 文件包含 {importPreview.recordCount} 条记录
            </p>
            <div className="mt-4">
              <DiffSummary diff={importPreview.diff} />
            </div>
            {importPreview.isEmpty && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-700">
                  这会清空当前全部记录
                </p>
                <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm text-red-700">
                  <input
                    type="checkbox"
                    checked={confirmEmpty}
                    onChange={(event) => setConfirmEmpty(event.target.checked)}
                    className="mt-1"
                  />
                  我确认导入空备份并清空当前记录
                </label>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setImportPreview(null);
                  setImportText("");
                  setImportName("");
                  setConfirmEmpty(false);
                }}
                className="min-h-[44px] rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                type="button"
                disabled={
                  importLoading ||
                  (importPreview.isEmpty && !confirmEmpty)
                }
                onClick={() => void applyImport()}
                className="min-h-[44px] rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importLoading ? "正在导入…" : "确认导入"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
