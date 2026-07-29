import { NextResponse } from "next/server";
import { backupService } from "@/lib/backups/service-factory";
import {
  backupDownloadResponse,
  backupErrorResponse,
} from "@/lib/backups/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (new URL(request.url).searchParams.get("download") === "1") {
      return backupDownloadResponse(await backupService.exportSnapshot(id));
    }
    return NextResponse.json(await backupService.previewSnapshot(id));
  } catch (error) {
    return backupErrorResponse(error, "读取备份");
  }
}
