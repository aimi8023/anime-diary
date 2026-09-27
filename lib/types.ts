export interface Anime {
  id: string;
  title: string;
  season: string;
  cover: string;
  rating: number;
  comment: string;
  episodes: number;
  tags: string[];
  /** 内置标记，取值见 lib/anime/marks.ts；2026-09 之后新增，旧记录可能缺失。 */
  marks?: string[];
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
  marks?: string[];
  bangumiId?: number;
  bangumiUrl?: string;
  originalTitle?: string;
  airDate?: string;
}
