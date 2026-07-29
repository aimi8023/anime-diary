import type { Anime } from "@/lib/types";
import type {
  BackupIssue,
  BackupParseResult,
} from "./types";

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

const MAX_STRING_LENGTH = 10_000;
const MAX_TAGS = 100;
const MAX_TAG_LENGTH = 100;

export function validateBackupSize(
  bytes: number,
):
  | { ok: true }
  | { ok: false; issue: BackupIssue } {
  if (!Number.isFinite(bytes) || bytes < 0 || bytes > MAX_BACKUP_BYTES) {
    return {
      ok: false,
      issue: {
        code: "file_too_large",
        message: "备份文件不能超过 5 MB",
      },
    };
  }
  return { ok: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteString(value: unknown, allowEmpty = true): value is string {
  return (
    typeof value === "string" &&
    value.length <= MAX_STRING_LENGTH &&
    (allowEmpty || value.trim().length > 0)
  );
}

function issue(
  code: string,
  message: string,
  recordIndex: number,
  field?: string,
): BackupIssue {
  return { code, message, recordIndex, ...(field ? { field } : {}) };
}

function validateAnime(value: unknown, index: number): BackupIssue[] {
  if (!isRecord(value)) {
    return [issue("invalid_record", "记录必须是对象", index)];
  }

  const issues: BackupIssue[] = [];
  const requiredNonEmpty = ["id", "title", "season"] as const;
  const requiredStrings = ["cover", "comment"] as const;

  for (const field of requiredNonEmpty) {
    if (!isFiniteString(value[field], false)) {
      issues.push(
        issue(`invalid_${field}`, `${field} 必须是非空字符串`, index, field),
      );
    }
  }

  for (const field of requiredStrings) {
    if (!isFiniteString(value[field])) {
      issues.push(
        issue(`invalid_${field}`, `${field} 必须是字符串`, index, field),
      );
    }
  }

  if (
    typeof value.rating !== "number" ||
    !Number.isFinite(value.rating) ||
    value.rating < 1 ||
    value.rating > 10 ||
    value.rating * 2 !== Math.round(value.rating * 2)
  ) {
    issues.push(
      issue(
        "invalid_rating",
        "rating 必须是 1 到 10 之间的 0.5 倍数",
        index,
        "rating",
      ),
    );
  }

  if (
    typeof value.episodes !== "number" ||
    !Number.isInteger(value.episodes) ||
    value.episodes < 0
  ) {
    issues.push(
      issue(
        "invalid_episodes",
        "episodes 必须是非负整数",
        index,
        "episodes",
      ),
    );
  }

  if (
    !Array.isArray(value.tags) ||
    value.tags.length > MAX_TAGS ||
    value.tags.some(
      (tag) =>
        typeof tag !== "string" ||
        tag.trim().length === 0 ||
        tag.length > MAX_TAG_LENGTH,
    )
  ) {
    issues.push(
      issue(
        "invalid_tags",
        "tags 必须是有效的非空字符串数组",
        index,
        "tags",
      ),
    );
  }

  if (
    typeof value.createdAt !== "string" ||
    !Number.isFinite(Date.parse(value.createdAt))
  ) {
    issues.push(
      issue(
        "invalid_created_at",
        "createdAt 必须是有效日期",
        index,
        "createdAt",
      ),
    );
  }

  if (
    value.bangumiId !== undefined &&
    (typeof value.bangumiId !== "number" ||
      !Number.isInteger(value.bangumiId) ||
      value.bangumiId <= 0)
  ) {
    issues.push(
      issue(
        "invalid_bangumi_id",
        "bangumiId 必须是正整数",
        index,
        "bangumiId",
      ),
    );
  }

  for (const field of [
    "bangumiUrl",
    "originalTitle",
    "airDate",
  ] as const) {
    if (value[field] !== undefined && !isFiniteString(value[field])) {
      issues.push(
        issue(`invalid_${field}`, `${field} 必须是字符串`, index, field),
      );
    }
  }

  if (
    typeof value.airDate === "string" &&
    value.airDate.length > 0 &&
    !/^\d{4}-\d{2}-\d{2}$/.test(value.airDate)
  ) {
    issues.push(
      issue(
        "invalid_air_date",
        "airDate 必须使用 YYYY-MM-DD 格式",
        index,
        "airDate",
      ),
    );
  }

  return issues;
}

function unwrapBackup(
  parsed: unknown,
):
  | { ok: true; data: unknown[]; format: "legacy" | "versioned" }
  | { ok: false; issue: BackupIssue } {
  if (Array.isArray(parsed)) {
    return { ok: true, data: parsed, format: "legacy" };
  }

  if (!isRecord(parsed) || parsed.format !== "anime-diary-backup") {
    return {
      ok: false,
      issue: {
        code: "invalid_format",
        message: "不支持的备份文件格式",
      },
    };
  }

  if (parsed.schemaVersion !== 1) {
    return {
      ok: false,
      issue: {
        code: "unsupported_schema",
        message: `不支持的备份版本：${String(parsed.schemaVersion)}`,
      },
    };
  }

  if (!Array.isArray(parsed.data)) {
    return {
      ok: false,
      issue: {
        code: "invalid_format",
        message: "备份文件缺少 data 数组",
      },
    };
  }

  return { ok: true, data: parsed.data, format: "versioned" };
}

export function parseBackupJson(raw: string): BackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      issues: [
        {
          code: "invalid_json",
          message: "文件不是有效的 JSON",
        },
      ],
    };
  }

  const unwrapped = unwrapBackup(parsed);
  if (!unwrapped.ok) {
    return { ok: false, issues: [unwrapped.issue] };
  }

  const issues = unwrapped.data.flatMap((record, index) =>
    validateAnime(record, index),
  );
  const seenIds = new Map<string, number>();
  const seenBangumiIds = new Map<number, number>();

  for (const [index, record] of unwrapped.data.entries()) {
    if (!isRecord(record)) continue;

    if (typeof record.id === "string") {
      if (seenIds.has(record.id)) {
        issues.push(
          issue(
            "duplicate_id",
            `记录 ID 与第 ${seenIds.get(record.id)! + 1} 条重复`,
            index,
            "id",
          ),
        );
      } else {
        seenIds.set(record.id, index);
      }
    }

    if (
      typeof record.bangumiId === "number" &&
      Number.isInteger(record.bangumiId) &&
      record.bangumiId > 0
    ) {
      if (seenBangumiIds.has(record.bangumiId)) {
        issues.push(
          issue(
            "duplicate_bangumi_id",
            `Bangumi ID 与第 ${seenBangumiIds.get(record.bangumiId)! + 1} 条重复`,
            index,
            "bangumiId",
          ),
        );
      } else {
        seenBangumiIds.set(record.bangumiId, index);
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const data = structuredClone(unwrapped.data) as Anime[];
  return {
    ok: true,
    data,
    warnings: [],
    isEmpty: data.length === 0,
    format: unwrapped.format,
  };
}
