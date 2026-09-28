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
  /**
   * 作品集名称。同一作品的分季、上下半、剧场版等共用同一个值，
   * 从而在按季度浏览时保持独立条目，在标记与作品视图时归为一部作品。
   * 缺省表示该记录本身就是一部完整作品。2026-09 之后新增，旧记录可能缺失。
   */
  series?: string;
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
  series?: string;
  bangumiId?: number;
  bangumiUrl?: string;
  originalTitle?: string;
  airDate?: string;
}
