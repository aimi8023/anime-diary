import { describe, expect, it, vi } from "vitest";

const serviceMock = vi.hoisted(() => ({ exportCurrent: vi.fn() }));
vi.mock("@/lib/backups/service-factory", () => ({
  backupService: serviceMock,
}));

import { GET } from "./route";

describe("GET /api/backups/export", () => {
  it("downloads the latest server-side dataset", async () => {
    serviceMock.exportCurrent.mockResolvedValue({
      format: "anime-diary-backup",
      schemaVersion: 1,
      exportedAt: "2026-07-29T00:00:00.000Z",
      source: "current",
      data: [],
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(
      "anime-backup-2026-07-29",
    );
    expect(await response.json()).toMatchObject({
      format: "anime-diary-backup",
      source: "current",
    });
  });
});
