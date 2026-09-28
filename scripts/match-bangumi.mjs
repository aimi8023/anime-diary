// 本地辅助脚本：为没有 bangumiId 的记录匹配 Bangumi 条目（只出报告，不写库）。
// 用法: node scripts/match-bangumi.mjs [--proxy URL] [--write]
// 打分 = 标题归一化相似度 + 首播日是否落在记录 season 的播出窗口。
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const API_BASE = "https://api.bgm.tv";
const DATA_FILE = path.join(process.cwd(), "data", "anime.json");
const REPORT_FILE = path.join(process.cwd(), "scripts", "bangumi-match-report.json");
const VALID_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const args = process.argv.slice(2);
let proxyUrl = process.env.BANGUMI_PROXY || "http://127.0.0.1:7897";
let doWrite = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--proxy") proxyUrl = args[++i];
  if (args[i] === "--write") doWrite = true;
}

const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
const headers = { Accept: "application/json", "Content-Type": "application/json", "User-Agent": process.env.BANGUMI_USER_AGENT || "anime-diary/private" };
if (process.env.BANGUMI_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.BANGUMI_ACCESS_TOKEN}`;

function seasonWindow(season) {
  const m = /^(\d{4})([春夏秋冬])$/.exec(season || "");
  if (!m) return null;
  const y = Number(m[1]);
  switch (m[2]) {
    case "春": return [`${y - 1}-12-01`, `${y}-03-01`];
    case "夏": return [`${y}-03-01`, `${y}-06-01`];
    case "秋": return [`${y}-06-01`, `${y}-09-01`];
    case "冬": return [`${y}-09-01`, `${y}-12-01`];
  }
}

const norm = (t) => String(t || "").trim().toLowerCase()
  .replace(/[\s・·:：!！?？~〜\-—_()（）\[\]【]'’‘"”“。.,、]/g, "")
  .replace(/(第[一二三四五六七八九十0-9]+季|上半|下半|上半部|下半部|前篇|后篇|中篇|完|上|中|下|part\d|cour)/g, "");

// 简单字符二元组相似度
function sim(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const grams = (s) => { const g = new Set(); for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2)); if (s.length === 1) g.add(s); return g; };
  const ga = grams(a), gb = grams(b);
  let inter = 0; ga.forEach((g) => { if (gb.has(g)) inter++; });
  return (2 * inter) / (ga.size + gb.size);
}

async function search(keyword) {
  const r = await undiciFetch(`${API_BASE}/v0/search/subjects?limit=8&offset=0`, {
    method: "POST", headers,
    body: JSON.stringify({ keyword, sort: "match", filter: { type: [2], nsfw: false } }),
    signal: AbortSignal.timeout(8000), ...(dispatcher ? { dispatcher } : {}),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  return (j.data || []).filter((s) => typeof s.id === "number");
}

function cleanTitle(t) {
  return String(t).replace(/(第[一二三四五六七八九十0-9]+季.*|上半.*|下半.*|前篇.*|后篇.*)$/, "").replace(/[～~].*$/, "").trim();
}

const data = JSON.parse(readFileSync(DATA_FILE, "utf8"));
const targets = data.filter((a) => !a.bangumiId);
const report = [];

for (const rec of targets) {
  const win = seasonWindow(rec.season);
  let cands = [];
  for (const kw of [rec.title, cleanTitle(rec.title)]) {
    if (!kw) continue;
    try { cands = await search(kw); } catch (e) { cands = []; }
    if (cands.length) break;
  }
  const scored = cands.map((c) => {
    const date = VALID_DATE.test(c.date ?? "") ? c.date : "";
    const inWin = !!(win && date && date >= win[0] && date < win[1]);
    const s = Math.max(sim(rec.title, c.name_cn || ""), sim(rec.title, c.name || ""));
    let score = s + (inWin ? 0.6 : 0);
    // 播出日接近窗口边界外一点点也略加分
    return { id: c.id, name_cn: c.name_cn || "", name: c.name || "", date, sim: +s.toFixed(2), inWin, score: +score.toFixed(2) };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  let conf = "低";
  if (best) {
    if (best.sim >= 0.85 && best.inWin) conf = "高";
    else if (best.sim >= 0.85 || best.inWin) conf = "中";
    else if (best.sim >= 0.6) conf = "中";
  }
  report.push({ recordId: rec.id, title: rec.title, season: rec.season, conf, best, candidates: scored.slice(0, 4) });
}

writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

const order = { 高: 0, 中: 1, 低: 2 };
report.sort((a, b) => order[a.conf] - order[b.conf]);
console.log(`匹配完成 ${report.length} 条 → ${REPORT_FILE}\n`);
for (const r of report) {
  const b = r.best;
  const line = b ? `${b.name_cn || b.name} (${b.date}, id:${b.id}) sim:${b.sim} ${b.inWin ? "档期✓" : "档期✗"}` : "无候选";
  console.log(`[${r.conf}] ${r.title} [${r.season}]  →  ${line}`);
}
const cnt = { 高: 0, 中: 0, 低: 0 };
report.forEach((r) => cnt[r.conf]++);
console.log(`\n汇总: 高${cnt.高} 中${cnt.中} 低${cnt.低}`);
if (dispatcher) await dispatcher.close();
