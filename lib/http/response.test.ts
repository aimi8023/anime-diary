import { describe, expect, it } from "vitest";
import { errorResponse, readJsonBody } from "./response";

describe("errorResponse", () => {
  it("returns the stable API error envelope", async () => {
    const issues = [{ path: "rating", message: "评分无效" }];

    const response = errorResponse(400, "提交失败", {
      code: "invalid_input",
      issues,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "提交失败",
      code: "invalid_input",
      issues,
    });
  });
});

describe("readJsonBody", () => {
  it("returns parsed JSON without changing it", async () => {
    const result = await readJsonBody(
      new Request("https://anime.example/api/anime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "孤独摇滚！" }),
      }),
    );

    expect(result).toEqual({
      ok: true,
      data: { title: "孤独摇滚！" },
    });
  });

  it("maps malformed JSON to invalid_json", async () => {
    const result = await readJsonBody(
      new Request("https://anime.example/api/anime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{broken",
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected invalid JSON to fail");
    expect(result.response.status).toBe(400);
    expect(await result.response.json()).toEqual({
      error: "请求内容不是有效的 JSON",
      code: "invalid_json",
    });
  });
});
