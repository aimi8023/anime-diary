"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Anime, AnimeInput } from "@/lib/types";
import AnimeList from "@/components/anime-list";
import AnimeForm from "@/components/anime-form";

export default function AdminPage() {
  const router = useRouter();
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [editing, setEditing] = useState<Anime | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch("/api/anime");
      if (res.ok) {
        const data = await res.json();
        setAnimeList(data);
      }
    } catch (err) {
      console.error("Failed to fetch anime list:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSave = async (data: AnimeInput) => {
    if (editing) {
      const res = await fetch(`/api/anime/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "更新失败");
      }
    } else {
      const res = await fetch("/api/anime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "添加失败");
      }
    }
    setEditing(null);
    setShowForm(false);
    fetchList();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这部番剧吗？")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/anime/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      fetchList();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (anime: Anime) => {
    setEditing(anime);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditing(null);
    setShowForm(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">管理番剧</h1>
          <p className="text-sm text-white/40 mt-1">添加、编辑或删除你的追番记录</p>
        </div>
        <div className="flex items-center gap-2">
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-3 sm:px-4 py-2.5 rounded-lg transition-colors min-h-[44px]"
            >
              + 添加番剧
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-white/30 hover:text-red-400 px-2 py-2.5 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="退出登录"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Form — glass */}
      {showForm && (
        <div className="mb-8 glass rounded-xl p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-white/80 mb-4">
            {editing ? `编辑：${editing.title}` : "添加新番剧"}
          </h2>
          <AnimeForm
            initial={editing}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-white/30 text-sm">加载中...</div>
      ) : (
        <AnimeList
          animeList={animeList}
          onEdit={handleEdit}
          onDelete={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}
