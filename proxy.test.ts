import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "./proxy";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy API errors", () => {
  it("returns a stable unauthenticated error for protected writes", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret");
    const response = proxy(
      new NextRequest("https://anime.example/api/anime", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "请先登录",
      code: "unauthenticated",
    });
  });

  it("returns a stable error when authentication is not configured", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    const response = proxy(
      new NextRequest("https://anime.example/api/backups", {
        method: "GET",
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "未配置管理员密码",
      code: "auth_not_configured",
    });
  });

  it("keeps the public anime read endpoint available", () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret");
    const response = proxy(
      new NextRequest("https://anime.example/api/anime", {
        method: "GET",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("Bangumi proxy authentication", () => {
  it("rejects unauthenticated Bangumi API requests", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "admin-secret");
    const response = proxy(
      new NextRequest("http://localhost/api/bangumi/search?q=test"),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "请先登录",
      code: "unauthenticated",
    });
  });

  it("allows a valid administrator cookie", () => {
    vi.stubEnv("ADMIN_PASSWORD", "admin-secret");
    const request = new NextRequest(
      "http://localhost/api/bangumi/search?q=test",
    );
    request.cookies.set(
      "admin_token",
      createHash("sha256").update("admin-secret").digest("hex"),
    );

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("matches all internal Bangumi routes", () => {
    expect(config.matcher).toContain("/api/bangumi/:path*");
  });
});

describe("Backup proxy authentication", () => {
  it("rejects unauthenticated backup API requests including reads", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "admin-secret");

    const response = proxy(
      new NextRequest("http://localhost/api/backups"),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "请先登录",
      code: "unauthenticated",
    });
  });

  it("allows backup requests with a valid administrator cookie", () => {
    vi.stubEnv("ADMIN_PASSWORD", "admin-secret");
    const request = new NextRequest("http://localhost/api/backups");
    request.cookies.set(
      "admin_token",
      createHash("sha256").update("admin-secret").digest("hex"),
    );

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("matches all backup routes", () => {
    expect(config.matcher).toContain("/api/backups/:path*");
  });
});
