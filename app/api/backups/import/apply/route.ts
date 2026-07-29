import { NextResponse } from "next/server";
import { backupService } from "@/lib/backups/service-factory";
import {
  backupErrorResponse,
  sameOriginError,
} from "@/lib/backups/http";

export async function POST(request: Request) {
  const originError = sameOriginError(request);
  if (originError) return originError;

  try {
    const confirmEmpty =
      new URL(request.url).searchParams.get("confirmEmpty") === "true";
    return NextResponse.json(
      await backupService.applyImport(await request.text(), {
        confirmEmpty,
      }),
    );
  } catch (error) {
    return backupErrorResponse(error, "导入备份");
  }
}
