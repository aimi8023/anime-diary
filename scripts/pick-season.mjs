// 拉取某年某季的 Bangumi 放送列表，标注已入库与可自动归集的作品集，
// 输出一份便于挑选的清单。用法: node scripts/pick-season.mjs 2024 春 [--limit 80]
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { readFileSync, writeFileSync } from "node:fs";
import { suggestSeries } from "../lib/anime/series-match.ts";

const API_BASE = "https://api.bgm.tv";
const PAGE_SIZE = 20;
const FETCH_LIMIT = 160;

const RANGE = {
  春: (y) => [`>=${y - 1}-12-01`, `<${y}-03-01`],
  夏: (y) => [`>=${y}-03-01`, `<${y}-06-01`],
  秋: (y) => [`>=${y}-06-01`, `<${y}-09-01`],
  冬: (y) => [`>=${y}-09-01`, `<${y}-12-01`],
};

const args = process.argv.slice(2);
const year = Number(args[0]);
const season = args[1];
if (!Number.isInteger(year) || !RANGE[season]) {
  console.error("用法: node scripts/pick-season.mjs <年份> <春|夏|秋|冬> [--limit N]");
  process.exit(1);
}
let showLimit = 80;
for (let i = 2; i < args.length; i++) if (args[i] === "--limit") showLimit = Number(args[++i]);

const archive = JSON.parse(readFileSync("data/anime.json", "utf8"));
const inBgm = new Set(archive.map((a) => a.bangumiId).filter(Boolean));
const seriesNames = [...new Set(archive.map((a) => a.series?.trim()).filter(Boolean))]
  .map((name) => ({ name, memberCount: 1 }));

const proxyUrl = process.env.BANGUMI_PROXY || "http://127.0.0.1:7897";
const dispatcher = new ProxyAgent(proxyUrl);
const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent": process.env.BANGUMI_USER_AGENT || "anime-diary/private",
};
if (process.env.BANGUMI_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.BANGUMI_ACCESS_TOKEN}`;

const [gte, lt] = RANGE[season](year);
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
    dispatcher,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const collected = [];
while (collected.length < FETCH_LIMIT) {
  const page = await req(
    `${API_BASE}/v0/search/subjects?limit=${PAGE_SIZE}&offset=${collected.length}`,
  );
  const data = page.data || [];
  collected.push(...data);
  if (data.length < PAGE_SIZE) break;
}

const rows = collected.slice(0, showLimit);
const added = rows.filter((s) => inBgm.has(s.id)).length;
const guessable = rows.filter(
  (s) => !inBgm.has(s.id) && suggestSeries(s.name_cn || s.name, seriesNames).length > 0,
).length;

console.log(`# ${year}${season}　档期 ${gte.slice(1)} 起　共 ${collected.length} 部`);
console.log(`# 其中已在库 ${added} 部 · 可归入已有作品 ${guessable} 部 · 可挑选 ${rows.length - added} 部\n`);

rows.forEach((s, i) => {
  const title = (s.name_cn || "").trim() || "(无中文名)";
  const isIn = inBgm.has(s.id);
  const guess = isIn ? null : suggestSeries(title, seriesNames)[0];
  const tags = [
    isIn ? "已入库" : "新",
    guess ? `可归《${guess.series}》` : "",
    `${s.date || "?"}  ${s.eps ? s.eps + "话" : ""}`,
  ].filter(Boolean);
  console.log(
    `${String(i + 1).padStart(3, " ")}. [${String(s.id).padStart(6)}] ${title}  ·  ${tags.join(" · ")}`,
  );
});

writeFileSync(
  `scripts/season-${year}${season}.json`,
  JSON.stringify(
    rows.map((s) => ({
      bangumiId: s.id,
      title: (s.name_cn || s.name).trim(),
      date: s.date || "",
      alreadyIn: inBgm.has(s.id),
      suggestSeries: inBgm.has(s.id)
        ? null
        : (suggestSeries(s.name_cn || s.name, seriesNames)[0]?.series ?? null),
    })),
    null,
    2,
  ),
  "utf8",
);
console.log(`\n已写入 scripts/season-${year}${season}.json`);
await dispatcher.close();
