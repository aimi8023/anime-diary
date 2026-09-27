/**
 * 内置标记：描述“这部番在我的档案里有什么特别之处”。
 *
 * 与 `tags` 的区别：
 * - `tags` 是自由文本分类，可以自己造词，默认用于展示；
 * - `marks` 取值封闭（只有下面这几种），可以多选，也能按单个标记筛选。
 *
 * 新增或改名标记会改变已存数据的语义，因此只在这里维护，
 * 校验、筛选、后台表单与公开展示都从这里读取。
 */
export const ARCHIVE_MARKS = [
  { id: "rewatch", label: "多刷", hint: "看过不止一遍" },
  {
    id: "source",
    label: "看过原作",
    hint: "有小说、漫画、游戏或真人版原作，并且看过",
  },
  {
    id: "special",
    label: "剧场版·特别篇",
    hint: "OVA、OAD、剧场版等独立企划",
  },
  {
    id: "remaster",
    label: "重制·复刻",
    hint: "BD 修正、新作重制或限定复刻版",
  },
  {
    id: "premiere",
    label: "先行放送",
    hint: "配信限定，或比其他地区更早看到",
  },
  {
    id: "catchup",
    label: "久追补番",
    hint: "隔了较久才补上，或追了很久的",
  },
] as const;

export type ArchiveMarkId = (typeof ARCHIVE_MARKS)[number]["id"];

const MARK_LABELS = new Map<string, string>(
  ARCHIVE_MARKS.map((mark) => [mark.id, mark.label]),
);

export function isArchiveMarkId(value: unknown): value is ArchiveMarkId {
  return typeof value === "string" && MARK_LABELS.has(value);
}

/** 未知 id 原样返回：老数据或外部数据不应渲染成空白。 */
export function archiveMarkLabel(id: string): string {
  return MARK_LABELS.get(id) ?? id;
}

export function archiveMarkHint(id: string): string {
  return ARCHIVE_MARKS.find((mark) => mark.id === id)?.hint ?? "";
}

/**
 * 规范化输入标记：丢弃未知取值、去重，并按内置顺序排列，
 * 保证同一组标记在不同记录里的顺序一致，筛选与展示口径稳定。
 */
export function normalizeMarks(value: unknown): ArchiveMarkId[] {
  if (!Array.isArray(value)) return [];
  const picked = new Set(value.filter(isArchiveMarkId));
  return ARCHIVE_MARKS.filter((mark) => picked.has(mark.id)).map(
    (mark) => mark.id,
  );
}

/** 展示用：把可能是老数据的任意字符串数组变成可渲染的标记列表。 */
export function toDisplayMarks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const id of value) {
    if (typeof id === "string" && id.trim()) seen.add(id.trim());
  }
  const known = ARCHIVE_MARKS.filter((mark) => seen.has(mark.id)).map(
    (mark) => mark.id as string,
  );
  // 词表调整后仍保底显示未知标记，避免旧数据在界面上凭空消失。
  return known.concat(
    Array.from(seen).filter((id) => !MARK_LABELS.has(id)),
  );
}
