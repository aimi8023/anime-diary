import { NextResponse } from "next/server";
import {
  BangumiClientError,
  listSeasonSubjects,
  type BroadcastSeason,
} from "@/lib/bangumi/client";
import { storage } from "@/lib/storage-factory";

const SEASONS: readonly BroadcastSeason[] = ["春", "夏", "秋", "冬"];

function upstreamErrorResponse(error: unknown) {
  if (error instanceof BangumiClientError) {
    const status = {
      timeout: 504,
      rate_limit: 503,
      not_found: 404,
      upstream: 502,
      invalid_response: 502,
    }[error.kind];
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json(
    { error: "Bangumi 服务暂时不可用" },
    { status: 502 },
  );
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const year = Number(params.get("year"));
  const season = params.get("season") as BroadcastSeason | null;

  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return NextResponse.json({ error: "请输入 1900–2100 之间的年份" }, { status: 400 });
  }
  if (!season || !SEASONS.includes(season)) {
    return NextResponse.json({ error: "请选择春/夏/秋/冬季度" }, { status: 400 });
  }

  try {
    const results = await listSeasonSubjects(year, season);
    // 只读一次本站数据，在内存内完成重复检测。
    const { data } = await storage.getState();
    const localIdByBangumiId = new Map<number, string>();
    for (const anime of data) {
      if (
        anime.bangumiId !== undefined &&
        !localIdByBangumiId.has(anime.bangumiId)
      ) {
        localIdByBangumiId.set(anime.bangumiId, anime.id);
      }
    }
    const decorated = results.map((result) => {
      const localId = localIdByBangumiId.get(result.bangumiId);
      return {
        ...result,
        alreadyAdded: localId !== undefined,
        ...(localId !== undefined ? { localAnimeId: localId } : {}),
      };
    });
    return NextResponse.json(decorated);
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
