import { describe, expect, it, vi } from "vitest";
import {
  createMemoryLoginRateLimiter,
  createRedisLoginRateLimiter,
  loginClientKey,
} from "./rate-limit";

describe("loginClientKey", () => {
  it("uses the first forwarded IP without storing it in plaintext", () => {
    const request = new Request("https://anime.example/api/auth", {
      headers: {
        "X-Forwarded-For": "203.0.113.10, 10.0.0.2",
        "X-Real-IP": "198.51.100.8",
      },
    });
    const sameClient = new Request("https://anime.example/api/auth", {
      headers: { "X-Forwarded-For": "203.0.113.10" },
    });
    const otherClient = new Request("https://anime.example/api/auth", {
      headers: { "X-Forwarded-For": "203.0.113.11" },
    });

    const key = loginClientKey(request);
    expect(key).toBe(loginClientKey(sameClient));
    expect(key).not.toBe(loginClientKey(otherClient));
    expect(key).toMatch(/^anime:auth-rate:[a-f0-9]+$/);
    expect(key).not.toContain("203.0.113.10");
  });

  it("uses a stable anonymous bucket when no IP header exists", () => {
    const first = loginClientKey(
      new Request("https://anime.example/api/auth"),
    );
    const second = loginClientKey(
      new Request("https://anime.example/api/auth"),
    );

    expect(first).toBe(second);
  });
});

describe("createMemoryLoginRateLimiter", () => {
  it("limits checks after five failures within fifteen minutes", async () => {
    let now = 1_000_000;
    const limiter = createMemoryLoginRateLimiter({ now: () => now });

    for (let failure = 1; failure <= 5; failure += 1) {
      const state = await limiter.recordFailure("client");
      expect(state.failures).toBe(failure);
    }

    expect(await limiter.check("client")).toEqual({
      failures: 5,
      retryAfter: 900,
      limited: true,
    });

    now += 60_000;
    expect(await limiter.check("client")).toEqual({
      failures: 5,
      retryAfter: 840,
      limited: true,
    });
  });

  it("clears failures after a successful login", async () => {
    const limiter = createMemoryLoginRateLimiter();
    await limiter.recordFailure("client");
    await limiter.reset("client");

    expect(await limiter.check("client")).toEqual({
      failures: 0,
      retryAfter: 0,
      limited: false,
    });
  });

  it("starts a fresh window after expiry", async () => {
    let now = 1_000_000;
    const limiter = createMemoryLoginRateLimiter({ now: () => now });
    await limiter.recordFailure("client");
    now += 901_000;

    expect(await limiter.recordFailure("client")).toEqual({
      failures: 1,
      retryAfter: 900,
      limited: false,
    });
  });
});

describe("createRedisLoginRateLimiter", () => {
  it("maps atomic Redis check and increment results", async () => {
    const redis = {
      eval: vi
        .fn()
        .mockResolvedValueOnce([5, 840])
        .mockResolvedValueOnce([2, 899]),
      del: vi.fn(),
    };
    const limiter = createRedisLoginRateLimiter(redis);

    expect(await limiter.check("client")).toEqual({
      failures: 5,
      retryAfter: 840,
      limited: true,
    });
    expect(await limiter.recordFailure("client")).toEqual({
      failures: 2,
      retryAfter: 899,
      limited: false,
    });
  });

  it("deletes the client bucket when reset", async () => {
    const redis = {
      eval: vi.fn(),
      del: vi.fn().mockResolvedValue(1),
    };
    const limiter = createRedisLoginRateLimiter(redis);

    await limiter.reset("client");

    expect(redis.del).toHaveBeenCalledWith("client");
  });
});
