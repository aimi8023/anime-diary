import { describe, expect, it } from "vitest";
import { readApiError } from "./client";

describe("readApiError", () => {
  it("returns a non-empty JSON error message", async () => {
    const response = new Response(
      JSON.stringify({ error: "登录尝试过于频繁，请稍后再试" }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      },
    );

    expect(await readApiError(response, "登录失败")).toBe(
      "登录尝试过于频繁，请稍后再试",
    );
  });

  it("uses the fallback for an empty error field", async () => {
    const response = new Response(JSON.stringify({ error: " " }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });

    expect(await readApiError(response, "保存失败")).toBe("保存失败");
  });

  it("uses the fallback for a non-JSON response", async () => {
    const response = new Response("<h1>Gateway Error</h1>", {
      status: 502,
      headers: { "Content-Type": "text/html" },
    });

    expect(await readApiError(response, "请求失败")).toBe("请求失败");
  });

  it("uses the fallback for malformed JSON", async () => {
    const response = new Response("{broken", {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });

    expect(await readApiError(response, "请求失败")).toBe("请求失败");
  });
});
