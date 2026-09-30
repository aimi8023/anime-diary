// 把没有 series 的记录统一设成「以标题为作品名」。
// 规则：每部番就是一个作品——单条记录自成一个作品集，后续的续季/剧场版/OVA
// 就能通过标题相似度并进来。已归集的记录保持原样。
// 用法: node scripts/default-series.mjs [--dry]
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "data/anime.json";
const dry = process.argv.includes("--dry");
const data = JSON.parse(readFileSync(FILE, "utf8"));

let applied = 0;
const byName = new Map();
for (const anime of data) {
  if (!(anime.series ?? "").trim()) {
    anime.series = anime.title.trim();
    applied++;
  }
  const key = anime.series;
  byName.set(key, (byName.get(key) ?? 0) + 1);
}

const multi = [...byName.entries()].filter(([, c]) => c > 1);
const works = byName.size;

console.log(`设置 series 的记录: ${applied} 条`);
console.log(`作品总数: ${works} 部（其中多条目作品 ${multi.length} 个）`);
console.log(`记录总数: ${data.length} 条`);
multi
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .forEach(([n, c]) => console.log(`  ${c} 条  ${n}`));
if (multi.length > 12) console.log(`  ...共 ${multi.length} 个多条目作品`);

if (dry) {
  console.log("\n[--dry] 未写入");
} else {
  writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
  console.log(`\n已写入 ${FILE}`);
}
