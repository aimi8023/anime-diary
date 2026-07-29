import { NextResponse } from "next/server";

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
    return NextResponse.json(
      {
        error: domainError.message,
        existingId: domainError.existingId,
      },
      { status: 409 },
    );
  }
  if (domainError?.code === "revision_conflict") {
    return NextResponse.json(
      { error: domainError.message },
      { status: 409 },
    );
  }

  console.error(`${operation}番剧 error:`, error);
  return NextResponse.json({ error: `${operation}失败` }, { status: 500 });
}
