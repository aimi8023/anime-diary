import { describe, expect, it, vi } from "vitest";
import { animeMutationErrorResponse } from "./anime-api-error";

describe("animeMutationErrorResponse", () => {
  it("preserves duplicate details with a stable code", async () => {
    const response = animeMutationErrorResponse(
      Object.assign(new Error("该 Bangumi 条目已收录"), {
        code: "duplicate_bangumi",
        existingId: "existing-id",
      }),
      "添加",
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "该 Bangumi 条目已收录",
      code: "duplicate_bangumi",
      existingId: "existing-id",
    });
  });

  it("returns a stable revision conflict code", async () => {
    const response = animeMutationErrorResponse(
      Object.assign(
        new Error("数据已被其他操作更新，请刷新后重试"),
        { code: "revision_conflict" },
      ),
      "更新",
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "数据已被其他操作更新，请刷新后重试",
      code: "revision_conflict",
    });
  });

  it("does not expose unexpected error details", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      const response = animeMutationErrorResponse(
        new Error("redis token leaked"),
        "删除",
      );

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "删除失败" });
    } finally {
      consoleError.mockRestore();
    }
  });
});
