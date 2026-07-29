import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMock = vi.hoisted(() => ({ applyImport: vi.fn() }));
vi.mock("@/lib/backups/service-factory", () => ({
  backupService: serviceMock,
}));

import { POST } from "./route";

describe("POST /api/backups/import/apply", () => {
  beforeEach(() => serviceMock.applyImport.mockReset());

  it("rejects a foreign origin before applying the import", async () => {
    const response = await POST(
      new Request("https://anime.example/api/backups/import/apply", {
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
    expect(serviceMock.applyImport).not.toHaveBeenCalled();
  });

  it("passes explicit empty confirmation to the service", async () => {
    serviceMock.applyImport.mockResolvedValue({
      revision: 4,
      recordCount: 0,
    });

    const response = await POST(
      new Request(
        "https://anime.example/api/backups/import/apply?confirmEmpty=true",
        {
          method: "POST",
          headers: { Origin: "https://anime.example" },
          body: "[]",
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(serviceMock.applyImport).toHaveBeenCalledWith("[]", {
      confirmEmpty: true,
    });
  });
});
