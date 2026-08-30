import type { AnimeInput } from "@/lib/types";

export interface InputIssue {
  path: string;
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; issues: InputIssue[] };

const supportedFields = [
  "title",
  "season",
  "cover",
  "rating",
  "comment",
  "episodes",
  "tags",
  "bangumiId",
  "bangumiUrl",
  "originalTitle",
  "airDate",
] as const satisfies ReadonlyArray<keyof AnimeInput>;

type SupportedField = (typeof supportedFields)[number];
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(
  value: UnknownRecord,
  key: SupportedField,
): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function validWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validateInput(
  value: unknown,
  mode: "create" | "update",
): ValidationResult<AnimeInput | Partial<AnimeInput>> {
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [{ path: "$", message: "请求体必须是对象" }],
    };
  }

  if (
    mode === "update" &&
    !supportedFields.some((field) => hasOwn(value, field))
  ) {
    return {
      ok: false,
      issues: [
        { path: "$", message: "至少需要提供一个可更新字段" },
      ],
    };
  }

  const data: Partial<AnimeInput> = {};
  const issues: InputIssue[] = [];

  const validateRequiredString = (
    field: "title",
    label: string,
    maxLength: number,
  ) => {
    if (mode === "update" && !hasOwn(value, field)) return;
    const raw = value[field];
    if (typeof raw !== "string" || raw.trim().length === 0) {
      issues.push({ path: field, message: `${label}不能为空` });
      return;
    }
    const normalized = raw.trim();
    if (normalized.length > maxLength) {
      issues.push({
        path: field,
        message: `${label}不能超过 ${maxLength} 个字符`,
      });
      return;
    }
    data[field] = normalized;
  };

  validateRequiredString("title", "标题", 120);

  if (mode === "create" || hasOwn(value, "season")) {
    const raw = value.season;
    if (typeof raw !== "string" || raw.trim().length === 0) {
      issues.push({ path: "season", message: "季度不能为空" });
    } else {
      const normalized = raw.trim();
      // 年份分组、表单预填和归档展示都依赖 `YYYY春夏秋冬` 格式，
      // 因此在这里强制，而不是由各消费方自行容错。
      if (!/^\d{4}[春夏秋冬]$/.test(normalized)) {
        issues.push({
          path: "season",
          message: "季度格式必须是四位年份加春/夏/秋/冬，例如 2024春",
        });
      } else {
        data.season = normalized;
      }
    }
  }

  if (mode === "create" || hasOwn(value, "cover")) {
    const raw = value.cover;
    if (raw === undefined && mode === "create") {
      data.cover = "";
    } else if (typeof raw !== "string") {
      issues.push({ path: "cover", message: "封面地址必须是字符串" });
    } else {
      const normalized = raw.trim();
      if (normalized.length > 2048 || (normalized && !validWebUrl(normalized))) {
        issues.push({
          path: "cover",
          message: "封面地址必须是有效的 HTTP(S) URL",
        });
      } else {
        data.cover = normalized;
      }
    }
  }

  if (mode === "create" || hasOwn(value, "rating")) {
    const raw = value.rating;
    if (raw === undefined && mode === "create") {
      data.rating = 1;
    } else if (
      typeof raw !== "number" ||
      !Number.isFinite(raw) ||
      raw < 0 ||
      raw > 10 ||
      !Number.isInteger(raw * 2)
    ) {
      issues.push({
        path: "rating",
        message: "评分必须是 0–10 之间的 0.5 倍数（0 表示未评分）",
      });
    } else {
      data.rating = raw;
    }
  }

  if (mode === "create" || hasOwn(value, "comment")) {
    const raw = value.comment;
    if (raw === undefined && mode === "create") {
      data.comment = "";
    } else if (typeof raw !== "string") {
      issues.push({ path: "comment", message: "短评必须是字符串" });
    } else {
      const normalized = raw.trim();
      if (normalized.length > 2000) {
        issues.push({
          path: "comment",
          message: "短评不能超过 2000 个字符",
        });
      } else {
        data.comment = normalized;
      }
    }
  }

  if (mode === "create" || hasOwn(value, "episodes")) {
    const raw = value.episodes;
    if (raw === undefined && mode === "create") {
      data.episodes = 0;
    } else if (
      typeof raw !== "number" ||
      !Number.isInteger(raw) ||
      raw < 0 ||
      raw > 9999
    ) {
      issues.push({
        path: "episodes",
        message: "话数必须是 0–9999 的整数",
      });
    } else {
      data.episodes = raw;
    }
  }

  if (mode === "create" || hasOwn(value, "tags")) {
    const raw = value.tags;
    if (raw === undefined && mode === "create") {
      data.tags = [];
    } else if (!Array.isArray(raw)) {
      issues.push({ path: "tags", message: "标签必须是数组" });
    } else {
      if (raw.length > 20) {
        issues.push({ path: "tags", message: "标签不能超过 20 个" });
      }
      const normalizedTags: string[] = [];
      const seen = new Set<string>();
      raw.forEach((tag, index) => {
        if (typeof tag !== "string") {
          issues.push({
            path: `tags.${index}`,
            message: "标签必须是字符串",
          });
          return;
        }
        const normalized = tag.trim();
        if (normalized.length === 0 || normalized.length > 30) {
          issues.push({
            path: `tags.${index}`,
            message: "标签长度必须是 1–30 个字符",
          });
          return;
        }
        if (!seen.has(normalized)) {
          seen.add(normalized);
          normalizedTags.push(normalized);
        }
      });
      data.tags = normalizedTags;
    }
  }

  if (hasOwn(value, "bangumiId")) {
    const raw = value.bangumiId;
    if (
      typeof raw !== "number" ||
      !Number.isInteger(raw) ||
      raw <= 0
    ) {
      issues.push({
        path: "bangumiId",
        message: "Bangumi ID 必须是正整数",
      });
    } else {
      data.bangumiId = raw;
    }
  }

  const validateOptionalString = (
    field: "bangumiUrl" | "originalTitle" | "airDate",
    maxLength: number,
  ) => {
    if (!hasOwn(value, field)) return;
    const raw = value[field];
    if (raw === undefined) {
      data[field] = undefined;
      return;
    }
    if (typeof raw !== "string") {
      issues.push({ path: field, message: "字段必须是字符串" });
      return;
    }
    const normalized = raw.trim();
    if (normalized.length === 0) {
      data[field] = undefined;
      return;
    }
    if (normalized.length > maxLength) {
      issues.push({
        path: field,
        message: `字段不能超过 ${maxLength} 个字符`,
      });
      return;
    }
    if (field === "bangumiUrl" && !validWebUrl(normalized)) {
      issues.push({
        path: field,
        message: "Bangumi 地址必须是有效的 HTTP(S) URL",
      });
      return;
    }
    if (field === "airDate" && !validDate(normalized)) {
      issues.push({
        path: field,
        message: "首播日期必须是有效的 YYYY-MM-DD 日期",
      });
      return;
    }
    data[field] = normalized;
  };

  validateOptionalString("bangumiUrl", 2048);
  validateOptionalString("originalTitle", 120);
  validateOptionalString("airDate", 10);

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, data };
}

export function parseAnimeCreateInput(
  value: unknown,
): ValidationResult<AnimeInput> {
  return validateInput(value, "create") as ValidationResult<AnimeInput>;
}

export function parseAnimeUpdateInput(
  value: unknown,
): ValidationResult<Partial<AnimeInput>> {
  return validateInput(value, "update") as ValidationResult<
    Partial<AnimeInput>
  >;
}
