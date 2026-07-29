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
    // Get data - it might be a string or already parsed object
    const data = await redis.get<Anime[]>(ANIME_KEY);
    
    if (!data) return [];
    
    // If data is already an array, use it directly
    if (Array.isArray(data)) return data.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // If data is a string, parse it
    if (typeof data === 'string') {
      try {
        const list = JSON.parse(data) as Anime[];
        return list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } catch (e) {
        console.error('Failed to parse anime data:', e);
        return [];
      }
    }
    
    return [];
  },

  async findByBangumiId(bangumiId: number) {
    const redis = getRedis();
    const raw = await redis.get<Anime[]>(ANIME_KEY);

    let list: Anime[] = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (typeof raw === "string") {
      try {
        list = JSON.parse(raw);
      } catch (error) {
        console.error("Failed to parse existing data:", error);
      }
    }

    return list.find((anime) => anime.bangumiId === bangumiId) ?? null;
  },

  async add(anime: Anime) {
    const redis = getRedis();
    // Get existing data
    const data = await redis.get<Anime[]>(ANIME_KEY);
    
    let list: Anime[] = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (typeof data === 'string') {
      try {
        list = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse existing data:', e);
      }
    }
    
    list.push(anime);
    await redis.set(ANIME_KEY, list); // Pass object directly, not JSON.stringify
  },

  async update(id: string, data: Partial<AnimeInput>) {
    const redis = getRedis();
    const raw = await redis.get<Anime[]>(ANIME_KEY);
    
    let list: Anime[] = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (typeof raw === 'string') {
      try {
        list = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse existing data:', e);
      }
    }
    
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) throw new Error(`Anime with id ${id} not found`);
    list[index] = { ...list[index], ...data };
    await redis.set(ANIME_KEY, list);
  },

  async remove(id: string) {
    const redis = getRedis();
    const raw = await redis.get<Anime[]>(ANIME_KEY);
    
    let list: Anime[] = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (typeof raw === 'string') {
      try {
        list = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse existing data:', e);
      }
    }
    
    const filtered = list.filter((a) => a.id !== id);
    if (filtered.length === list.length)
      throw new Error(`Anime with id ${id} not found`);
    await redis.set(ANIME_KEY, filtered);
  },
};
