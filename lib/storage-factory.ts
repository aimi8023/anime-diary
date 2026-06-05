import type { Storage } from "./storage";
import { jsonStorage } from "./storage-json";
import { kvStorage } from "./storage-kv";

function getStorage(): Storage {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return kvStorage;
  }
  return jsonStorage;
}

export const storage = getStorage();
