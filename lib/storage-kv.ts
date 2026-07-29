import { Redis } from "@upstash/redis";
import type {
  AnimeState,
  BackupMetadata,
  BackupSnapshot,
} from "./backups/types";
import type {
  CommitInput,
  CommitResult,
  VersionedStorageAdapter,
} from "./storage";
import { createVersionedStorage } from "./storage-core";

const STATE_KEY = "anime:state";
const LEGACY_ANIME_KEY = "anime:all";
const BACKUP_INDEX_KEY = "anime:backups";
const BACKUP_METADATA_KEY = "anime:backup:metadata";
const BACKUP_PREFIX = "anime:backup:";
const SAFE_BACKUP_ID = /^[A-Za-z0-9_-]+$/;

const COMMIT_SCRIPT = `
local state_raw = redis.call("GET", KEYS[1])
local current

if state_raw then
  current = cjson.decode(state_raw)
else
  local legacy_raw = redis.call("GET", KEYS[2])
  local legacy_data = {}
  if legacy_raw then
    legacy_data = cjson.decode(legacy_raw)
  end
  current = { revision = 0, data = legacy_data }
end

if tonumber(current.revision) ~= tonumber(ARGV[1]) then
  return cjson.encode({ committed = false })
end

local metadata = cjson.decode(ARGV[3])

redis.call("SET", KEYS[5], ARGV[5])
redis.call("HSET", KEYS[4], metadata.id, ARGV[3])
redis.call("ZADD", KEYS[3], ARGV[4], metadata.id)
redis.call("SET", KEYS[1], ARGV[2])

local next_state = cjson.decode(ARGV[2])
return cjson.encode({
  committed = true,
  revision = next_state.revision
})
`;

const PRUNE_SCRIPT = `
local keep = tonumber(ARGV[1])
local total = redis.call("ZCARD", KEYS[1])
local remove_count = total - keep

if remove_count <= 0 then
  return 0
end

local ids = redis.call("ZRANGE", KEYS[1], 0, remove_count - 1)
for _, id in ipairs(ids) do
  redis.call("DEL", ARGV[2] .. id)
  redis.call("HDEL", KEYS[2], id)
  redis.call("ZREM", KEYS[1], id)
end

return #ids
`;

function getRedis(): Redis {
  const redisUrl =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error(
      "REDIS_URL, KV_REST_API_URL, or UPSTASH_REDIS_REST_URL is not set",
    );
  }

  let token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;

  if (!token && redisUrl.includes("?token=")) {
    token = redisUrl.split("?token=")[1];
  }

  if (!token && redisUrl.startsWith("rediss://")) {
    const match = redisUrl.match(/rediss:\/\/[^:]+:([^@]+)@/);
    if (match?.[1]) token = match[1];
  }

  if (!token) {
    throw new Error(
      "UPSTASH_REDIS_REST_TOKEN, KV_REST_API_TOKEN, or token in REDIS_URL is not set",
    );
  }

  let baseUrl = redisUrl;
  if (redisUrl.startsWith("rediss://")) {
    const hostMatch = redisUrl.match(/rediss:\/\/[^@]+@([^:]+)/);
    if (hostMatch?.[1]) baseUrl = `https://${hostMatch[1]}`;
  } else if (redisUrl.includes("?token=")) {
    baseUrl = redisUrl.split("?token=")[0];
  }

  return new Redis({ url: baseUrl, token });
}

