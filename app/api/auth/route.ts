import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import {
  loginClientKey,
  loginRateLimiter,
} from "@/lib/auth/rate-limit";
import { errorResponse, readJsonBody } from "@/lib/http/response";
import { sameOriginError } from "@/lib/http/security";

// 先对两侧做摘要再比较：长度恒定，且不因字节差异提前返回，
// 避免登录接口暴露时序侧信道。
function passwordMatches(provided: string, expected: string): boolean {
  const providedDigest = createHash("sha256").update(provided).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

export async function POST(request: Request) {
  const originError = sameOriginError(request);
  if (originError) return originError;

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return errorResponse(
      500,
      "服务器未配置密码",
      { code: "auth_not_configured" },
    );
  }

  const clientKey = loginClientKey(request);
  try {
    const rateLimit = await loginRateLimiter.check(clientKey);
    if (rateLimit.limited) {
      const response = errorResponse(
        429,
        "登录尝试过于频繁，请稍后再试",
        { code: "rate_limited" },
      );
      response.headers.set(
        "Retry-After",
        String(Math.max(1, rateLimit.retryAfter)),
      );
      return response;
    }

    const body = await readJsonBody(request);
    if (!body.ok) {
      await loginRateLimiter.recordFailure(clientKey);
      return body.response;
    }

    const password =
      typeof body.data === "object" &&
      body.data !== null &&
      !Array.isArray(body.data)
        ? (body.data as { password?: unknown }).password
        : undefined;
    if (typeof password !== "string") {
      await loginRateLimiter.recordFailure(clientKey);
      return errorResponse(
        400,
        "密码格式无效",
        { code: "invalid_input" },
      );
    }

    if (!passwordMatches(password, adminPassword)) {
      await loginRateLimiter.recordFailure(clientKey);
      return errorResponse(
        401,
        "密码错误",
        { code: "invalid_credentials" },
      );
    }

    await loginRateLimiter.reset(clientKey);
    const token = createHash("sha256").update(adminPassword).digest("hex");

    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error(
      "登录流程失败",
      error instanceof Error ? error.name : "UnknownError",
    );
    return errorResponse(500, "登录失败");
  }
}

export async function DELETE(request: Request) {
  const originError = sameOriginError(request);
  if (originError) return originError;

  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
