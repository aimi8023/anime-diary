import type { Storage } from "./storage";
import { jsonStorage } from "./storage-json";
import { kvStorage } from "./storage-kv";

function getStorage(): Storage {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return kvStorage;
  }
  return jsonStorage;
}

export const storage = getStorage();
