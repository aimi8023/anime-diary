import { NextResponse } from "next/server";
import {
  BangumiClientError,
  getBangumiPrefill,
} from "@/lib/bangumi/client";

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Bangumi 条目 ID 无效" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await getBangumiPrefill(id));
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
