import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const limiterMock = vi.hoisted(() => ({
  check: vi.fn(),
  recordFailure: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("@/lib/auth/rate-limit", () => ({
  loginClientKey: () => "client-key",
  loginRateLimiter: limiterMock,
}));

import { DELETE, POST } from "./route";

function authRequest(
  body: unknown,
  origin: string | null = "https://anime.example",
): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (origin !== null) headers.set("Origin", origin);
  return new Request("https://anime.example/api/auth", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("ADMIN_PASSWORD", "secret");
  limiterMock.check.mockReset().mockResolvedValue({
    failures: 0,
    retryAfter: 0,
    limited: false,
  });
  limiterMock.recordFailure.mockReset().mockResolvedValue({
    failures: 1,
    retryAfter: 900,
    limited: false,
  });
  limiterMock.reset.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/auth", () => {
  it("rejects a foreign origin before checking credentials", async () => {
    const response = await POST(
      authRequest({ password: "secret" }, "https://evil.example"),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "invalid_origin",
    });
    expect(limiterMock.check).not.toHaveBeenCalled();
  });

  it("rejects a missing origin", async () => {
    const response = await POST(
      authRequest({ password: "secret" }, null),
    );

    expect(response.status).toBe(403);
  });

  it("counts malformed JSON as a failed attempt", async () => {
    const response = await POST(
      new Request("https://anime.example/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://anime.example",
        },
        body: "{broken",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "invalid_json",
    });
    expect(limiterMock.recordFailure).toHaveBeenCalledWith("client-key");
  });

  it("counts a non-string password as a failed attempt", async () => {
    const response = await POST(authRequest({ password: 123456 }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "密码格式无效",
      code: "invalid_input",
    });
    expect(limiterMock.recordFailure).toHaveBeenCalledWith("client-key");
  });

  it("counts a wrong password and returns a stable error", async () => {
    const response = await POST(authRequest({ password: "wrong" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "密码错误",
      code: "invalid_credentials",
    });
    expect(limiterMock.recordFailure).toHaveBeenCalledWith("client-key");
  });

  it("returns Retry-After without comparing a password when limited", async () => {
    limiterMock.check.mockResolvedValue({
      failures: 5,
      retryAfter: 840,
      limited: true,
    });

    const response = await POST(authRequest({ password: "secret" }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("840");
    expect(await response.json()).toEqual({
      error: "登录尝试过于频繁，请稍后再试",
      code: "rate_limited",
    });
    expect(limiterMock.recordFailure).not.toHaveBeenCalled();
    expect(limiterMock.reset).not.toHaveBeenCalled();
  });

  it("clears failures and preserves the auth cookie on success", async () => {
    const response = await POST(authRequest({ password: "secret" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(limiterMock.reset).toHaveBeenCalledWith("client-key");
    expect(response.headers.get("set-cookie")).toContain("admin_token=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(response.headers.get("set-cookie")).toContain("Path=/");
  });

  it("does not count failures when the server password is missing", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");

    const response = await POST(authRequest({ password: "secret" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "服务器未配置密码",
      code: "auth_not_configured",
    });
    expect(limiterMock.check).not.toHaveBeenCalled();
    expect(limiterMock.recordFailure).not.toHaveBeenCalled();
  });

  it("does not expose or log limiter connection secrets", async () => {
    limiterMock.check.mockRejectedValue(
      new Error("redis token=super-secret"),
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      const response = await POST(authRequest({ password: "secret" }));

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "登录失败" });
      const loggedSecret = consoleError.mock.calls
        .flat()
        .some(
          (value) =>
            value instanceof Error &&
            value.message.includes("super-secret"),
        );
      expect(loggedSecret).toBe(false);
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe("DELETE /api/auth", () => {
  it("requires same origin before clearing the cookie", async () => {
    const response = await DELETE(
      new Request("https://anime.example/api/auth", {
        method: "DELETE",
        headers: { Origin: "https://evil.example" },
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("clears the cookie for a same-origin request", async () => {
    const response = await DELETE(
      new Request("https://anime.example/api/auth", {
        method: "DELETE",
        headers: { Origin: "https://anime.example" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("admin_token=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
