import type { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/response";

function codedError(
  error: unknown,
): (Error & { code: string; existingId?: string }) | null {
  if (
    error instanceof Error &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return error as Error & { code: string; existingId?: string };
  }
  return null;
}

export function animeMutationErrorResponse(
  error: unknown,
  operation: "添加" | "更新" | "删除",
): NextResponse {
  const domainError = codedError(error);
  if (domainError?.code === "duplicate_bangumi") {
    return errorResponse(
      409,
      domainError.message,
      {
        code: "duplicate_bangumi",
        existingId: domainError.existingId,
      },
    );
  }
  if (domainError?.code === "revision_conflict") {
    return errorResponse(
      409,
      domainError.message,
      { code: "revision_conflict" },
    );
  }

  console.error(`${operation}番剧 error:`, error);
  return errorResponse(500, `${operation}失败`);
}
