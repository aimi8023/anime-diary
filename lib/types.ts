export interface Anime {
  id: string;
  title: string;
  season: string;
  cover: string;
  rating: number;
  comment: string;
  episodes: number;
  tags: string[];
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
}
