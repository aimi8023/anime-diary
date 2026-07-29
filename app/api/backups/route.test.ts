import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMock = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/lib/backups/service-factory", () => ({
  backupService: serviceMock,
}));

import { GET } from "./route";

describe("GET /api/backups", () => {
  beforeEach(() => serviceMock.list.mockReset());

  it("returns metadata without snapshot bodies", async () => {
    serviceMock.list.mockResolvedValue([
      {
        id: "backup-1",
        createdAt: "2026-07-29T00:00:00.000Z",
        reason: "add",
        recordCount: 1,
        schemaVersion: 1,
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.backups).toHaveLength(1);
    expect(body.backups[0]).not.toHaveProperty("data");
  });
});
