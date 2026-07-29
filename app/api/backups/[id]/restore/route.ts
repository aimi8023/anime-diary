import { NextResponse } from "next/server";
import { backupService } from "@/lib/backups/service-factory";
import {
  backupErrorResponse,
  sameOriginError,
} from "@/lib/backups/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = sameOriginError(request);
  if (originError) return originError;

  try {
    const { id } = await params;
    return NextResponse.json(await backupService.restore(id));
  } catch (error) {
    return backupErrorResponse(error, "恢复备份");
  }
}
