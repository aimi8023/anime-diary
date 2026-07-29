import { NextResponse } from "next/server";
import type { AnimeBackupFile } from "./types";
import type { BackupIssue } from "./types";

function hasCode(
  error: unknown,
  code: string,
): error is Error & { code: string } {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

export function sameOriginError(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "请求来源无效" }, { status: 403 });
  }
  return null;
}

export function backupErrorResponse(
  error: unknown,
  operation: string,
): NextResponse {
  if (hasCode(error, "backup_import_invalid")) {
    const issues =
      "issues" in error && Array.isArray(error.issues)
        ? (error.issues as BackupIssue[])
        : [];
    return NextResponse.json(
      { error: error.message, issues },
      { status: 400 },
    );
  }
  if (hasCode(error, "empty_confirmation_required")) {
    return NextResponse.json(
      {
        error: error.message,
        code: "empty_confirmation_required",
      },
      { status: 400 },
    );
  }
  if (hasCode(error, "backup_not_found")) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (hasCode(error, "revision_conflict")) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  console.error(`${operation} error:`, error);
  return NextResponse.json({ error: `${operation}失败` }, { status: 500 });
}

export function backupDownloadResponse(
  file: AnimeBackupFile,
): Response {
  const date = file.exportedAt.split("T")[0] || "export";
  return new Response(JSON.stringify(file, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="anime-backup-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
