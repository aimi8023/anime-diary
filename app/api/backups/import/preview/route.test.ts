import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMock = vi.hoisted(() => ({ previewImport: vi.fn() }));
vi.mock("@/lib/backups/service-factory", () => ({
  backupService: serviceMock,
}));

import { POST } from "./route";

describe("POST /api/backups/import/preview", () => {
  beforeEach(() => serviceMock.previewImport.mockReset());

  it("rejects a foreign origin before reading the import", async () => {
    const response = await POST(
      new Request("https://anime.example/api/backups/import/preview", {
        method: "POST",
        headers: { Origin: "https://evil.example" },
        body: "[]",
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "请求来源无效",
      code: "invalid_origin",
    });
    expect(serviceMock.previewImport).not.toHaveBeenCalled();
  });

  it("returns an import difference preview without applying it", async () => {
    serviceMock.previewImport.mockResolvedValue({
      format: "legacy",
      recordCount: 1,
      isEmpty: false,
      warnings: [],
      diff: { added: 1, removed: 0, changed: 0, unchanged: 0 },
    });

    const response = await POST(
      new Request("https://anime.example/api/backups/import/preview", {
        method: "POST",
        headers: { Origin: "https://anime.example" },
        body: "[]",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      recordCount: 1,
      diff: { added: 1 },
    });
  });
});
