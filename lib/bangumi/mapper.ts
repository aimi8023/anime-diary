import type {
  BangumiPrefill,
  BangumiSearchResult,
  BangumiSubject,
  BangumiSubjectSummary,
} from "./types";

const VALID_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function seasonFromAirDate(airDate?: string): string {
  if (!airDate) return "";
  const match = airDate.match(VALID_DATE);
  if (!match) return "";

  const month = Number(match[2]);
  if (month < 1 || month > 12) return "";

  // 季度划分：春=12/1/2 月、夏=3–5 月、秋=6–8 月、冬=9–11 月；
  // 12 月首播归入次年春。
  if (month === 12) return `${Number(match[1]) + 1}春`;
  const season =
    month <= 2 ? "春" : month <= 5 ? "夏" : month <= 8 ? "秋" : "冬";
  return `${match[1]}${season}`;
}

function titleOf(subject: BangumiSubjectSummary): string {
  return subject.name_cn?.trim() || subject.name.trim();
}

function coverOf(subject: BangumiSubjectSummary): string {
  return (
    subject.images?.large ||
    subject.images?.common ||
    subject.images?.medium ||
    ""
  );
}

// 候选列表的小卡片优先用压缩图，降低滚动时的下载与解码开销；
// 全尺寸封面仍由 cover 字段携带，入库时保存的是它。
function coverThumbOf(subject: BangumiSubjectSummary): string {
  return (
    subject.images?.common ||
    subject.images?.medium ||
    subject.images?.large ||
    ""
  );
}

function episodesOf(subject: BangumiSubjectSummary): number {
  return Number.isFinite(subject.eps) && (subject.eps ?? 0) > 0
    ? Number(subject.eps)
    : 0;
}

function validAirDate(subject: BangumiSubjectSummary): string {
  return VALID_DATE.test(subject.date ?? "") ? subject.date! : "";
}

export function mapSearchSubject(
  subject: BangumiSubjectSummary,
): BangumiSearchResult {
  return {
    bangumiId: subject.id,
    bangumiUrl: `https://bgm.tv/subject/${subject.id}`,
    title: titleOf(subject),
    originalTitle: subject.name.trim(),
    cover: coverOf(subject),
    coverThumb: coverThumbOf(subject),
    airDate: validAirDate(subject),
    episodes: episodesOf(subject),
  };
}

export function mapSubjectToPrefill(
  subject: BangumiSubject,
): BangumiPrefill {
  const base = mapSearchSubject(subject);
  const suggestedTags = [
    ...new Set(
      (subject.tags ?? [])
        .map((tag) => tag.name?.trim())
        .filter((tag): tag is string => Boolean(tag)),
    ),
  ].slice(0, 12);

  return {
    bangumiId: base.bangumiId,
    bangumiUrl: base.bangumiUrl,
    title: base.title,
    originalTitle: base.originalTitle,
    cover: base.cover,
    airDate: base.airDate,
    season: seasonFromAirDate(base.airDate),
    episodes: base.episodes,
    suggestedTags,
  };
}
