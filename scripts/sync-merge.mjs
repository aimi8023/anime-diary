// 同步用：拉云端 → 合并本地 → 写回本地镜像 + 生成导入文件 + 报差异。
//
// 用法: node scripts/sync-merge.mjs [--proxy URL] [--prefer-local] [--fields a,b]
//
// 三种合并方向：
//   默认            已存在的记录以云端为准，保留你在网站上直接改的内容；
//   --prefer-local  已存在的记录整体以本地为准（慎用：会覆盖网站端的评分、标记等改动）；
//   --fields a,b    只有这些字段取本地值，其余字段仍以云端为准。
//                   批量在本地加了新字段、又不想覆盖网站端编辑时用这个。
//
// 无论哪种方向，云端独有的记录都会保留——本地镜像较旧时导入也不会误删。
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SITE = "https://anime.zhanghome.qzz.io/api/anime";
const DATA_FILE = path.join(process.cwd(), "data", "anime.json");
const OUT_FILE = path.join(process.cwd(), "scripts", "import-to-prod.json");
const PROD_FILE = path.join(process.cwd(), "scripts", "prod-anime-latest.json");

let proxyUrl = process.env.BANGUMI_PROXY || "http://127.0.0.1:7897";
let preferLocal = false;
let localFields = null;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--proxy") proxyUrl = args[++i];
  if (args[i] === "--prefer-local") preferLocal = true;
  if (args[i] === "--fields") {
    localFields = new Set(
      String(args[++i] || "")
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
    );
  }
}

const norm = (t) => String(t || "").trim().toLowerCase().replace(/[\s・·:：!！?？~〜\-—_()（）\[\]【]'’‘"”“。、,]+/g, "");

const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
const r = await undiciFetch(SITE, {
  headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
  signal: AbortSignal.timeout(20000), ...(dispatcher ? { dispatcher } : {}),
});
if (!r.ok) { console.error("拉取云端失败 HTTP", r.status); process.exit(1); }
const prod = await r.json();
writeFileSync(PROD_FILE, JSON.stringify(prod, null, 2), "utf8");

const local = JSON.parse(readFileSync(DATA_FILE, "utf8"));
const localById = new Map(local.map((a) => [a.id, a]));
const prodBgm = new Set(prod.map((a) => a.bangumiId).filter(Boolean));
const prodTitles = new Set(prod.map((a) => norm(a.title)));

// 本地独有条目：云端完全没有的，走新增路径。
const localAdditions = local.filter((a) =>
  !prod.some((p) => p.id === a.id) &&
  !(a.bangumiId && prodBgm.has(a.bangumiId)) &&
  !prodTitles.has(norm(a.title)),
);

/** 已存在记录的取值：按 --fields / --prefer-local / 默认三种方向。 */
function resolveShared(cloud) {
  const mine = localById.get(cloud.id);
  if (!mine) return cloud;
  if (localFields) {
    // 只把指定字段换成本地值，其余字段（尤其是网站端改过的评分/标记/感想）保持云端。
    const merged = { ...cloud };
    for (const field of localFields) merged[field] = mine[field];
    return merged;
  }
  return preferLocal ? mine : cloud;
}

const shared = prod.filter((p) => localById.has(p.id)).map(resolveShared);

// 云端独有：无论哪种方向都保留，否则导入会误删你在网站上新增的记录。
const prodOnly = prod.filter((p) => !localById.has(p.id));

const merged = [...shared, ...prodOnly, ...localAdditions];
writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2), "utf8");
writeFileSync(OUT_FILE, JSON.stringify({
  format: "anime-diary-backup", schemaVersion: 1,
  exportedAt: new Date().toISOString(), source: "current", data: merged,
}, null, 2), "utf8");

const mergedById = new Map(merged.map((a) => [a.id, a]));
let removed = 0, changed = 0, unchanged = 0;
for (const p of prod) {
  const m = mergedById.get(p.id);
  if (!m) removed++;
  else if (JSON.stringify(p) !== JSON.stringify(m)) changed++;
  else unchanged++;
}

const direction = localFields
  ? `按字段合并（本地取: ${[...localFields].join(", ")}，其余以云端为准）`
  : preferLocal
    ? "本地优先（推送本地改动）"
    : "云端优先（拉取网站改动）";
console.log(`方向: ${direction}`);
console.log(`云端: ${prod.length} 条 | 本地: ${local.length} 条`);
console.log(`  共有记录 ${shared.length} 条 | 云端独有 ${prodOnly.length} 条（保留） | 本地独有 ${localAdditions.length} 条（新增）`);
if (prodOnly.length) {
  console.log("  云端独有记录: " + prodOnly.map((a) => `${a.title}[${a.season}]`).join(", "));
}
console.log(`\n合并后镜像: ${merged.length} 条  (已写回 data/anime.json)`);
console.log(`导入文件: ${OUT_FILE}  (${(readFileSync(OUT_FILE, "utf8").length / 1024).toFixed(0)} KB)`);
console.log(`\n【导入预览应为】 新增: ${localAdditions.length} | 修改: ${changed} | 不变: ${unchanged} | 删除: ${removed}`);
console.log("若“删除”不是 0，立刻停手别导入。");
if (dispatcher) await dispatcher.close();
