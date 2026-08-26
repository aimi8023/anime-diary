import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { storage } from "@/lib/storage-factory";
import { animeMutationErrorResponse } from "@/lib/anime-api-error";
import { parseAnimeCreateInput } from "@/lib/anime/validation";
import { errorResponse, readJsonBody } from "@/lib/http/response";
import { sameOriginError } from "@/lib/http/security";

export async function GET() {
  try {
    const list = await storage.getAll();
    return NextResponse.json(list);
  } catch (error) {
    console.error("GET /api/anime error:", error);
    return errorResponse(500, "获取数据失败", {
      code: "internal_error",
    });
  }
}

export async function POST(request: Request) {
  const originError = sameOriginError(request);
  if (originError) return originError;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const input = parseAnimeCreateInput(body.data);
  if (!input.ok) {
    return errorResponse(
      400,
      "提交的数据不符合要求",
      { code: "invalid_input", issues: input.issues },
    );
  }

  try {
    const anime = {
      id: nanoid(12),
      ...input.data,
      createdAt: new Date().toISOString(),
    };

    await storage.add(anime);
    return NextResponse.json(anime, { status: 201 });
  } catch (error) {
    return animeMutationErrorResponse(error, "添加");
  }
}
