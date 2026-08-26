import { createHash } from "crypto";
import { Redis } from "@upstash/redis";
import { resolveRedisConfig } from "@/lib/redis-config";

const WINDOW_SECONDS = 15 * 60;
const MAX_FAILURES = 5;

const CHECK_SCRIPT = `
local failures = tonumber(redis.call("GET", KEYS[1]) or "0")
local ttl = redis.call("TTL", KEYS[1])
if ttl < 0 then ttl = 0 end
return { failures, ttl }
`;

const RECORD_SCRIPT = `
local failures = redis.call("INCR", KEYS[1])
if failures == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
if ttl < 0 then ttl = tonumber(ARGV[1]) end
return { failures, ttl }
`;

export interface RateLimitState {
  failures: number;
  retryAfter: number;
  limited: boolean;
}

export interface LoginRateLimiter {
  check(key: string): Promise<RateLimitState>;
  recordFailure(key: string): Promise<RateLimitState>;
  reset(key: string): Promise<void>;
}

interface RedisRateLimitClient {
  eval(
    script: string,
    keys: string[],
    args: Array<string | number>,
  ): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
}

function state(failures: number, retryAfter: number): RateLimitState {
  return {
    failures,
    retryAfter,
    limited: failures >= MAX_FAILURES,
  };
}

function stateFromRedis(value: unknown): RateLimitState {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    !Number.isFinite(Number(value[0])) ||
    !Number.isFinite(Number(value[1]))
  ) {
    throw new Error("登录限流存储返回无效数据");
  }
  return state(
    Math.max(0, Number(value[0])),
    Math.max(0, Math.ceil(Number(value[1]))),
  );
}

export function loginClientKey(request: Request): string {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const identifier =
    forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  const digest = createHash("sha256")
    .update(identifier.slice(0, 256))
    .digest("hex")
    .slice(0, 32);
  return `anime:auth-rate:${digest}`;
}

export function createMemoryLoginRateLimiter(
  options: { now?: () => number } = {},
): LoginRateLimiter {
  const now = options.now ?? Date.now;
  const buckets = new Map<
    string,
    { failures: number; expiresAt: number }
  >();

  const activeBucket = (key: string) => {
    const bucket = buckets.get(key);
    if (bucket && bucket.expiresAt > now()) return bucket;
    if (bucket) buckets.delete(key);
    return undefined;
  };

  const bucketState = (
    bucket: { failures: number; expiresAt: number } | undefined,
  ) =>
    bucket
      ? state(
          bucket.failures,
          Math.max(0, Math.ceil((bucket.expiresAt - now()) / 1000)),
        )
      : state(0, 0);

  return {
    async check(key) {
      return bucketState(activeBucket(key));
    },
    async recordFailure(key) {
      const bucket = activeBucket(key) ?? {
        failures: 0,
        expiresAt: now() + WINDOW_SECONDS * 1000,
      };
      bucket.failures += 1;
      buckets.set(key, bucket);
      return bucketState(bucket);
    },
    async reset(key) {
      buckets.delete(key);
    },
  };
}

export function createRedisLoginRateLimiter(
  redis: RedisRateLimitClient,
): LoginRateLimiter {
  return {
    async check(key) {
      return stateFromRedis(await redis.eval(CHECK_SCRIPT, [key], []));
    },
    async recordFailure(key) {
      return stateFromRedis(
        await redis.eval(
          RECORD_SCRIPT,
          [key],
          [WINDOW_SECONDS],
        ),
      );
    },
    async reset(key) {
      await redis.del(key);
    },
  };
}

function configuredRedis(): RedisRateLimitClient | null {
  const config = resolveRedisConfig();
  if (!config) return null;
  return new Redis(config) as RedisRateLimitClient;
}

const redis = configuredRedis();
export const loginRateLimiter = redis
  ? createRedisLoginRateLimiter(redis)
  : createMemoryLoginRateLimiter();
