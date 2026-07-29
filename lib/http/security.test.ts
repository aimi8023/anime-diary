import { describe, expect, it } from "vitest";
import { sameOriginError } from "./security";

function mutation(origin?: string): Request {
  const headers = new Headers();
  if (origin !== undefined) headers.set("Origin", origin);
  return new Request("https://anime.example/api/anime", {
    method: "POST",
    headers,
  });
}

describe("sameOriginError", () => {
  it("accepts an exact same-origin mutation", () => {
    expect(sameOriginError(mutation("https://anime.example"))).toBeNull();
  });

  it.each([
    ["missing", undefined],
    ["null", "null"],
    ["malformed", "not a URL"],
    ["foreign", "https://evil.example"],
  ])("rejects a %s Origin", async (_label, origin) => {
    const response = sameOriginError(mutation(origin));

    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual({
      error: "请求来源无效",
      code: "invalid_origin",
    });
  });
});
