import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  getAll: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  findByBangumiId: vi.fn(),
}));

vi.mock("@/lib/storage-factory", () => ({ storage: storageMock }));

import { PUT } from "./route";

function putRequest(body: unknown): Request {
  return new Request("http://localhost/api/anime/current-id", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(id = "current-id") {
  return { params: Promise.resolve({ id }) };
}

describe("PUT /api/anime/[id]", () => {
  beforeEach(() => {
    storageMock.getAll.mockReset();
    storageMock.add.mockReset();
    storageMock.update.mockReset();
    storageMock.remove.mockReset();
    storageMock.findByBangumiId.mockReset();
  });

  it("rejects a Bangumi ID owned by another local record", async () => {
    storageMock.findByBangumiId.mockResolvedValue({
      id: "another-id",
      bangumiId: 352821,
    });

    const response = await PUT(
      putRequest({ bangumiId: 352821 }),
      context(),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "该 Bangumi 条目已收录",
      existingId: "another-id",
    });
    expect(storageMock.update).not.toHaveBeenCalled();
  });

  it("allows a record to retain its own Bangumi ID", async () => {
    storageMock.findByBangumiId.mockResolvedValue({
      id: "current-id",
      bangumiId: 352821,
    });

    const response = await PUT(
      putRequest({
        bangumiId: 352821,
        bangumiUrl: " https://bgm.tv/subject/352821 ",
        originalTitle: " ぼっち・ざ・ろっく！ ",
        airDate: " 2022-10-09 ",
      }),
      context(),
    );

    expect(response.status).toBe(200);
    expect(storageMock.update).toHaveBeenCalledWith("current-id", {
      bangumiId: 352821,
      bangumiUrl: "https://bgm.tv/subject/352821",
      originalTitle: "ぼっち・ざ・ろっく！",
      airDate: "2022-10-09",
    });
  });
});
