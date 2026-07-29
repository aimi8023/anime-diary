import type { NextResponse } from "next/server";
import { errorResponse } from "./response";

export function sameOriginError(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") {
    return errorResponse(
      403,
      "请求来源无效",
      { code: "invalid_origin" },
    );
  }

  try {
    if (new URL(origin).origin === new URL(request.url).origin) {
      return null;
    }
  } catch {
    // Invalid origins are rejected below.
  }

  return errorResponse(
    403,
    "请求来源无效",
    { code: "invalid_origin" },
  );
}
