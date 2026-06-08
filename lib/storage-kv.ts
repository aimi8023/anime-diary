import { Redis } from "@upstash/redis";
import type { Anime, AnimeInput } from "./types";
import type { Storage } from "./storage";

const ANIME_KEY = "anime:all";

function getRedis(): Redis {
  // Support multiple environment variable naming conventions
  const redisUrl = 
    process.env.UPSTASH_REDIS_REST_URL || 
    process.env.KV_REST_API_URL || 
    process.env.REDIS_URL;
  
  if (!redisUrl) {
    throw new Error('REDIS_URL, KV_REST_API_URL, or UPSTASH_REDIS_REST_URL is not set');
  }
  
  // Try to extract token from URL if it contains ?token=xxx
  let token = 
    process.env.UPSTASH_REDIS_REST_TOKEN || 
    process.env.KV_REST_API_TOKEN;
  
  if (!token && redisUrl.includes('?token=')) {
    const urlParts = redisUrl.split('?token=');
    if (urlParts.length > 1) {
      token = urlParts[1];
    }
  }
  
  // For rediss:// protocol URLs, extract token from the URL
  if (!token && redisUrl.startsWith('rediss://')) {
    const match = redisUrl.match(/rediss:\/\/[^:]+:([^@]+)@/);
    if (match && match[1]) {
      token = match[1];
    }
  }
  
  if (!token) {
    throw new Error('UPSTASH_REDIS_REST_TOKEN, KV_REST_API_TOKEN, or token in REDIS_URL is not set');
  }
  
  // Convert rediss:// URL to https:// REST API URL if needed
  let baseUrl = redisUrl;
  if (redisUrl.startsWith('rediss://')) {
    // Extract host from rediss://default:token@host:6379
    const hostMatch = redisUrl.match(/rediss:\/\/[^@]+@([^:]+)/);
    if (hostMatch && hostMatch[1]) {
      baseUrl = `https://${hostMatch[1]}`;
    }
  } else if (redisUrl.includes('?token=')) {
    // Remove token parameter from URL
    baseUrl = redisUrl.split('?token=')[0];
  }
  
  return new Redis({
    url: baseUrl,
    token: token,
  });
}

export const kvStorage: Storage = {
  async getAll() {
    const redis = getRedis();
    const data = await redis.get<string>(ANIME_KEY);
    if (!data) return [];
    const list = JSON.parse(data) as Anime[];
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async add(anime: Anime) {
    const redis = getRedis();
    const data = await redis.get<string>(ANIME_KEY);
    const list: Anime[] = data ? JSON.parse(data) : [];
    list.push(anime);
    await redis.set(ANIME_KEY, JSON.stringify(list));
  },

  async update(id: string, data: Partial<AnimeInput>) {
    const redis = getRedis();
    const raw = await redis.get<string>(ANIME_KEY);
    const list: Anime[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) throw new Error(`Anime with id ${id} not found`);
    list[index] = { ...list[index], ...data };
    await redis.set(ANIME_KEY, JSON.stringify(list));
  },

  async remove(id: string) {
    const redis = getRedis();
    const raw = await redis.get<string>(ANIME_KEY);
    const list: Anime[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((a) => a.id !== id);
    if (filtered.length === list.length)
      throw new Error(`Anime with id ${id} not found`);
    await redis.set(ANIME_KEY, JSON.stringify(filtered));
  },
};
