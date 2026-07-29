import type { Anime, AnimeInput } from "./types";

export interface Storage {
  getAll(): Promise<Anime[]>;
  findByBangumiId(bangumiId: number): Promise<Anime | null>;
  add(anime: Anime): Promise<void>;
  update(id: string, data: Partial<AnimeInput>): Promise<void>;
  remove(id: string): Promise<void>;
}
