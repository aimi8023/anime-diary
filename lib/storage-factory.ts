import type { Storage } from "./storage";
import { jsonStorage } from "./storage-json";
import { kvStorage } from "./storage-kv";
import { resolveRedisEnv } from "./redis-config";

function getStorage(): Storage {
  const { url, token } = resolveRedisEnv();

  if (url && token) {
    return kvStorage;
  }

  // 地址存在但无法解析出 Token：生产环境回退到 JSON 几乎必然写失败，
  // 必须显式暴露，不允许静默降级。
  if (url) {
    console.error(
      "检测到 Redis 地址但未找到可用的访问 Token" +
        "（支持 UPSTASH_REDIS_REST_TOKEN、KV_REST_API_TOKEN、" +
        "或内嵌在 REDIS_URL 的 ?token=/rediss:// 密码）。" +
        "已回退到本地 JSON 存储，Vercel 等只读环境下数据将不可持久化。",
    );
  }

  return jsonStorage;
}

export const storage = getStorage();
