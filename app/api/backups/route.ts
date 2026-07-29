import { NextResponse } from "next/server";
import { backupService } from "@/lib/backups/service-factory";
import { backupErrorResponse } from "@/lib/backups/http";

export async function GET() {
  try {
    return NextResponse.json({ backups: await backupService.list() });
  } catch (error) {
    return backupErrorResponse(error, "读取备份列表");
  }
}
