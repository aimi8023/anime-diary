import { storage } from "@/lib/storage-factory";
import { createBackupService } from "./service";

export const backupService = createBackupService(storage);
