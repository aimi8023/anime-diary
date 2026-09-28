// 辅助：读某年 map，打印四季序号区间 + 已收录 + 命中代表作关键字的清单。
// 用法: node scripts/season-notable.mjs 2014
import { readFileSync } from "node:fs";
import path from "node:path";

const year = Number(process.argv[2]);
if (!year) { console.error("用法: node scripts/season-notable.mjs <年份>"); process.exit(1); }
const file = path.join(process.cwd(), "scripts", `year-${year}-map.json`);
const m = JSON.parse(readFileSync(file, "utf8"));

const kw = [
  "伪恋", "NO GAME", "游戏人生", "魔法科", "排球少年", "黑子的篮球", "滨虎", "希德尼娅", "银河英雄", "黑色子弹", "约会大作战", "剑灵", "极黑", "棺姬", "星刻",
  "月刊少女", "青春之旅", "东京食尸鬼", "东京喰种", "中二病", "赤红之瞳", "寄生兽", "白箱", "心理测量", "甘城", "大图书馆", "异能战斗", "TRINITY", "结城友奈",
  "花舞", "选择感染者", "天才麻将", "灰色的乐园", "偶像活动", "龙娘", "阳炎", "目隐", "银之匙", "境界", "Fate/stay", "UNLIMITED", "bladed", "七大罪", "临时女友",
  "魔法少女小圆", "魔法少女", "偶像大师", "灰姑娘", "噬魂", "普通女高中生", "人生相谈", "卡片战斗", "伪恋", "LoveLive", "lovelive", "lovelive", "Love Live",
  "日常系的异能", "滨虎", "M3", "魔剑", "约会大作战II", "人生", "樱Trick", "选择", "爱神巧克力", "甘城光辉", "临时情侣", "灰色", "魔笛", "MAGI", "排球",
];
const set = [...new Set(kw)];

const byS = {};
m.forEach((x) => { (byS[x.season] = byS[x.season] || []).push(x); });
const order = ["春", "夏", "秋", "冬"].map((s) => `${year}${s}`);
for (const s of order) {
  const a = byS[s] || [];
  if (a.length) console.log(`${s} (${a.length}部, 序号 ${a[0].num}–${a[a.length - 1].num})`);
}
const owned = m.filter((x) => x.owned);
console.log(`\n本年已收录 (${owned.length}):`);
owned.forEach((x) => console.log(`  ${String(x.num).padStart(3)} [${x.season.slice(4)}] ${x.title}`));

const hits = m.filter((x) => set.some((f) => (x.title + " " + x.name).includes(f)));
console.log(`\n--- 命中代表作 (${hits.length}) ---`);
hits.forEach((x) => console.log(`  ${String(x.num).padStart(3)} [${x.season.slice(4)}] ${x.owned ? "<已收> " : ""}${x.title}`));
