// 本地辅助脚本：把挑选的番剧写入 data/anime.json。
// 用法: node scripts/add-anime.mjs <picks.json> [--proxy URL] [--dry]
// picks.json 是数组，每项: { bangumiId, rating, comment?, tags?, season?, episodes?, title? }
// 字段映射严格对齐 lib/bangumi/mapper.ts，校验对齐 lib/anime/validation.ts。
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { nanoid } from "nanoid";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const API_BASE = "https://api.bgm.tv";
const DATA_FILE = path.join(process.cwd(), "data", "anime.json");
const VALID_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const args = process.argv.slice(2);
const picksFile = args[0];
let proxyUrl = process.env.BANGUMI_PROXY || "http://127.0.0.1:7897";
let dry = false;
for (let i = 1; i < args.length; i++) {
  if (args[i] === "--proxy") proxyUrl = args[++i];
  if (args[i] === "--dry") dry = true;
}
if (!picksFile) {
  console.error("用法: node scripts/add-anime.mjs <picks.json> [--proxy URL] [--dry]");
  process.exit(1);
}

function seasonFromAirDate(airDate) {
  if (!airDate) return "";
  const m = airDate.match(VALID_DATE);
  if (!m) return "";
  const month = Number(m[2]);
  if (month < 1 || month > 12) return "";
  if (month === 12) return `${Number(m[1]) + 1}春`;
  const season = month <= 2 ? "春" : month <= 5 ? "夏" : month <= 8 ? "秋" : "冬";
  return `${m[1]}${season}`;
}

const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
const headers = { Accept: "application/json", "User-Agent": process.env.BANGUMI_USER_AGENT || "anime-diary/private" };
if (process.env.BANGUMI_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.BANGUMI_ACCESS_TOKEN}`;

async function getSubject(id) {
  const r = await undiciFetch(`${API_BASE}/v0/subjects/${id}`, { headers, signal: AbortSignal.timeout(8000), ...(dispatcher ? { dispatcher } : {}) });
  if (!r.ok) throw new Error(`Bangumi ${id} HTTP ${r.status}`);
  return r.json();
}

function validate(rec) {
  const errs = [];
  if (typeof rec.title !== "string" || !rec.title.trim()) errs.push("标题为空");
  if (!/^\d{4}[春夏秋冬]$/.test(rec.season)) errs.push(`季度格式非法: ${rec.season}`);
  if (typeof rec.rating !== "number" || rec.rating < 0 || rec.rating > 10 || !Number.isInteger(rec.rating * 2)) errs.push(`评分非法: ${rec.rating}`);
  if (rec.comment && rec.comment.length > 2000) errs.push("短评超 2000 字");
  if (!Number.isInteger(rec.episodes) || rec.episodes < 0 || rec.episodes > 9999) errs.push(`话数非法: ${rec.episodes}`);
  if (rec.tags.length > 20) errs.push("标签超 20 个");
  for (const t of rec.tags) if (!t.trim() || t.length > 30) errs.push(`标签非法: ${t}`);
  if (rec.cover && !/^https?:\/\//.test(rec.cover)) errs.push("封面非 http(s) URL");
  return errs;
}

const picks = JSON.parse(readFileSync(picksFile, "utf8"));
if (!Array.isArray(picks)) { console.error("picks.json 必须是数组"); process.exit(1); }

let data = [];
try { data = JSON.parse(readFileSync(DATA_FILE, "utf8")); } catch { data = []; }
if (!Array.isArray(data)) { console.error("data/anime.json 不是数组，已中止以免损坏数据"); process.exit(1); }

const existingIds = new Set(data.map((a) => a.bangumiId).filter((x) => x !== undefined));
const normTitle = (t) => String(t || "").trim().toLowerCase().replace(/[\s・·:：!！?？~〜\-—_()（）\[\]【]']+/g, "");
const existingTitles = new Set(data.map((a) => normTitle(a.title)).filter(Boolean));
const added = [];
const skipped = [];

for (const pick of picks) {
  const bgmId = pick.bangumiId;
  if (existingIds.has(bgmId)) { skipped.push(`${bgmId} (bangumiId 已存在)`); continue; }
  const s = await getSubject(bgmId);
  const airDate = VALID_DATE.test(s.date ?? "") ? s.date : "";
  const cover = s.images?.large || s.images?.common || s.images?.medium || "";
  const title = (pick.title || s.name_cn || s.name || "").trim();
  if (existingTitles.has(normTitle(title)) || existingTitles.has(normTitle(s.name))) {
    skipped.push(`${bgmId} ${title} (标题已存在，疑似重复)`); continue;
  }
  const rec = {
    id: nanoid(12),
    title,
    season: pick.season || seasonFromAirDate(airDate),
    cover,
    rating: pick.rating ?? 0,
    comment: (pick.comment || "").trim(),
    episodes: pick.episodes ?? (Number.isFinite(s.eps) && s.eps > 0 ? Number(s.eps) : 0),
    tags: [...new Set((pick.tags || []).map((t) => String(t).trim()).filter(Boolean))],
    bangumiId: bgmId,
    bangumiUrl: `https://bgm.tv/subject/${bgmId}`,
    originalTitle: (s.name || "").trim(),
    ...(airDate ? { airDate } : {}),
    createdAt: new Date().toISOString(),
  };
  const errs = validate(rec);
  if (errs.length) { skipped.push(`${bgmId} ${title} 校验失败: ${errs.join("; ")}`); continue; }
  added.push(rec);
  existingIds.add(bgmId);
  existingTitles.add(normTitle(rec.title));
}

console.log(`本次新增 ${added.length} 条, 跳过 ${skipped.length} 条`);
added.forEach((r) => console.log(`  + [${r.season}] ${r.title} · ${r.rating}分 · eps:${r.episodes} · tags:[${r.tags.join(",")}]`));
skipped.forEach((s) => console.log(`  - ${s}`));

if (!dry && added.length) {
  writeFileSync(DATA_FILE, JSON.stringify([...data, ...added], null, 2), "utf8");
  console.log(`\n已写入 ${DATA_FILE} (总记录 ${data.length + added.length} 条)`);
} else if (dry) {
  console.log("\n[--dry] 未写入文件");
}
if (dispatcher) await dispatcher.close();
