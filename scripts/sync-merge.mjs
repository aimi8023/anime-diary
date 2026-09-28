// 同步用：拉云端 → 以云端为基准合并本地新增 → 写回本地镜像 + 生成导入文件 + 报差异。
// 用法: node scripts/sync-merge.mjs [--proxy URL]
// 原则：云端已有的记录一律以云端为准（保留用户在网站上直接新增/编辑的内容），
//      本地只贡献"云端没有的新增"（按 id、bangumiId、归一化标题判定）。
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SITE = "https://anime.zhanghome.qzz.io/api/anime";
const DATA_FILE = path.join(process.cwd(), "data", "anime.json");
const OUT_FILE = path.join(process.cwd(), "scripts", "import-to-prod.json");
const PROD_FILE = path.join(process.cwd(), "scripts", "prod-anime-latest.json");

let proxyUrl = process.env.BANGUMI_PROXY || "http://127.0.0.1:7897";
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) if (args[i] === "--proxy") proxyUrl = args[++i];

const norm = (t) => String(t || "").trim().toLowerCase().replace(/[\s・·:：!！?？~〜\-—_()（）\[\]【]'’‘"”“。、,]+/g, "");

const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
const r = await undiciFetch(SITE, {
  headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
  signal: AbortSignal.timeout(20000), ...(dispatcher ? { dispatcher } : {}),
});
if (!r.ok) { console.error("拉取云端失败 HTTP", r.status); process.exit(1); }
const prod = await r.json();
writeFileSync(PROD_FILE, JSON.stringify(prod, null, 2));

const local = JSON.parse(readFileSync(DATA_FILE, "utf8"));
const prodIds = new Set(prod.map((a) => a.id));
const prodBgm = new Set(prod.map((a) => a.bangumiId).filter(Boolean));
const prodTitles = new Set(prod.map((a) => norm(a.title)));

const additions = local.filter((a) =>
  !prodIds.has(a.id) && !(a.bangumiId && prodBgm.has(a.bangumiId)) && !prodTitles.has(norm(a.title)));

const merged = [...prod, ...additions];
writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2));
writeFileSync(OUT_FILE, JSON.stringify({
  format: "anime-diary-backup", schemaVersion: 1,
  exportedAt: new Date().toISOString(), source: "current", data: merged,
}, null, 2));

const mergedById = new Map(merged.map((a) => [a.id, a]));
let removed = 0, changed = 0, unchanged = 0;
for (const p of prod) {
  const m = mergedById.get(p.id);
  if (!m) removed++;
  else if (JSON.stringify(p) !== JSON.stringify(m)) changed++;
  else unchanged++;
}

console.log(`云端: ${prod.length} 条 | 本地原有: ${local.length} 条`);
console.log(`本次新增(本地独有): ${additions.length} 条` + (additions.length ? ":\n  - " + additions.map((a) => `${a.title}[${a.season}]`).join("\n  - ") : ""));
console.log(`\n合并后镜像: ${merged.length} 条  (已写回 data/anime.json)`);
console.log(`导入文件: ${OUT_FILE}  (${(readFileSync(OUT_FILE, "utf8").length / 1024).toFixed(0)} KB)`);
console.log(`\n【导入预览应为】 新增: ${additions.length} | 修改: ${changed} | 不变: ${unchanged} | 删除: ${removed}`);
console.log("若“删除”不是 0，立刻停手别导入。");
if (dispatcher) await dispatcher.close();
