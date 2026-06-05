import fs from "fs/promises";
import path from "path";
import type { Anime, AnimeInput } from "./types";
import type { Storage } from "./storage";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "anime.json");

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

async function readAll(): Promise<Anime[]> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  return JSON.parse(raw) as Anime[];
}

async function writeAll(animeList: Anime[]): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(animeList, null, 2), "utf-8");
}

export const jsonStorage: Storage = {
  async getAll() {
    const list = await readAll();
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async add(anime: Anime) {
    const list = await readAll();
    list.push(anime);
    await writeAll(list);
  },

  async update(id: string, data: Partial<AnimeInput>) {
    const list = await readAll();
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) throw new Error(`Anime with id ${id} not found`);
    list[index] = { ...list[index], ...data };
    await writeAll(list);
  },

  async remove(id: string) {
    const list = await readAll();
    const filtered = list.filter((a) => a.id !== id);
    if (filtered.length === list.length)
      throw new Error(`Anime with id ${id} not found`);
    await writeAll(filtered);
  },
};
