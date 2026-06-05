import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash } from "crypto";

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
      return NextResponse.json({ error: "未配置管理员密码" }, { status: 500 });
    }
    return NextResponse.next();
  }

  const expectedToken = hashPassword(adminPassword);
  const cookieToken = request.cookies.get("admin_token")?.value;
  const isAuthenticated = cookieToken === expectedToken;

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
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
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
  matcher: ["/admin/:path*", "/login/:path*", "/api/anime/:path*"],
};
