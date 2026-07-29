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

  const season =
    month <= 3 ? "春" : month <= 6 ? "夏" : month <= 9 ? "秋" : "冬";
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
    ...base,
    season: seasonFromAirDate(base.airDate),
    suggestedTags,
  };
}
