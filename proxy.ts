import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash } from "crypto";
import { errorResponse } from "@/lib/http/response";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Next.js internal requests entirely
  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD;

  // No password set → block admin access entirely
  if (!adminPassword) {
    if (pathname.startsWith("/admin") || pathname.startsWith("/login")) {
      return new NextResponse("管理员未设置密码。请设置 ADMIN_PASSWORD 环境变量。", {
        status: 500,
      });
    }
    // Block write API routes, allow read
    if (
      pathname.startsWith("/api/anime") &&
      request.method !== "GET"
    ) {
      return errorResponse(
        500,
        "未配置管理员密码",
        { code: "auth_not_configured" },
      );
    }
    if (
      pathname.startsWith("/api/bangumi") ||
      pathname.startsWith("/api/backups")
    ) {
      return errorResponse(
        500,
        "未配置管理员密码",
        { code: "auth_not_configured" },
      );
    }
    return NextResponse.next();
  }

  const expectedToken = hashPassword(adminPassword);
  const cookieToken = request.cookies.get("admin_token")?.value;
  const isAuthenticated = cookieToken === expectedToken;

  if (
    pathname.startsWith("/api/bangumi") ||
    pathname.startsWith("/api/backups")
  ) {
    if (!isAuthenticated) {
      return errorResponse(
        401,
        "请先登录",
        { code: "unauthenticated" },
      );
    }
    return NextResponse.next();
  }

  // Protect /admin page → redirect to /login
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Protect write operations on /api/anime
  if (
    pathname.startsWith("/api/anime") &&
    request.method !== "GET"
  ) {
    if (!isAuthenticated) {
      return errorResponse(
        401,
        "请先登录",
        { code: "unauthenticated" },
      );
    }
    return NextResponse.next();
  }

  // /login page: if already authenticated, redirect to /admin
  if (pathname.startsWith("/login")) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/login/:path*",
    "/api/anime/:path*",
    "/api/bangumi/:path*",
    "/api/backups/:path*",
  ],
};
