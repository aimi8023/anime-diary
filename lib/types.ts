export interface Anime {
  id: string;
  title: string;
  season: string;
  cover: string;
  rating: number;
  comment: string;
  episodes: number;
  tags: string[];
  bangumiId?: number;
  bangumiUrl?: string;
  originalTitle?: string;
  airDate?: string;
  createdAt: string;
}

export interface AnimeInput {
  title: string;
  season: string;
  cover: string;
  rating: number;
  comment: string;
  episodes: number;
  tags: string[];
  bangumiId?: number;
  bangumiUrl?: string;
  originalTitle?: string;
  airDate?: string;
}
