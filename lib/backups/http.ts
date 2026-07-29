import type { AnimeBackupFile } from "./types";
import type { BackupIssue } from "./types";
import { errorResponse } from "@/lib/http/response";
export { sameOriginError } from "@/lib/http/security";

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

export function backupErrorResponse(
  error: unknown,
  operation: string,
): Response {
  if (hasCode(error, "backup_import_invalid")) {
    const issues =
      "issues" in error && Array.isArray(error.issues)
        ? (error.issues as BackupIssue[])
        : [];
    return errorResponse(
      400,
      error.message,
      { code: "backup_import_invalid", issues },
    );
  }
  if (hasCode(error, "empty_confirmation_required")) {
    return errorResponse(
      400,
      error.message,
      { code: "empty_confirmation_required" },
    );
  }
  if (hasCode(error, "backup_not_found")) {
    return errorResponse(
      404,
      error.message,
      { code: "backup_not_found" },
    );
  }
  if (hasCode(error, "revision_conflict")) {
    return errorResponse(
      409,
      error.message,
      { code: "revision_conflict" },
    );
  }

  console.error(`${operation} error:`, error);
  return errorResponse(500, `${operation}失败`);
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
