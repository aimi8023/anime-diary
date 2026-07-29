import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { storage } from "@/lib/storage-factory";
import type { AnimeInput } from "@/lib/types";

export async function GET() {
  try {
    const list = await storage.getAll();
    return NextResponse.json(list);
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取数据失败";
    console.error("GET /api/anime error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: AnimeInput = await request.json();

    // Basic validation
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }
    if (!body.season?.trim()) {
      return NextResponse.json({ error: "季度不能为空" }, { status: 400 });
    }

    const bangumiId =
      Number.isInteger(Number(body.bangumiId)) && Number(body.bangumiId) > 0
        ? Number(body.bangumiId)
        : undefined;

    if (bangumiId !== undefined) {
      const existing = await storage.findByBangumiId(bangumiId);
      if (existing) {
        return NextResponse.json(
          { error: "该 Bangumi 条目已收录", existingId: existing.id },
          { status: 409 },
        );
      }
    }

    const anime = {
      id: nanoid(12),
      ...body,
      title: body.title.trim(),
      season: body.season.trim(),
      cover: body.cover?.trim() || "",
      rating: Math.round(Math.min(10, Math.max(1, Number(body.rating) || 1)) * 2) / 2,
      comment: body.comment?.trim() || "",
      episodes: Math.max(0, Number(body.episodes) || 0),
      tags: Array.isArray(body.tags) ? body.tags : [],
      bangumiId,
      bangumiUrl: body.bangumiUrl?.trim() || undefined,
      originalTitle: body.originalTitle?.trim() || undefined,
      airDate: body.airDate?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    await storage.add(anime);
    return NextResponse.json(anime, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "添加失败";
    console.error("POST /api/anime error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
