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
    const decorated = await Promise.all(
      results.map(async (result) => {
        const existing = await storage.findByBangumiId(result.bangumiId);
        return {
          ...result,
          alreadyAdded: Boolean(existing),
          ...(existing ? { localAnimeId: existing.id } : {}),
        };
      }),
    );
    return NextResponse.json(decorated);
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
