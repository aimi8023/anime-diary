import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  getAll: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  findByBangumiId: vi.fn(),
}));

vi.mock("@/lib/storage-factory", () => ({ storage: storageMock }));

import { DELETE, PUT } from "./route";

function putRequest(body: unknown): Request {
  return new Request("http://localhost/api/anime/current-id", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost",
    },
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

  it("rejects a foreign origin before validation or storage", async () => {
    const response = await PUT(
      new Request("http://localhost/api/anime/current-id", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil.example",
        },
        body: JSON.stringify({ title: "新标题" }),
      }),
      context(),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "invalid_origin",
    });
    expect(storageMock.update).not.toHaveBeenCalled();
  });

  it("maps malformed JSON before storage", async () => {
    const response = await PUT(
      new Request("http://localhost/api/anime/current-id", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost",
        },
        body: "{broken",
      }),
      context(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "invalid_json",
    });
    expect(storageMock.update).not.toHaveBeenCalled();
  });

  it("returns structured input issues before storage", async () => {
    const response = await PUT(
      putRequest({ episodes: 1.5 }),
      context(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "invalid_input",
      issues: [expect.objectContaining({ path: "episodes" })],
    });
    expect(storageMock.update).not.toHaveBeenCalled();
  });

  it("rejects a Bangumi ID owned by another local record", async () => {
    storageMock.update.mockImplementation(() => {
      throw Object.assign(new Error("该 Bangumi 条目已收录"), {
        code: "duplicate_bangumi",
        existingId: "another-id",
      });
    });

    const response = await PUT(
      putRequest({ bangumiId: 352821 }),
      context(),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "该 Bangumi 条目已收录",
      code: "duplicate_bangumi",
      existingId: "another-id",
    });
    expect(storageMock.update).toHaveBeenCalledOnce();
    expect(storageMock.findByBangumiId).not.toHaveBeenCalled();
  });

  it("allows a record to retain its own Bangumi ID", async () => {
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
    expect(storageMock.findByBangumiId).not.toHaveBeenCalled();
  });

  it("maps a revision conflict during update to 409", async () => {
    storageMock.update.mockImplementation(() => {
      throw Object.assign(new Error("数据已被其他操作更新，请刷新后重试"), {
        code: "revision_conflict",
      });
    });

    const response = await PUT(
      putRequest({ title: "新标题" }),
      context(),
    );

    expect(response.status).toBe(409);
  });
});

describe("DELETE /api/anime/[id]", () => {
  beforeEach(() => {
    storageMock.remove.mockReset();
  });

  it("maps a revision conflict during delete to 409", async () => {
    storageMock.remove.mockImplementation(() => {
      throw Object.assign(new Error("数据已被其他操作更新，请刷新后重试"), {
        code: "revision_conflict",
      });
    });

    const response = await DELETE(
      new Request("http://localhost/api/anime/current-id", {
        method: "DELETE",
        headers: { Origin: "http://localhost" },
      }),
      context(),
    );

    expect(response.status).toBe(409);
  });

  it("rejects a missing origin before storage", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/anime/current-id", {
        method: "DELETE",
      }),
      context(),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "invalid_origin",
    });
    expect(storageMock.remove).not.toHaveBeenCalled();
  });
});
