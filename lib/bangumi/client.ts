import { ProxyAgent, fetch as undiciFetch } from "undici";
import { mapSearchSubject, mapSubjectToPrefill } from "./mapper";
import type {
  BangumiPrefill,
  BangumiSearchResult,
  BangumiSubject,
  BangumiSubjectSummary,
} from "./types";

const API_BASE = "https://api.bgm.tv";
const TIMEOUT_MS = 8_000;
const LIST_TTL_MS = 10 * 60 * 1_000;
const DETAIL_TTL_MS = 60 * 60 * 1_000;

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const searchCache = new Map<string, CacheEntry<BangumiSearchResult[]>>();
const seasonListCache = new Map<string, CacheEntry<BangumiSearchResult[]>>();
const detailCache = new Map<number, CacheEntry<BangumiPrefill>>();

export class BangumiClientError extends Error {
  constructor(
    public readonly kind:
      | "timeout"
      | "rate_limit"
      | "not_found"
      | "upstream"
      | "invalid_response",
    message: string,
  ) {
    super(message);
    this.name = "BangumiClientError";
  }
}

function getCached<K, V>(
  cache: Map<K, CacheEntry<V>>,
  key: K,
): V | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

export function clearBangumiCacheForTests(): void {
  searchCache.clear();
  seasonListCache.clear();
  detailCache.clear();
  proxyDispatcher = undefined;
}

// 部分本地网络直连 Bangumi 会超时（DNS 污染），配置代理后改走代理；
// 生产环境通常不设置该变量，保持直连。
let proxyDispatcher: ProxyAgent | null | undefined;

function bangumiDispatcher(): ProxyAgent | undefined {
  if (proxyDispatcher === undefined) {
    const proxyUrl =
      process.env.BANGUMI_PROXY ||
      process.env.HTTPS_PROXY ||
      process.env.https_proxy;
    proxyDispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : null;
  }
  return proxyDispatcher ?? undefined;
}

function requestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": process.env.BANGUMI_USER_AGENT || "anime-diary/private",
  };

  if (process.env.BANGUMI_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.BANGUMI_ACCESS_TOKEN}`;
  }

  return headers;
}

function errorForStatus(status: number): BangumiClientError {
  if (status === 404) {
    return new BangumiClientError("not_found", "未找到 Bangumi 条目");
  }
  if (status === 429) {
    return new BangumiClientError(
      "rate_limit",
      "Bangumi 请求过于频繁，请稍后再试",
    );
  }
  return new BangumiClientError("upstream", "Bangumi 服务暂时不可用");
}

async function requestJson(url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    const dispatcher = bangumiDispatcher();
    response = dispatcher
      ? ((await undiciFetch(url, {
          ...(init as object),
          headers: requestHeaders(),
          signal: AbortSignal.timeout(TIMEOUT_MS),
          dispatcher,
        })) as unknown as Response)
      : await fetch(url, {
          ...init,
          headers: requestHeaders(),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      throw new BangumiClientError("timeout", "Bangumi 请求超时");
    }
    throw new BangumiClientError("upstream", "无法连接 Bangumi 服务");
  }

  if (!response.ok) {
    throw errorForStatus(response.status);
  }

  try {
    return await response.json();
  } catch {
    throw new BangumiClientError(
      "invalid_response",
      "Bangumi 返回了无法解析的数据",
    );
  }
}

function isSubjectSummary(value: unknown): value is BangumiSubjectSummary {
  if (!value || typeof value !== "object") return false;
  const subject = value as Record<string, unknown>;
  return (
    typeof subject.id === "number" &&
    subject.id > 0 &&
    typeof subject.name === "string"
  );
}

function isSubject(value: unknown): value is BangumiSubject {
  return isSubjectSummary(value);
}

function cloneSearchResults(
  results: BangumiSearchResult[],
): BangumiSearchResult[] {
  return results.map((result) => ({ ...result }));
}

function clonePrefill(prefill: BangumiPrefill): BangumiPrefill {
  return {
    ...prefill,
    suggestedTags: [...prefill.suggestedTags],
  };
}

export async function searchBangumiSubjects(
  keyword: string,
): Promise<BangumiSearchResult[]> {
  const trimmedKeyword = keyword.trim();
  const cacheKey = trimmedKeyword.toLocaleLowerCase();
  const cached = getCached(searchCache, cacheKey);
  if (cached) return cloneSearchResults(cached);

  const payload = await requestJson(
    `${API_BASE}/v0/search/subjects?limit=8&offset=0`,
    {
      method: "POST",
      body: JSON.stringify({
        keyword: trimmedKeyword,
        sort: "match",
        filter: { type: [2], nsfw: false },
      }),
    },
  );

  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray((payload as { data?: unknown }).data) ||
    !(payload as { data: unknown[] }).data.every(isSubjectSummary)
  ) {
    throw new BangumiClientError(
      "invalid_response",
      "Bangumi 搜索结果格式异常",
    );
  }

  const results = (payload as { data: BangumiSubjectSummary[] }).data
    .slice(0, 8)
    .map(mapSearchSubject);
  searchCache.set(cacheKey, {
    expiresAt: Date.now() + LIST_TTL_MS,
    value: cloneSearchResults(results),
  });
  return cloneSearchResults(results);
}

export type BroadcastSeason = "春" | "夏" | "秋" | "冬";

// 季度→播出日期区间：春=12/1/2 月（含上年 12 月）、夏=3–5 月、
// 秋=6–8 月、冬=9–11 月，与 seasonFromAirDate 的存储划分一致。
function seasonAirDateRange(
  year: number,
  season: BroadcastSeason,
): [string, string] {
  switch (season) {
    case "春":
      return [`>=${year - 1}-12-01`, `<${year}-03-01`];
    case "夏":
      return [`>=${year}-03-01`, `<${year}-06-01`];
    case "秋":
      return [`>=${year}-06-01`, `<${year}-09-01`];
    case "冬":
      return [`>=${year}-09-01`, `<${year}-12-01`];
  }
}

const SEASON_PAGE_SIZE = 20; // Bangumi 搜索接口单页上限 20，limit 传更大也会被钳制。
const SEASON_FETCH_LIMIT = 144; // 一季度最多拉取 144 部，前端按每页 24 部分页展示。

function subjectSummaryPage(payload: unknown): BangumiSubjectSummary[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray((payload as { data?: unknown }).data) ||
    !(payload as { data: unknown[] }).data.every(isSubjectSummary)
  ) {
    throw new BangumiClientError(
      "invalid_response",
      "Bangumi 季度列表格式异常",
    );
  }
  return (payload as { data: BangumiSubjectSummary[] }).data;
}

export async function listSeasonSubjects(
  year: number,
  season: BroadcastSeason,
): Promise<BangumiSearchResult[]> {
  const cacheKey = `${year}-${season}`;
  const cached = getCached(seasonListCache, cacheKey);
  if (cached) return cloneSearchResults(cached);

  const [gte, lt] = seasonAirDateRange(year, season);
  const body = JSON.stringify({
    keyword: "",
    sort: "heat",
    filter: { type: [2], nsfw: false, air_date: [gte, lt] },
  });

  const collected: BangumiSubjectSummary[] = [];
  while (collected.length < SEASON_FETCH_LIMIT) {
    const pageData = subjectSummaryPage(
      await requestJson(
        `${API_BASE}/v0/search/subjects?limit=${SEASON_PAGE_SIZE}&offset=${collected.length}`,
        { method: "POST", body },
      ),
    );
    collected.push(...pageData);
    if (pageData.length < SEASON_PAGE_SIZE) break;
  }

  const results = collected
    .slice(0, SEASON_FETCH_LIMIT)
    .map(mapSearchSubject);
  seasonListCache.set(cacheKey, {
    expiresAt: Date.now() + LIST_TTL_MS,
    value: cloneSearchResults(results),
  });
  return cloneSearchResults(results);
}

export async function getBangumiPrefill(
  id: number,
): Promise<BangumiPrefill> {
  const cached = getCached(detailCache, id);
  if (cached) return clonePrefill(cached);

  const payload = await requestJson(`${API_BASE}/v0/subjects/${id}`, {
    method: "GET",
  });

  if (!isSubject(payload)) {
    throw new BangumiClientError(
      "invalid_response",
      "Bangumi 条目格式异常",
    );
  }

  const prefill = mapSubjectToPrefill(payload);
  detailCache.set(id, {
    expiresAt: Date.now() + DETAIL_TTL_MS,
    value: clonePrefill(prefill),
  });
  return clonePrefill(prefill);
}
