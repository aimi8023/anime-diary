import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackupNotFoundError } from "@/lib/storage-core";

const serviceMock = vi.hoisted(() => ({
  previewSnapshot: vi.fn(),
  exportSnapshot: vi.fn(),
}));
vi.mock("@/lib/backups/service-factory", () => ({
  backupService: serviceMock,
}));

import { GET } from "./route";

const context = { params: Promise.resolve({ id: "backup-1" }) };

describe("GET /api/backups/[id]", () => {
  beforeEach(() => {
    serviceMock.previewSnapshot.mockReset();
    serviceMock.exportSnapshot.mockReset();
  });

  it("returns snapshot metadata and its difference from current data", async () => {
    serviceMock.previewSnapshot.mockResolvedValue({
      metadata: { id: "backup-1", reason: "add", recordCount: 1 },
      diff: { added: 0, removed: 1, changed: 0, unchanged: 1 },
    });

    const response = await GET(
      new Request("http://localhost/api/backups/backup-1"),
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      metadata: { id: "backup-1" },
      diff: { removed: 1 },
    });
  });

  it("downloads a versioned snapshot file", async () => {
    serviceMock.exportSnapshot.mockResolvedValue({
      format: "anime-diary-backup",
      schemaVersion: 1,
      exportedAt: "2026-07-29T00:00:00.000Z",
      source: "snapshot",
      data: [],
    });

    const response = await GET(
      new Request("http://localhost/api/backups/backup-1?download=1"),
      context,
    );

    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toContain(
      "anime-backup-2026-07-29",
    );
  });

  it("maps a missing snapshot to 404", async () => {
    serviceMock.previewSnapshot.mockRejectedValue(
      new BackupNotFoundError("missing"),
    );

    const response = await GET(
      new Request("http://localhost/api/backups/missing"),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });
});
