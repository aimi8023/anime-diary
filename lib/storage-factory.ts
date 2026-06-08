import type { Storage } from "./storage";
import { jsonStorage } from "./storage-json";
import { kvStorage } from "./storage-kv";

function getStorage(): Storage {
  // Support multiple environment variable naming conventions
  const redisUrl = 
    process.env.UPSTASH_REDIS_REST_URL || 
    process.env.KV_REST_API_URL || 
    process.env.REDIS_URL;
  
  const redisToken = 
    process.env.UPSTASH_REDIS_REST_TOKEN || 
    process.env.KV_REST_API_TOKEN;
  
  if (redisUrl && redisToken) {
    return kvStorage;
  }
  return jsonStorage;
}

export const storage = getStorage();
