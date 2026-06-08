import { NextResponse } from "next/server";
import { storage } from "@/lib/storage-factory";
import type { AnimeInput } from "@/lib/types";

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

    const updates: Partial<AnimeInput> = {};
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.season !== undefined) updates.season = body.season.trim();
    if (body.cover !== undefined) updates.cover = body.cover.trim();
    if (body.rating !== undefined)
      updates.rating = Math.round(Math.min(10, Math.max(1, Number(body.rating))) * 2) / 2;
    if (body.comment !== undefined) updates.comment = body.comment.trim();
    if (body.episodes !== undefined)
      updates.episodes = Math.max(0, Number(body.episodes));

    await storage.update(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/anime error:", error);
    const message =
      error instanceof Error ? error.message : "更新失败";
    return NextResponse.json({ error: message }, { status: 500 });
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
    console.error("DELETE /api/anime error:", error);
    const message =
      error instanceof Error ? error.message : "删除失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
