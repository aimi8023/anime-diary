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
    console.log("POST /api/anime - Starting...");
    
    const body: AnimeInput = await request.json();
    console.log("Request body:", JSON.stringify(body, null, 2));

    // Basic validation
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }
    if (!body.season?.trim()) {
      return NextResponse.json({ error: "季度不能为空" }, { status: 400 });
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
      createdAt: new Date().toISOString(),
    };

    console.log("Saving anime:", JSON.stringify(anime, null, 2));
    await storage.add(anime);
    console.log("Anime saved successfully!");
    
    return NextResponse.json(anime, { status: 201 });
  } catch (error) {
    console.error("POST /api/anime error:", error);
    const message = error instanceof Error ? error.message : "添加失败";
    return NextResponse.json({ error: message, details: String(error) }, { status: 500 });
  }
}
