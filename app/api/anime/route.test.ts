import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  getAll: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  findByBangumiId: vi.fn(),
}));

vi.mock("@/lib/storage-factory", () => ({ storage: storageMock }));

import { POST } from "./route";

const input = {
  title: " 孤独摇滚！ ",
  season: "2022冬",
  cover: " https://lain.bgm.tv/cover.jpg ",
  rating: 9.5,
  comment: " 很喜欢 ",
  episodes: 12,
  tags: ["音乐"],
  bangumiId: 352821,
  bangumiUrl: " https://bgm.tv/subject/352821 ",
  originalTitle: " ぼっち・ざ・ろっく！ ",
  airDate: " 2022-10-09 ",
};

function postRequest(body = input): Request {
  return new Request("http://localhost/api/anime", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/anime", () => {
  beforeEach(() => {
    storageMock.getAll.mockReset();
    storageMock.add.mockReset();
    storageMock.update.mockReset();
    storageMock.remove.mockReset();
    storageMock.findByBangumiId.mockReset();
  });

  it("rejects an already stored Bangumi subject", async () => {
    storageMock.add.mockImplementation(() => {
      throw Object.assign(new Error("该 Bangumi 条目已收录"), {
        code: "duplicate_bangumi",
        existingId: "existing-id",
      });
    });

    const response = await POST(postRequest());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "该 Bangumi 条目已收录",
      existingId: "existing-id",
    });
    expect(storageMock.add).toHaveBeenCalledOnce();
    expect(storageMock.findByBangumiId).not.toHaveBeenCalled();
  });

  it("stores normalized Bangumi metadata with a new local record", async () => {
    const response = await POST(postRequest());

    expect(response.status).toBe(201);
    expect(storageMock.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "孤独摇滚！",
        cover: "https://lain.bgm.tv/cover.jpg",
        comment: "很喜欢",
        bangumiId: 352821,
        bangumiUrl: "https://bgm.tv/subject/352821",
        originalTitle: "ぼっち・ざ・ろっく！",
        airDate: "2022-10-09",
      }),
    );
    expect(storageMock.findByBangumiId).not.toHaveBeenCalled();
  });

  it("maps a revision conflict to 409", async () => {
    storageMock.add.mockImplementation(() => {
      throw Object.assign(new Error("数据已被其他操作更新，请刷新后重试"), {
        code: "revision_conflict",
      });
    });

    const response = await POST(postRequest());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "数据已被其他操作更新，请刷新后重试",
    });
  });
});
