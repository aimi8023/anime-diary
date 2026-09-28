// 本地辅助脚本：按项目约定拉取某年某季的 Bangumi 放送列表。
// 用法: node scripts/fetch-season.mjs 2000 春 [--limit 40] [--proxy http://127.0.0.1:7897]
// 与 lib/bangumi/client.ts 的 listSeasonSubjects 保持完全相同的参数。
import { ProxyAgent, fetch as undiciFetch } from "undici";

const API_BASE = "https://api.bgm.tv";
const PAGE_SIZE = 20;
const FETCH_LIMIT = 144;

function seasonAirDateRange(year, season) {
  switch (season) {
    case "春": return [`>=${year - 1}-12-01`, `<${year}-03-01`];
    case "夏": return [`>=${year}-03-01`, `<${year}-06-01`];
    case "秋": return [`>=${year}-06-01`, `<${year}-09-01`];
    case "冬": return [`>=${year}-09-01`, `<${year}-12-01`];
    default: throw new Error("季度必须是 春/夏/秋/冬");
  }
}

const args = process.argv.slice(2);
const year = Number(args[0]);
const season = args[1];
if (!Number.isInteger(year) || !season) {
  console.error("用法: node scripts/fetch-season.mjs <年份> <春|夏|秋|冬> [--limit N] [--proxy URL]");
  process.exit(1);
}
let showLimit = FETCH_LIMIT;
let proxyUrl = process.env.BANGUMI_PROXY || "http://127.0.0.1:7897";
for (let i = 2; i < args.length; i++) {
  if (args[i] === "--limit") showLimit = Number(args[++i]);
  if (args[i] === "--proxy") proxyUrl = args[++i];
}

const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent": process.env.BANGUMI_USER_AGENT || "anime-diary/private",
};
if (process.env.BANGUMI_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.BANGUMI_ACCESS_TOKEN}`;

const [gte, lt] = seasonAirDateRange(year, season);
const body = JSON.stringify({
  keyword: "",
  sort: "heat",
  filter: { type: [2], nsfw: false, air_date: [gte, lt] },
});

async function req(url) {
  const r = await undiciFetch(url, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(8000),
    ...(dispatcher ? { dispatcher } : {}),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const collected = [];
while (collected.length < FETCH_LIMIT) {
  const page = await req(`${API_BASE}/v0/search/subjects?limit=${PAGE_SIZE}&offset=${collected.length}`);
  const data = page.data || [];
  collected.push(...data);
  if (data.length < PAGE_SIZE) break;
}

const rows = collected.slice(0, showLimit);
console.log(`# ${year}${season} (${gte.slice(1)} ~ ) 共拉到 ${collected.length} 部, 显示 ${rows.length} 部\n`);
rows.forEach((s, i) => {
  const cn = s.name_cn || "";
  const date = (s.date || "").slice(0, 10);
  console.log(`${String(i + 1).padStart(3, " ")}. [id:${s.id}] ${cn || "(无中文名)"}  /  ${s.name}  ·  ${date}`);
});

if (dispatcher) await dispatcher.close();
