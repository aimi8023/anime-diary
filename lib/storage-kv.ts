import { Redis } from "@upstash/redis";
import type { Anime, AnimeInput } from "./types";
import type { Storage } from "./storage";

const ANIME_KEY = "anime:all";

function getRedis(): Redis {
  // Support both naming conventions
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  
  if (!redisUrl) {
    throw new Error('REDIS_URL or UPSTASH_REDIS_REST_URL is not set');
  }
  
  // Try to extract token from URL if it contains ?token=xxx
  let token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!token && redisUrl.includes('?token=')) {
    const urlParts = redisUrl.split('?token=');
    if (urlParts.length > 1) {
      token = urlParts[1];
    }
  }
  
  if (!token) {
    throw new Error('UPSTASH_REDIS_REST_TOKEN is not set. Please add it to environment variables.');
  }
  
  // Use base URL without token parameter if token is extracted
  const baseUrl = redisUrl.includes('?token=') 
    ? redisUrl.split('?token=')[0] 
    : redisUrl;
  
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
