// 数据层统一以“春/夏/秋/冬”存储季度（与 Bangumi 录入习惯一致），
// 展示层统一转换为番剧观众更熟悉的“1月/4月/7月/10月”档期。

const MONTH_BY_SEASON: Record<string, string> = {
  春: "1月",
  夏: "4月",
  秋: "7月",
  冬: "10月",
};

/** “夏” → “4月”；未知值原样返回。 */
export function seasonMonthLabel(season: string): string {
  return MONTH_BY_SEASON[season] ?? season;
}

/** “2024夏” → “2024年4月”；不符合格式时原样返回。 */
export function formatSeasonLabel(season: string): string {
  const match = season.match(/^(\d{4})([春夏秋冬])$/);
  if (!match) return season;
  return `${match[1]}年${MONTH_BY_SEASON[match[2]] ?? match[2]}`;
}
