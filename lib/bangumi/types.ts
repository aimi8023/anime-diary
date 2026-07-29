export interface BangumiImages {
  large?: string;
  common?: string;
  medium?: string;
}

export interface BangumiTag {
  name?: string;
  count?: number;
}

export interface BangumiSubjectSummary {
  id: number;
  name: string;
  name_cn?: string;
  date?: string;
  eps?: number;
  images?: BangumiImages | null;
}

export interface BangumiSubject extends BangumiSubjectSummary {
  tags?: BangumiTag[];
}

export interface BangumiSearchResult {
  bangumiId: number;
  bangumiUrl: string;
  title: string;
  originalTitle: string;
  cover: string;
  airDate: string;
  episodes: number;
  alreadyAdded?: boolean;
  localAnimeId?: string;
}

export interface BangumiPrefill {
  bangumiId: number;
  bangumiUrl: string;
  title: string;
  originalTitle: string;
  cover: string;
  airDate: string;
  season: string;
  episodes: number;
  suggestedTags: string[];
}
