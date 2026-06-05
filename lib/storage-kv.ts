import { Redis } from "@upstash/redis";
import type { Anime, AnimeInput } from "./types";
import type { Storage } from "./storage";

const ANIME_KEY = "anime:all";

function getRedis(): Redis {
  return new Redis({
    url: process.env.STORAGE_REDIS_REST_URL!,
    token: process.env.STORAGE_REDIS_REST_TOKEN!,
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
