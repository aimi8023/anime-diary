import { describe, expect, it } from "vitest";
import { resolveRedisConfig, resolveRedisEnv } from "./redis-config";

describe("resolveRedisEnv", () => {
  it("prefers the Upstash variable pair", () => {
    expect(
      resolveRedisEnv({
        UPSTASH_REDIS_REST_URL: "https://cache.example.io",
        UPSTASH_REDIS_REST_TOKEN: "token-a",
        KV_REST_API_URL: "https://kv.example.io",
        KV_REST_API_TOKEN: "token-b",
      }),
    ).toEqual({ url: "https://cache.example.io", token: "token-a" });
  });

  it("falls back to the Vercel KV variable pair", () => {
    expect(
      resolveRedisEnv({
        KV_REST_API_URL: "https://kv.example.io",
        KV_REST_API_TOKEN: "token-b",
      }),
    ).toEqual({ url: "https://kv.example.io", token: "token-b" });
  });

  it("extracts a token embedded in a REDIS_URL query string", () => {
    expect(
      resolveRedisEnv({
        REDIS_URL: "https://cache.example.io?token=embedded-token",
      }),
    ).toEqual({ url: "https://cache.example.io", token: "embedded-token" });
  });

  it("extracts credentials and host from a rediss:// URL", () => {
    expect(
      resolveRedisEnv({
        REDIS_URL: "rediss://default:secret@cache.example.io",
      }),
    ).toEqual({ url: "https://cache.example.io", token: "secret" });
  });

  it("reports no configuration when nothing is set", () => {
    expect(resolveRedisEnv({})).toEqual({ url: null, token: null });
  });

  it("keeps the URL visible when the token cannot be resolved", () => {
    expect(resolveRedisEnv({ REDIS_URL: "https://cache.example.io" })).toEqual({
      url: "https://cache.example.io",
      token: null,
    });
  });

  it("rejects a rediss:// URL without extractable credentials", () => {
    expect(resolveRedisEnv({ REDIS_URL: "rediss://cache.example.io" })).toEqual({
      url: null,
      token: null,
    });
  });
});

describe("resolveRedisConfig", () => {
  it("returns a usable config only when url and token both exist", () => {
    expect(
      resolveRedisConfig({
        UPSTASH_REDIS_REST_URL: "https://cache.example.io",
        UPSTASH_REDIS_REST_TOKEN: "token-a",
      }),
    ).toEqual({ url: "https://cache.example.io", token: "token-a" });

    expect(resolveRedisConfig({ UPSTASH_REDIS_REST_URL: "https://cache.example.io" })).toBeNull();
    expect(resolveRedisConfig({})).toBeNull();
  });
});
