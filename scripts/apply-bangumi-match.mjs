// 本地辅助脚本：把 match-bangumi.mjs 的匹配结果写回 data/anime.json。
// 只补 bangumiId / bangumiUrl / originalTitle / airDate，不动 title/season/rating/comment/cover/tags/episodes/id/createdAt。
// 用法: node scripts/apply-bangumi-match.mjs [--dry]
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DATA_FILE = path.join(process.cwd(), "data", "anime.json");
const REPORT_FILE = path.join(process.cwd(), "scripts", "bangumi-match-report.json");
const VALID_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const dry = process.argv.includes("--dry");

// 人工修正：报告里匹配错的，按记录标题覆盖
const overrides = {
  "赛博朋克：边缘行者": { id: 309311, name: "Cyberpunk: Edgerunners", date: "2022-09-13" },
  "不时轻声地以俄语遮羞的邻座艾莉同学 第一季": { id: 424883, name: "時々ボソッとロシア語でデレる隣のアーリャさん", date: "2024-07-03" },
};

const data = JSON.parse(readFileSync(DATA_FILE, "utf8"));
const report = JSON.parse(readFileSync(REPORT_FILE, "utf8"));
const byRecord = new Map(report.map((r) => [r.recordId, r]));

let applied = 0, skipped = 0;
const lines = [];
for (const rec of data) {
  if (rec.bangumiId) continue;
  const r = byRecord.get(rec.id);
  let m = r && r.best ? { id: r.best.id, name: r.best.name, date: r.best.date } : null;
  if (overrides[rec.title]) m = overrides[rec.title];
  if (!m || !m.id) { skipped++; lines.push(`  ? ${rec.title} — 无匹配，跳过`); continue; }
  rec.bangumiId = m.id;
  rec.bangumiUrl = `https://bgm.tv/subject/${m.id}`;
  if (m.name) rec.originalTitle = m.name;
  if (VALID_DATE.test(m.date || "")) rec.airDate = m.date;
  applied++;
  lines.push(`  ✓ ${rec.title} → id:${m.id}${rec.airDate ? " " + rec.airDate : ""}`);
}

console.log(lines.join("\n"));
console.log(`\n补齐 ${applied} 条, 跳过 ${skipped} 条`);
if (!dry && applied) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  console.log(`已写入 ${DATA_FILE}`);
} else if (dry) {
  console.log("[--dry] 未写入");
}
