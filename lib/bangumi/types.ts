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
  /** 全尺寸封面（large），入库保存用。 */
  cover: string;
  /** 压缩缩略图（common/medium），小图展示用，减少下载与解码开销。 */
  coverThumb: string;
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
