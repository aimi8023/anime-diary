// 把 scripts/series-plan-2.json 里的归并写进 data/anime.json。
// 用法: node scripts/apply-series.mjs [--dry] [--plan <文件>]
// 映射格式: { "<bangumiId>": "<作品集名>" }，未出现的记录保持独立作品。
import { readFileSync, writeFileSync } from "node:fs";

const DATA_FILE = "data/anime.json";
const dry = process.argv.includes("--dry");
const planArgIndex = process.argv.indexOf("--plan");
const PLAN_FILE =
  planArgIndex > -1 && process.argv[planArgIndex + 1]
    ? process.argv[planArgIndex + 1]
    : "scripts/series-plan-2.json";

const plan = JSON.parse(readFileSync(PLAN_FILE, "utf8"));
const data = JSON.parse(readFileSync(DATA_FILE, "utf8"));

let applied = 0;
const missing = [];
const byName = new Map();

for (const anime of data) {
  const name = plan[String(anime.bangumiId)];
  if (!name) {
    anime.series = undefined;
    continue;
  }
  anime.series = String(name).trim();
  applied++;
  byName.set(anime.series, (byName.get(anime.series) ?? 0) + 1);
}

for (const key of Object.keys(plan)) {
  if (!data.some((a) => String(a.bangumiId) === key)) missing.push(key);
}

const works = new Set(data.map((a) => a.series?.trim() || a.id)).size;
console.log(`\n计划文件: ${PLAN_FILE}`);
console.log(`作品集 ${byName.size} 组，写入 series 的条目 ${applied} 条`);
[...byName.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([name, count]) => console.log(`  ${String(count).padStart(2)} 条  ${name}`));
if (missing.length) {
  console.log(`\n计划里有 ${missing.length} 个 bangumiId 在数据中不存在：`);
  console.log("  " + missing.join(", "));
}
console.log(`\n单作视图: ${data.length} 条记录 | 作品视图: ${works} 部作品`);

if (dry) {
  console.log("\n[--dry] 未写入");
} else {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  console.log(`\n已写入 ${DATA_FILE}`);
  console.log("接下来跑 node scripts/sync-merge.mjs 再到后台导入");
}
