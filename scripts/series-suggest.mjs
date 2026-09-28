// 扫描 data/anime.json，找出属于同一部作品的条目，输出候选分组。
// 规则保守：先抹平标点差异，再反复剥掉结尾的分季/上下半/篇章类标记，
// 剥完仍完全一致的才归为一组。
// 用法: node scripts/series-suggest.mjs
import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("data/anime.json", "utf8"));

const PUNCT = /[\s・·:：!！~〜\-—_()（）【】[\]「」『』"'“”?？]/g;

/**
 * 只用于比较的指纹：去标点，并在整串中抹掉季度/篇章类标记。
 * 标记可能出现在标题中间（例如「无职转生 第二季 ～到了异世界～」），
 * 所以不只剥结尾。
 */
function canon(title) {
  return String(title)
    .replace(PUNCT, "")
    .replace(
      /(完结篇|最终季|最终篇章|特别篇|特别放送篇|剧场版|电影版|续篇|前篇|后篇|前半|后半|上半|下半)/g,
      "",
    )
    .replace(/第[一二三四五六七八九十\d]+部分/g, "")
    .replace(/第[一二三四五六七八九十\d]+[季期章篇幕弹部]/g, "")
    .replace(/[一二三四五六七八九十\d]+[季期章幕弹部]/g, "")
    .replace(/Part\.?\d+/gi, "");
}

/** 展示用的作品名：在最早一条标题上去掉结尾的季度/篇章标记，保留可读性。 */
function baseName(title) {
  let s = String(title).trim();
  let prev;
  do {
    prev = s;
    s = s
      .replace(
        /\s*(完结篇|最终季|最终篇章|特别篇|特别放送篇|剧场版|电影版|续篇)\s*$/,
        "",
      )
      .replace(
        /\s*(前篇|后篇|前半|后半|上半|下半|第[一二三四五六七八九十\d]+部分)\s*$/,
        "",
      )
      .replace(/\s*第[一二三四五六七八九十\d]+[季部期章篇幕弹]\s*$/, "")
      .replace(/\s*[一二三四五六七八九十\d]+[季部期章篇幕弹]\s*$/, "")
      .replace(/\s*Part\.?\d+\s*$/i, "")
      .trim();
  } while (s !== prev && s.length > 0);
  return s || String(title).trim();
}

const buckets = new Map();
for (const anime of data) {
  const key = canon(anime.title);
  if (!key) continue;
  buckets.set(key, [...(buckets.get(key) ?? []), anime]);
}

const groups = [...buckets.values()]
  .filter((list) => list.length > 1)
  .map((list) => ({
    name: baseName(
      [...list].sort((a, b) => a.season.localeCompare(b.season))[0].title,
    ),
    list: [...list].sort((a, b) => a.season.localeCompare(b.season)),
  }))
  .sort((a, b) => b.list.length - a.list.length);

const plan = {};
let entries = 0;
for (const { name, list } of groups) {
  entries += list.length;
  console.log(`── ${name}  (${list.length} 条)`);
  list.forEach((a) => {
    console.log(`     ${a.season}  ★${a.rating}  bgm:${a.bangumiId}  ${a.title}`);
    plan[a.bangumiId] = name;
  });
  console.log("");
}

console.log(
  `候选作品集 ${groups.length} 组，涉及 ${entries} 个条目；` +
    `写入后档案从 ${data.length} 条归并为 ${data.length - entries + groups.length} 部作品。`,
);

writeFileSync("scripts/series-plan.json", JSON.stringify(plan, null, 2), "utf8");
console.log("候选已写入 scripts/series-plan.json");
console.log("确认或改写后运行: node scripts/apply-series.mjs");
