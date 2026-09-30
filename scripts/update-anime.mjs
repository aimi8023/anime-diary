// 本地辅助脚本：按 bangumiId 更新已有记录的 rating/comment/tags/marks/series/season。
// 用法: node scripts/update-anime.mjs <updates.json> [--dry] [--sync-series] [--proxy URL]
// updates.json 是数组，每项: { bangumiId, rating?, comment?, tags?, marks?, series?, season? }
//（只更新提供的字段）
//
// --sync-series 额外把同作品（相同 series）的其他条目同步 marks/series；
// 标记与归集都属于作品级语义，单条改完应当让整部作品保持一致。
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { archiveMarkLabel, normalizeMarks } from "../lib/anime/marks.ts";

const DATA_FILE = path.join(process.cwd(), "data", "anime.json");
const args = process.argv.slice(2);
const file = args[0];
const dry = args.includes("--dry");
const syncSeries = args.includes("--sync-series");
if (!file) { console.error("用法: node scripts/update-anime.mjs <updates.json> [--dry] [--sync-series]"); process.exit(1); }

const updates = JSON.parse(readFileSync(file, "utf8"));
const data = JSON.parse(readFileSync(DATA_FILE, "utf8"));
const byId = new Map(data.map((a) => [a.bangumiId, a]));

function validRating(r) { return typeof r === "number" && r >= 0 && r <= 10 && Number.isInteger(r * 2); }

let changed = 0, missing = 0;
for (const u of updates) {
  const rec = byId.get(u.bangumiId);
  if (!rec) { console.log(`  ? bangumiId ${u.bangumiId} 不在库中，跳过`); missing++; continue; }
  const before = [];
  if (u.rating !== undefined) {
    if (!validRating(u.rating)) { console.log(`  ! ${rec.title} 评分非法 ${u.rating}，跳过该项`); }
    else { before.push(`评分 ${rec.rating}→${u.rating}`); rec.rating = u.rating; }
  }
  if (u.comment !== undefined) { before.push("感想已更新"); rec.comment = String(u.comment).trim(); }
  if (u.tags !== undefined) { rec.tags = [...new Set(u.tags.map((t) => String(t).trim()).filter(Boolean))]; before.push(`标签→[${rec.tags.join(",")}]`); }
  // 标记按作品同步：作品内任意条目打了，其余条目也要跟着打。
  if (u.marks !== undefined) {
    rec.marks = normalizeMarks(u.marks);
    before.push(`标记→[${rec.marks.map(archiveMarkLabel).join(",") || "无"}]`);
  }
  if (u.series !== undefined) {
    rec.series = String(u.series).trim() || undefined;
    before.push(`作品集→${rec.series || "独立作品"}`);
  }
  if (u.season !== undefined && /^\d{4}[春夏秋冬]$/.test(u.season)) { before.push(`季度 ${rec.season}→${u.season}`); rec.season = u.season; }
  if (before.length) { changed++; console.log(`  ✓ ${rec.title}: ${before.join("; ")}`); }
}

// 把作品级语义（标记 / 作品集）同步到同作品的其他条目。
if (syncSeries) {
  let synced = 0;
  for (const u of updates) {
    if (u.marks === undefined && u.series === undefined) continue;
    const rec = byId.get(u.bangumiId);
    if (!rec) continue;
    const key = (rec.series ?? "").trim();
    if (!key) continue;
    const nextMarks = u.marks !== undefined ? normalizeMarks(u.marks) : null;
    for (const other of data) {
      if (other.id === rec.id) continue;
      if ((other.series ?? "").trim() !== key) continue;
      if (nextMarks) other.marks = [...nextMarks];
      if (u.series !== undefined) other.series = String(u.series).trim() || undefined;
      synced++;
    }
  }
  if (synced) console.log(`  ↻ 作品级同步到另外 ${synced} 个条目`);
}

console.log(`\n更新 ${changed} 条, 未命中 ${missing} 条`);
if (!dry && changed) { writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8"); console.log(`已写入 ${DATA_FILE}`); }
else if (dry) console.log("[--dry] 未写入");
