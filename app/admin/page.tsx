"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Anime, AnimeInput } from "@/lib/types";
import type { BangumiPrefill } from "@/lib/bangumi/types";
import AnimeList from "@/components/anime-list";
import AnimeForm from "@/components/anime-form";
import BangumiSearch from "@/components/bangumi-search";
import BackupManager from "@/components/backup-manager";
import AdminSectionNav, {
  type AdminSection,
} from "@/components/admin/admin-section-nav";
import InlineFeedback from "@/components/feedback/inline-feedback";
import { readApiError } from "@/lib/http/client";

type EntryMode = "bangumi" | "manual";

export default function AdminPage() {
  const router = useRouter();
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [editing, setEditing] = useState<Anime | null>(null);
  const [section, setSection] = useState<AdminSection>("records");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [entryMode, setEntryMode] = useState<EntryMode>("bangumi");
  const [prefill, setPrefill] = useState<BangumiPrefill | null>(null);
  const [operationError, setOperationError] = useState("");

  const fetchList = useCallback(async () => {
    setOperationError("");
    try {
      const res = await fetch("/api/anime");
      if (!res.ok) {
        throw new Error(
          await readApiError(res, "读取记录失败"),
        );
      }
      const data = await res.json();
      setAnimeList(data);
    } catch (err) {
      setOperationError(
        err instanceof Error ? err.message : "读取记录失败",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  // Filter by search query
  const filteredList = searchQuery.trim()
    ? animeList.filter((anime) =>
        anime.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : animeList;

  const handleSave = async (data: AnimeInput) => {
    if (editing) {
      const res = await fetch(`/api/anime/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const details = await res
          .clone()
          .json()
          .catch(() => null) as { existingId?: string } | null;
        if (res.status === 409 && details?.existingId) {
          const existing = animeList.find(
            (anime) => anime.id === details.existingId,
          );
          if (existing) {
            setEditing(existing);
            setPrefill(null);
            setEntryMode("manual");
            setSection("entry");
          }
        }
        throw new Error(await readApiError(res, "更新失败"));
      }
    } else {
      const res = await fetch("/api/anime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const details = await res
          .clone()
          .json()
          .catch(() => null) as { existingId?: string } | null;
        if (res.status === 409 && details?.existingId) {
          const existing = animeList.find(
            (anime) => anime.id === details.existingId,
          );
          if (existing) {
            setEditing(existing);
            setPrefill(null);
            setEntryMode("manual");
            setSection("entry");
          }
        }
        throw new Error(await readApiError(res, "添加失败"));
      }
    }
    setEditing(null);
    setPrefill(null);
    setEntryMode("bangumi");
    setSection("records");
    fetchList();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这部番剧吗？")) return;
    setOperationError("");
    setDeleting(id);
    try {
      const res = await fetch(`/api/anime/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(await readApiError(res, "删除失败"));
      }
      fetchList();
    } catch (err) {
      setOperationError(
        err instanceof Error ? err.message : "删除失败",
      );
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (anime: Anime) => {
    setEditing(anime);
    setPrefill(null);
    setEntryMode("manual");
    setSection("entry");
  };

  const handleCancel = () => {
    setEditing(null);
    setPrefill(null);
    setEntryMode("bangumi");
    setSection("records");
  };

  const handleStartAdd = () => {
    setEditing(null);
    setPrefill(null);
    setEntryMode("bangumi");
    setSection("entry");
  };

  const handleEditExisting = (localAnimeId: string) => {
    const existing = animeList.find((anime) => anime.id === localAnimeId);
    if (existing) handleEdit(existing);
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  };

  const handleSectionChange = (nextSection: AdminSection) => {
    if (nextSection === "entry") {
      handleStartAdd();
      return;
    }
    setEditing(null);
    setPrefill(null);
    setEntryMode("bangumi");
    setSection(nextSection);
  };

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-pink-600">
            ADMIN WORKSPACE
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            追番管理后台
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            维护记录、添加条目，并在需要时管理备份。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/70 bg-white/50 px-3 text-gray-600 transition hover:border-red-200 hover:text-red-600"
            title="退出登录"
            aria-label="退出登录"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </header>

      <AdminSectionNav
        current={section}
        onChange={handleSectionChange}
        recordCount={animeList.length}
      />

      {section === "records" && (
        <section
          aria-labelledby="admin-tab-records"
          className="mt-6"
          id="admin-panel-records"
          role="tabpanel"
        >
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/45 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                记录管理
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                共 {animeList.length} 条记录，编辑或删除会自动创建快照。
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <label className="sr-only" htmlFor="admin-record-search">
                  搜索记录
                </label>
                <input
                  className="glass-input min-h-[44px] w-full rounded-xl px-3 pr-10 text-sm focus:outline-none"
                  id="admin-record-search"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索番剧..."
                  type="search"
                  value={searchQuery}
                />
                {searchQuery && (
                  <button
                    aria-label="清除记录搜索"
                    className="absolute right-2 top-1/2 min-h-8 min-w-8 -translate-y-1/2 rounded-full text-gray-500 hover:bg-white/60"
                    onClick={() => setSearchQuery("")}
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                className="min-h-[44px] whitespace-nowrap rounded-xl bg-gradient-to-r from-pink-500 to-blue-500 px-4 text-sm font-medium text-white shadow-md transition hover:from-pink-600 hover:to-blue-600"
                onClick={handleStartAdd}
                type="button"
              >
                + 添加番剧
              </button>
            </div>
          </div>

          {operationError && (
            <InlineFeedback tone="error" className="mb-4">
              {operationError}
            </InlineFeedback>
          )}

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-600">
              加载中...
            </div>
          ) : filteredList.length === 0 && searchQuery ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/35 py-16 text-center">
              <p className="text-lg font-medium text-gray-700">
                未找到相关番剧
              </p>
              <p className="mt-2 text-sm text-gray-500">试试其他关键词吧</p>
              <button
                className="mt-4 rounded-full border border-gray-200 bg-white/60 px-4 py-2 text-sm text-gray-600"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                清除搜索
              </button>
            </div>
          ) : (
            <AnimeList
              animeList={filteredList}
              deleting={deleting}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          )}
        </section>
      )}

      {section === "entry" && (
        <section
          aria-labelledby="admin-tab-entry"
          className="mt-6"
          id="admin-panel-entry"
          role="tabpanel"
        >
          <div className="glass rounded-2xl p-4 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editing ? "编辑记录" : "添加记录"}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {editing
                    ? `正在编辑《${editing.title}》`
                    : "先从 Bangumi 查找，找不到时再手动填写。"}
                </p>
              </div>
              <button
                className="min-h-[40px] rounded-lg px-3 text-sm text-gray-600 hover:bg-white/50"
                onClick={handleCancel}
                type="button"
              >
                返回记录
              </button>
            </div>

          {editing ? (
            <AnimeForm
              key={editing.id}
              initial={editing}
              submitLabel="更新记录"
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <>
              {!prefill && (
                <div className="grid grid-cols-2 gap-2 mb-4 rounded-xl bg-white/20 p-1">
                  <button
                    type="button"
                    onClick={() => setEntryMode("bangumi")}
                    className={`min-h-[40px] rounded-lg text-sm font-medium transition-colors ${
                      entryMode === "bangumi"
                        ? "bg-white/70 text-pink-600 shadow-sm"
                        : "text-gray-600 hover:bg-white/30"
                    }`}
                  >
                    从 Bangumi 搜索
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryMode("manual")}
                    className={`min-h-[40px] rounded-lg text-sm font-medium transition-colors ${
                      entryMode === "manual"
                        ? "bg-white/70 text-blue-600 shadow-sm"
                        : "text-gray-600 hover:bg-white/30"
                    }`}
                  >
                    手动填写
                  </button>
                </div>
              )}

              {entryMode === "bangumi" && !prefill ? (
                <BangumiSearch
                  onSelect={setPrefill}
                  onEditExisting={handleEditExisting}
                  onUseManual={() => setEntryMode("manual")}
                />
              ) : (
                <>
                  {prefill && (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          资料来自 Bangumi
                        </p>
                        <a
                          href={prefill.bangumiUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          查看原条目
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPrefill(null);
                          setEntryMode("bangumi");
                        }}
                        className="text-xs text-gray-600 hover:text-pink-600"
                      >
                        重新搜索
                      </button>
                    </div>
                  )}
                  <AnimeForm
                    key={prefill ? `bangumi-${prefill.bangumiId}` : "manual"}
                    initial={prefill}
                    suggestedTags={prefill?.suggestedTags ?? []}
                    submitLabel="添加记录"
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                </>
              )}
            </>
          )}
          </div>
        </section>
      )}

      {section === "backups" && (
        <section
          aria-labelledby="admin-tab-backups"
          className="mt-6"
          id="admin-panel-backups"
          role="tabpanel"
        >
          <BackupManager
            collapsible={false}
            currentCount={animeList.length}
            onDataChanged={fetchList}
          />
        </section>
      )}
    </div>
  );
}
