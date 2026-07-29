import { describe, expect, it } from "vitest";
import {
  BackupImportError,
  EmptyImportConfirmationError,
} from "./service";
import { backupErrorResponse } from "./http";
import {
  BackupNotFoundError,
  RevisionConflictError,
} from "@/lib/storage-core";

describe("backupErrorResponse", () => {
  it("maps import validation errors to 400", async () => {
    const response = backupErrorResponse(
      new BackupImportError([
        { code: "invalid_json", message: "文件不是有效的 JSON" },
      ]),
      "预览导入",
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      issues: [{ code: "invalid_json" }],
    });
  });

  it("maps empty import confirmation errors to 400", async () => {
    const response = backupErrorResponse(
      new EmptyImportConfirmationError(),
      "导入备份",
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "empty_confirmation_required",
    });
  });

  it("maps missing backups to 404", () => {
    expect(
      backupErrorResponse(
        new BackupNotFoundError("missing"),
        "读取备份",
      ).status,
    ).toBe(404);
  });

  it("maps revision conflicts to 409", () => {
    expect(
      backupErrorResponse(new RevisionConflictError(), "恢复备份").status,
    ).toBe(409);
  });

  it("maps unexpected failures to a generic 500 response", async () => {
    const original = console.error;
    console.error = () => undefined;
    try {
      const response = backupErrorResponse(
        new Error("redis token leaked here"),
        "读取备份",
      );
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "读取备份失败" });
    } finally {
      console.error = original;
    }
  });
});
