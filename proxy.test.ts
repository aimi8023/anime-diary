import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "./proxy";

describe("Bangumi proxy authentication", () => {
  afterEach(() => delete process.env.ADMIN_PASSWORD);

  it("rejects unauthenticated Bangumi API requests", async () => {
    process.env.ADMIN_PASSWORD = "admin-secret";
    const response = proxy(
      new NextRequest("http://localhost/api/bangumi/search?q=test"),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "请先登录" });
  });

  it("allows a valid administrator cookie", () => {
    process.env.ADMIN_PASSWORD = "admin-secret";
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
  afterEach(() => delete process.env.ADMIN_PASSWORD);

  it("rejects unauthenticated backup API requests including reads", async () => {
    process.env.ADMIN_PASSWORD = "admin-secret";

    const response = proxy(
      new NextRequest("http://localhost/api/backups"),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "请先登录" });
  });

  it("allows backup requests with a valid administrator cookie", () => {
    process.env.ADMIN_PASSWORD = "admin-secret";
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
