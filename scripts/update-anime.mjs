// 本地辅助脚本：按 bangumiId 更新已有记录的 rating/comment/tags/season。
// 用法: node scripts/update-anime.mjs <updates.json> [--dry]
// updates.json 是数组，每项: { bangumiId, rating?, comment?, tags?, season? }（只更新提供的字段）
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DATA_FILE = path.join(process.cwd(), "data", "anime.json");
const args = process.argv.slice(2);
const file = args[0];
const dry = args.includes("--dry");
if (!file) { console.error("用法: node scripts/update-anime.mjs <updates.json> [--dry]"); process.exit(1); }

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
  if (u.season !== undefined && /^\d{4}[春夏秋冬]$/.test(u.season)) { before.push(`季度 ${rec.season}→${u.season}`); rec.season = u.season; }
  if (before.length) { changed++; console.log(`  ✓ ${rec.title}: ${before.join("; ")}`); }
}

console.log(`\n更新 ${changed} 条, 未命中 ${missing} 条`);
if (!dry && changed) { writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8"); console.log(`已写入 ${DATA_FILE}`); }
else if (dry) console.log("[--dry] 未写入");
