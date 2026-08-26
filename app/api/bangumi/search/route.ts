import { NextResponse } from "next/server";
import {
  BangumiClientError,
  searchBangumiSubjects,
} from "@/lib/bangumi/client";
import { storage } from "@/lib/storage-factory";

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
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query || query.length > 100) {
    return NextResponse.json(
      { error: "请输入 1–100 个字符的搜索关键词" },
      { status: 400 },
    );
  }

  try {
    const results = await searchBangumiSubjects(query);
    // 只读一次本站数据，在内存内完成重复检测，
    // 避免对每条搜索结果各触发一次全量状态读取。
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
