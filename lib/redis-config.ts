export interface RedisConfig {
  /** HTTPS 形式的 REST 基础地址。 */
  url: string;
  token: string;
}

export interface ResolvedRedisEnv {
  url: string | null;
  token: string | null;
}

type EnvSource = Record<string, string | undefined>;

/**
 * 解析所有被支持的 Redis 环境变量命名约定：
 * - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`；
 * - `KV_REST_API_URL` / `KV_REST_API_TOKEN`；
 * - 兼容 `REDIS_URL`，允许把 Token 内嵌在 `?token=` 查询参数或
 *   `rediss://user:password@host` 中。
 *
 * 返回值不抛错：`url` 为 null 表示完全未配置；`url` 存在而 `token`
 * 为 null 表示配置不完整，调用方据此决定回退或报错。
 */
export function resolveRedisEnv(env: EnvSource = process.env): ResolvedRedisEnv {
  const rawUrl =
    env.UPSTASH_REDIS_REST_URL ||
    env.KV_REST_API_URL ||
    env.REDIS_URL ||
    null;
  if (!rawUrl) return { url: null, token: null };

  let url = rawUrl;
  let token =
    env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || null;

  if (!token && url.includes("?token=")) {
    const [baseUrl, embedded = ""] = url.split("?token=");
    token = embedded || null;
    url = baseUrl;
  }

  if (!token && url.startsWith("rediss://")) {
    token = url.match(/rediss:\/\/[^:]+:([^@]+)@/)?.[1] ?? null;
    const host = url.match(/rediss:\/\/[^@]+@([^:]+)/)?.[1];
    if (!host) return { url: null, token: null };
    url = `https://${host}`;
  }

  return { url, token };
}

/**
 * 返回可直接用于 `new Redis({ url, token })` 的配置；
 * 未配置或缺少 Token 时返回 null。
 */
export function resolveRedisConfig(
  env: EnvSource = process.env,
): RedisConfig | null {
  const { url, token } = resolveRedisEnv(env);
  if (!url || !token) return null;
  return { url, token };
}
