import { NextResponse } from "next/server";
import { storage } from "@/lib/storage-factory";
import type { AnimeInput } from "@/lib/types";
import { animeMutationErrorResponse } from "@/lib/anime-api-error";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: Partial<AnimeInput> = await request.json();

    if (body.title !== undefined && !body.title?.trim()) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }

    const bangumiId =
      body.bangumiId !== undefined &&
      Number.isInteger(Number(body.bangumiId)) &&
      Number(body.bangumiId) > 0
        ? Number(body.bangumiId)
        : undefined;

    const updates: Partial<AnimeInput> = {};
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.season !== undefined) updates.season = body.season.trim();
    if (body.cover !== undefined) updates.cover = body.cover.trim();
    if (body.rating !== undefined)
      updates.rating = Math.round(Math.min(10, Math.max(1, Number(body.rating))) * 2) / 2;
    if (body.comment !== undefined) updates.comment = body.comment.trim();
    if (body.episodes !== undefined)
      updates.episodes = Math.max(0, Number(body.episodes));
    if (body.tags !== undefined)
      updates.tags = Array.isArray(body.tags) ? body.tags : [];
    if (bangumiId !== undefined) updates.bangumiId = bangumiId;
    if (body.bangumiUrl !== undefined)
      updates.bangumiUrl = body.bangumiUrl.trim();
    if (body.originalTitle !== undefined)
      updates.originalTitle = body.originalTitle.trim();
    if (body.airDate !== undefined) updates.airDate = body.airDate.trim();

    await storage.update(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return animeMutationErrorResponse(error, "更新");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await storage.remove(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return animeMutationErrorResponse(error, "删除");
  }
}
