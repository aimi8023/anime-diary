import { backupService } from "@/lib/backups/service-factory";
import {
  backupDownloadResponse,
  backupErrorResponse,
} from "@/lib/backups/http";

export async function GET() {
  try {
    return backupDownloadResponse(await backupService.exportCurrent());
  } catch (error) {
    return backupErrorResponse(error, "导出备份");
  }
}
