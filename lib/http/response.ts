import { NextResponse } from "next/server";
import type { ApiErrorBody } from "./types";

export function errorResponse<TIssue = unknown>(
  status: number,
  error: string,
  options: Omit<ApiErrorBody<TIssue>, "error"> = {},
): NextResponse<ApiErrorBody<TIssue>> {
  return NextResponse.json({ error, ...options }, { status });
}

export async function readJsonBody(
  request: Request,
): Promise<
  | { ok: true; data: unknown }
  | { ok: false; response: NextResponse<ApiErrorBody> }
> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return {
      ok: false,
      response: errorResponse(
        400,
        "请求内容不是有效的 JSON",
        { code: "invalid_json" },
      ),
    };
  }
}