function parseStored(value: unknown, label: string): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label}损坏`, { cause: error });
  }
}

function parseState(value: unknown): AnimeState {
  const parsed = parseStored(value, "Redis 当前数据");
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Number.isInteger((parsed as { revision?: unknown }).revision) ||
    Number((parsed as { revision: number }).revision) < 0 ||
    !Array.isArray((parsed as { data?: unknown }).data)
  ) {
    throw new Error("Redis 当前数据损坏");
  }
  return structuredClone(parsed) as AnimeState;
}

function parseLegacy(value: unknown): AnimeState {
  if (value === null) return { revision: 0, data: [] };
  const parsed = parseStored(value, "Redis 旧版数据");
  if (!Array.isArray(parsed)) {
    throw new Error("Redis 旧版数据损坏");
  }
  return { revision: 0, data: structuredClone(parsed) };
}

function parseCommitResult(value: unknown): { committed: boolean; revision?: number } {
  const parsed = parseStored(value, "Redis 写入结果");
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { committed?: unknown }).committed !== "boolean"
  ) {
    throw new Error("Redis 写入结果损坏");
  }
  return parsed as { committed: boolean; revision?: number };
}

function parseMetadata(value: unknown): BackupMetadata | null {
  if (value === null) return null;
  const parsed = parseStored(value, "Redis 备份元数据");
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { id?: unknown }).id !== "string" ||
    typeof (parsed as { createdAt?: unknown }).createdAt !== "string" ||
    typeof (parsed as { reason?: unknown }).reason !== "string" ||
    typeof (parsed as { recordCount?: unknown }).recordCount !== "number" ||
    (parsed as { schemaVersion?: unknown }).schemaVersion !== 1
  ) {
    throw new Error("Redis 备份元数据损坏");
  }
  return structuredClone(parsed) as BackupMetadata;
}

function parseSnapshot(value: unknown): BackupSnapshot | null {
  if (value === null) return null;
  const parsed = parseStored(value, "Redis 备份数据");
  const metadata = parseMetadata(parsed);
  if (
    !metadata ||
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { data?: unknown }).data)
  ) {
    throw new Error("Redis 备份数据损坏");
  }
  return structuredClone(parsed) as BackupSnapshot;
}

class RedisStorageAdapter implements VersionedStorageAdapter {
  constructor(private readonly redis: Redis) {}

  async readState(): Promise<AnimeState> {
    const state = await this.redis.get<unknown>(STATE_KEY);
    if (state !== null) return parseState(state);
    return parseLegacy(await this.redis.get<unknown>(LEGACY_ANIME_KEY));
  }

  async commit(input: CommitInput): Promise<CommitResult> {
    const nextState: AnimeState = {
      revision: input.expectedRevision + 1,
      data: structuredClone(input.nextData),
    };
    const snapshot: BackupSnapshot = {
      ...input.snapshot,
      data: structuredClone(input.previousData),
    };
    const result = parseCommitResult(
      await this.redis.eval(
        COMMIT_SCRIPT,
        [
          STATE_KEY,
          LEGACY_ANIME_KEY,
          BACKUP_INDEX_KEY,
          BACKUP_METADATA_KEY,
          `${BACKUP_PREFIX}${input.snapshot.id}`,
        ],
        [
          String(input.expectedRevision),
          JSON.stringify(nextState),
          JSON.stringify(input.snapshot),
          String(Date.parse(input.snapshot.createdAt)),
          JSON.stringify(snapshot),
        ],
      ),
    );

    if (!result.committed) return { committed: false };
    if (result.revision !== nextState.revision) {
      throw new Error("Redis 写入版本不一致");
    }
    return { committed: true, state: nextState };
  }

  async listBackups(): Promise<BackupMetadata[]> {
    const ids = await this.redis.zrange<string[]>(
      BACKUP_INDEX_KEY,
      0,
      -1,
      { rev: true },
    );
    const metadata = await Promise.all(
      ids.map((id) =>
        this.redis
          .hget<unknown>(BACKUP_METADATA_KEY, id)
          .then(parseMetadata),
      ),
    );
    return metadata.filter(
      (item): item is BackupMetadata => item !== null,
    );
  }

  async getBackup(id: string): Promise<BackupSnapshot | null> {
    if (!SAFE_BACKUP_ID.test(id)) return null;
    return parseSnapshot(
      await this.redis.get<unknown>(`${BACKUP_PREFIX}${id}`),
    );
  }

  async prune(keep: number): Promise<void> {
    await this.redis.eval(
      PRUNE_SCRIPT,
      [BACKUP_INDEX_KEY, BACKUP_METADATA_KEY],
      [String(keep), BACKUP_PREFIX],
    );
  }
}

export function createKvStorage(redis: Redis) {
  return createVersionedStorage(new RedisStorageAdapter(redis));
}

let singleton: ReturnType<typeof createKvStorage> | null = null;

export const kvStorage = new Proxy(
  {},
  {
    get(_target, property) {
      singleton ??= createKvStorage(getRedis());
      const value = singleton[property as keyof typeof singleton];
      return typeof value === "function" ? value.bind(singleton) : value;
    },
  },
) as ReturnType<typeof createKvStorage>;
