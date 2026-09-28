// 本地辅助脚本：拉取某季并生成一个带封面的 HTML 画廊，方便看图挑选。
// 用法: node scripts/season-gallery.mjs 2000 春 [--out scripts/season.html] [--proxy URL]
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

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
let out = `scripts/season-${year}${season}.html`;
let proxyUrl = process.env.BANGUMI_PROXY || "http://127.0.0.1:7897";
for (let i = 2; i < args.length; i++) {
  if (args[i] === "--out") out = args[++i];
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
const body = JSON.stringify({ keyword: "", sort: "heat", filter: { type: [2], nsfw: false, air_date: [gte, lt] } });

async function req(url) {
  const r = await undiciFetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(8000), ...(dispatcher ? { dispatcher } : {}) });
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

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// 读取本地已收录记录，用于给画廊卡片打“已收”角标（bangumiId + 归一化标题双重匹配）
const DATA_FILE = path.join(process.cwd(), "data", "anime.json");
const norm = (t) => String(t || "").trim().toLowerCase().replace(/[\s・·:：!！?？~〜\-—_()（）\[\]【]'’‘"”“。.,、]/g, "");
const ownedIds = new Set();
const ownedTitles = new Set();
if (existsSync(DATA_FILE)) {
  try {
    for (const a of JSON.parse(readFileSync(DATA_FILE, "utf8"))) {
      if (a.bangumiId) ownedIds.add(a.bangumiId);
      if (a.title) ownedTitles.add(norm(a.title));
      if (a.originalTitle) ownedTitles.add(norm(a.originalTitle));
    }
  } catch { /* 忽略 */ }
}

const cells = collected.map((s, i) => {
  const img = (s.images && (s.images.common || s.images.large || s.images.medium)) || "";
  const cn = s.name_cn || "(无中文名)";
  const date = (s.date || "").slice(0, 10);
  const owned = ownedIds.has(s.id) || ownedTitles.has(norm(s.name_cn)) || ownedTitles.has(norm(s.name));
  return `<figure class="card${owned ? " owned" : ""}" data-num="${i + 1}" data-owned="${owned ? 1 : 0}" tabindex="0" role="checkbox" aria-checked="false">
  <div class="num">${i + 1}</div>
  ${owned ? `<div class="owned-badge">已收</div>` : ""}
  <div class="check">✓</div>
  <div class="imgbox">${img ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(img)}" alt="">` : `<div class="noimg">无封面</div>`}</div>
  <figcaption><div class="cn">${esc(cn)}</div><div class="jp">${esc(s.name)}</div><div class="meta">${esc(date)} · id:${s.id}</div></figcaption>
</figure>`;
}).join("\n");

const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${year}${season} 番剧画廊</title>
<style>
:root{color-scheme:light}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,"Microsoft YaHei",sans-serif;background:#f5f6fa;color:#1c1c28;padding:20px}
h1{font-size:20px;margin:0 0 4px}
.sub{color:#666;font-size:13px;margin-bottom:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px;padding-bottom:90px}
.card{position:relative;margin:0;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1);cursor:pointer;transition:transform .12s,box-shadow .12s;outline:3px solid transparent}
.card:hover{transform:translateY(-3px);box-shadow:0 6px 16px rgba(0,0,0,.18)}
.card:focus-visible{outline:3px solid #4aa3ff}
.card.sel{outline:3px solid #ff6b9d;box-shadow:0 6px 18px rgba(255,107,157,.4)}
.num{position:absolute;top:8px;left:8px;z-index:2;background:#ff6b9d;color:#fff;font-weight:700;font-size:14px;min-width:26px;height:26px;border-radius:13px;display:flex;align-items:center;justify-content:center;padding:0 7px;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.check{position:absolute;top:8px;right:8px;z-index:2;width:26px;height:26px;border-radius:50%;background:#fff;border:2px solid #ccc;color:transparent;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center}
.card.sel .check{background:#ff6b9d;border-color:#ff6b9d;color:#fff}
.card.owned .imgbox{opacity:.55}
.card.owned{background:#f3f4f8}
.owned-badge{position:absolute;bottom:70px;left:8px;z-index:2;background:#2e7d5b;color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.grid.hide-owned .card.owned{display:none}
.imgbox{aspect-ratio:2/3;background:#eceef3;display:flex;align-items:center;justify-content:center}
.imgbox img{width:100%;height:100%;object-fit:cover;display:block}
.noimg{color:#aaa;font-size:13px}
figcaption{padding:8px 10px 12px}
.cn{font-size:13px;font-weight:600;line-height:1.3}
.jp{font-size:11px;color:#888;line-height:1.3;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.meta{font-size:11px;color:#aab;margin-top:4px}
.bar{position:fixed;left:0;right:0;bottom:0;z-index:10;background:rgba(255,255,255,.95);backdrop-filter:blur(8px);border-top:1px solid #e3e5ee;box-shadow:0 -2px 12px rgba(0,0,0,.08);padding:10px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.bar .cnt{font-weight:700;color:#ff6b9d;white-space:nowrap}
.bar input{flex:1;min-width:180px;font-size:14px;padding:7px 10px;border:1px solid #ccd;border-radius:8px;background:#f7f8fc;color:#1c1c28}
.bar button{font-size:14px;font-weight:600;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}
.btn-copy{background:#ff6b9d;color:#fff}
.btn-clear{background:#eceef3;color:#555}
.bar .hint{font-size:12px;color:#99a;width:100%}
</style></head><body>
<h1>${year}${season} 番剧画廊</h1>
<div class="sub">播出区间 ${gte.slice(1)} 起 · 按热度排序 · 共 ${collected.length} 部 · 其中 <b id="ownedn">0</b> 部已收录(绿色"已收"角标) · 序号与对话列表一致</div>
<div class="grid" id="grid">
${cells}
</div>
<div class="bar">
  <span class="cnt">已选 <span id="count">0</span> 部</span>
  <input id="out" readonly placeholder="点上面的封面选择，序号会出现在这里" />
  <button class="btn-copy" id="copy">复制序号</button>
  <button class="btn-clear" id="clear">清空</button>
  <button class="btn-clear" id="toggleOwned">隐藏已收</button>
  <span class="hint">复制后粘给助手即可，例如 3,7,12。也可以直接手动选中输入框里的文字复制。</span>
</div>
<script>
const grid=document.getElementById('grid');
const cards=[...document.querySelectorAll('.card')];
document.getElementById('ownedn').textContent=cards.filter(c=>c.dataset.owned==='1').length;
const out=document.getElementById('out');
const countEl=document.getElementById('count');
function refresh(){
  const nums=cards.filter(c=>c.classList.contains('sel')).map(c=>c.dataset.num);
  out.value=nums.join(',');
  countEl.textContent=nums.length;
}
function toggle(c){c.classList.toggle('sel');c.setAttribute('aria-checked',c.classList.contains('sel'));refresh();}
cards.forEach(c=>{
  c.addEventListener('click',()=>toggle(c));
  c.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();toggle(c);}});
});
document.getElementById('clear').addEventListener('click',()=>{cards.forEach(c=>{c.classList.remove('sel');c.setAttribute('aria-checked','false')});refresh();});
document.getElementById('toggleOwned').addEventListener('click',(e)=>{const on=grid.classList.toggle('hide-owned');e.target.textContent=on?'显示已收':'隐藏已收';});
document.getElementById('copy').addEventListener('click',async()=>{
  const text=out.value;
  if(!text){return;}
  try{await navigator.clipboard.writeText(text);}
  catch(e){out.removeAttribute('readonly');out.select();try{document.execCommand('copy');}catch(_){}out.setAttribute('readonly','');}
  const b=document.getElementById('copy');const t=b.textContent;b.textContent='已复制 ✓';setTimeout(()=>b.textContent=t,1200);
});
</script>
</body></html>`;

writeFileSync(out, html, "utf8");
console.log(`已生成: ${out} (${collected.length} 部)\n`);
collected.forEach((s, i) => {
  const cn = s.name_cn || "(无中文名)";
  const date = (s.date || "").slice(0, 10);
  console.log(`${String(i + 1).padStart(3, " ")}. [id:${s.id}] ${cn} / ${s.name} · ${date}`);
});
if (dispatcher) await dispatcher.close();
