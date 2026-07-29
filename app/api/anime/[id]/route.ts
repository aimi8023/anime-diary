import { NextResponse } from "next/server";
import { storage } from "@/lib/storage-factory";
import { animeMutationErrorResponse } from "@/lib/anime-api-error";
import { parseAnimeUpdateInput } from "@/lib/anime/validation";
import { errorResponse, readJsonBody } from "@/lib/http/response";
import { sameOriginError } from "@/lib/http/security";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = sameOriginError(request);
  if (originError) return originError;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const input = parseAnimeUpdateInput(body.data);
  if (!input.ok) {
    return errorResponse(
      400,
      "提交的数据不符合要求",
      { code: "invalid_input", issues: input.issues },
    );
  }

  try {
    const { id } = await params;
    await storage.update(id, input.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return animeMutationErrorResponse(error, "更新");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = sameOriginError(request);
  if (originError) return originError;

  try {
    const { id } = await params;
    await storage.remove(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return animeMutationErrorResponse(error, "删除");
  }
}
