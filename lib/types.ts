export type AnimeStatus = "想看" | "在看" | "看完" | "弃番";

export interface Anime {
  id: string;
  title: string;
  season: string;
  cover: string;
  rating: number;
  status: AnimeStatus;
  comment: string;
  episodes: number;
  createdAt: string;
}

export interface AnimeInput {
  title: string;
  season: string;
  cover: string;
  rating: number;
  status: AnimeStatus;
  comment: string;
  episodes: number;
}
