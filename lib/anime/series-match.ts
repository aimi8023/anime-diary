/**
 * 录入时猜测作品集。
 *
 * 存量归并靠“剥掉季度/篇章后缀后标题指纹一致”来判定，但那套规则对
 * “剧场版 刀剑神域 进击篇” 这类前缀式标题会漏。这里用相似度评分兜住：
 * 去掉标点后比较标题与作品集名的最长公共前缀，够长就认为同一部作品。
 *
 * 只负责“猜”，不负责“定”——猜错时表单仍可手动改或直接忽略。
 */

const PUNCT =
  /[\s・·:：!！~〜\-—_()（）【】[\]「」『』"'“”?？～*]/g;

/** 季/篇章/形式类后缀，比较时剥掉。 */
const SEASON_SUFFIX =
  /(完结篇|最终季|最终篇章|特别篇|特别放送篇|剧场版|电影版|续篇|前篇|后篇|前半|后半|上半|下半|Prologue)/g;
const SEASON_TOKEN = /第[一二三四五六七八九十\d]+部分|第[一二三四五六七八九十\d]+[季期章篇幕弹部]|[一二三四五六七八九十\d]+[季期章幕弹部]/g;

export function normalizeSeriesTitle(title: string): string {
  return String(title)
    .replace(PUNCT, "")
    .replace(SEASON_SUFFIX, "")
    // 「第N部分」先整体剥掉，否则会剩一个孤立的「部分」。
    .replace(/第[一二三四五六七八九十\d]+部分/, "")
    .replace(SEASON_TOKEN, "")
    .replace(/Part\.?\d+/gi, "")
    .replace(/OAD|OVA/gi, "")
    .replace(/部分|上半|下半|前半|后半/, "")
    .toLowerCase();
}

/** 最长公共前缀长度。 */
function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  return i;
}

export interface SeriesMatch {
  series: string;
  /** 相似度 0–1，按公共前缀占较长一方的比例。 */
  score: number;
  /** 命中该作品集的已有条目数，条目多说明是常见系列。 */
  memberCount: number;
}

/** 低于此分不提示，避免“什么都能沾边”。 */
export const SERIES_MATCH_THRESHOLD = 0.6;

/** 归一化后一方完整包含另一方时的固定分。 */
const CONTAINED_SCORE = 0.85;

/**
 * 给标题找出最可能所属的作品集。传入的作品集需来自当前全部记录。
 * 返回按分数从高到低，最多两个候选。
 */
export function suggestSeries(
  title: string,
  seriesNames: Array<{ name: string; memberCount: number }>,
): SeriesMatch[] {
  const target = normalizeSeriesTitle(title);
  // 标题太短时前缀判断不可靠。
  if (target.length < 2) return [];

  const matches: SeriesMatch[] = [];
  for (const { name, memberCount } of seriesNames) {
    const candidate = normalizeSeriesTitle(name);
    if (candidate.length < 2) continue;
    if (candidate === target) {
      matches.push({ series: name, score: 1, memberCount });
      continue;
    }
    // 包含关系是强信号：「鬼灭之刃 刀匠村篇」去掉标点后仍完整包含「鬼灭之刃」。
    // 尾部长度不影响判断——副标题再长也是同一部作品，所以给固定高分，
    // 不按长度比例摊薄（否则「X 刀匠村篇」这种会被副标题长度压到阈值以下）。
    const shorter = candidate.length <= target.length ? candidate : target;
    const longer = candidate.length <= target.length ? target : candidate;
    const score = longer.includes(shorter)
      ? CONTAINED_SCORE
      : commonPrefixLength(candidate, target) / longer.length;
    if (score >= SERIES_MATCH_THRESHOLD) {
      matches.push({ series: name, score, memberCount });
    }
  }

  return matches
    // 分数接近时偏好条目更多的系列，减少“新剧名碰巧像老系列名”的误报。
    .sort((a, b) => b.score - a.score || b.memberCount - a.memberCount)
    .slice(0, 2);
}

/** 从记录列表里汇总已有作品集及成员数。 */
export function collectSeriesNames(
  records: Array<{ series?: string }>,
): Array<{ name: string; memberCount: number }> {
  const counts = new Map<string, number>();
  for (const record of records) {
    const name = record.series?.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, memberCount]) => ({ name, memberCount }))
    .sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name, "zh-CN"));
}
