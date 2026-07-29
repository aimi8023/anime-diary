import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMock = vi.hoisted(() => ({ restore: vi.fn() }));
vi.mock("@/lib/backups/service-factory", () => ({
  backupService: serviceMock,
}));

import { POST } from "./route";

const context = { params: Promise.resolve({ id: "backup-1" }) };

describe("POST /api/backups/[id]/restore", () => {
  beforeEach(() => serviceMock.restore.mockReset());

  it("rejects a foreign origin before restoring", async () => {
    const response = await POST(
      new Request("https://anime.example/api/backups/backup-1/restore", {
        method: "POST",
        headers: { Origin: "https://evil.example" },
      }),
      context,
    );

    expect(response.status).toBe(403);
    expect(serviceMock.restore).not.toHaveBeenCalled();
  });

  it("restores a snapshot for a same-origin request", async () => {
    serviceMock.restore.mockResolvedValue({
      restoredSnapshot: { id: "backup-1" },
      revision: 4,
      recordCount: 2,
    });

    const response = await POST(
      new Request("https://anime.example/api/backups/backup-1/restore", {
        method: "POST",
        headers: { Origin: "https://anime.example" },
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      restoredSnapshot: { id: "backup-1" },
      recordCount: 2,
    });
  });
});
