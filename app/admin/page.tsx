"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Anime, AnimeInput } from "@/lib/types";
import type { BangumiPrefill } from "@/lib/bangumi/types";
import AnimeList from "@/components/anime-list";
import AnimeForm from "@/components/anime-form";
import BangumiSearch from "@/components/bangumi-search";
import BackupManager from "@/components/backup-manager";
import QuickRateDialog from "@/components/admin/quick-rate-dialog";
import SeasonBatchAdd from "@/components/admin/season-batch-add";
import AdminSectionNav, {
  type AdminSection,
} from "@/components/admin/admin-section-nav";
import ConfirmDialog from "@/components/confirm-dialog";
import InlineFeedback from "@/components/feedback/inline-feedback";
import { readApiError } from "@/lib/http/client";

type EntryMode = "bangumi" | "manual" | "season";

async function loadAnimeList(): Promise<Anime[]> {
  const response = await fetch("/api/anime");
  if (!response.ok) {
    throw new Error(
      await readApiError(response, "读取记录失败"),
    );
  }
  return response.json();
}

export default function AdminPage() {
  const router = useRouter();
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [editing, setEditing] = useState<Anime | null>(null);
  const [section, setSection] = useState<AdminSection>("records");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Anime | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [pendingDiscard, setPendingDiscard] = useState<(() => void) | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [entryMode, setEntryMode] = useState<EntryMode>("bangumi");
  const [prefill, setPrefill] = useState<BangumiPrefill | null>(null);
  const [operationError, setOperationError] = useState("");
  const [showUnratedOnly, setShowUnratedOnly] = useState(false);
  const [quickRating, setQuickRating] = useState<Anime | null>(null);

  const fetchList = useCallback(async () => {
    try {
      const data = await loadAnimeList();
      setOperationError("");
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
    // 初始加载复用 fetchList；setState 均发生在 await 之后，
    // 不存在同步级联渲染。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchList();
  }, [fetchList]);

  // Filter by unrated toggle and search query
  const filteredList = animeList.filter((anime) => {
    if (showUnratedOnly && anime.rating !== 0) return false;
    const query = searchQuery.trim().toLowerCase();
    return !query || anime.title.toLowerCase().includes(query);
  });
  const unratedCount = animeList.filter((anime) => anime.rating === 0).length;

  const handleSave = async (data: AnimeInput) => {
    const res = await fetch(
      editing ? `/api/anime/${editing.id}` : "/api/anime",
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
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
      throw new Error(
        await readApiError(res, editing ? "更新失败" : "添加失败"),
      );
    }
    setEditing(null);
    setPrefill(null);
    setEntryMode("bangumi");
    setFormDirty(false);
    setSection("records");
    fetchList();
  };

  const handleDelete = (id: string) => {
    const anime = animeList.find((item) => item.id === id);
    if (!anime) return;
    setOperationError("");
    setPendingDelete(anime);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setDeleting(id);
    try {
      const res = await fetch(`/api/anime/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(await readApiError(res, "删除失败"));
      }
      setPendingDelete(null);
      fetchList();
    } catch (err) {
      setOperationError(
        err instanceof Error ? err.message : "删除失败",
      );
    } finally {
      setDeleting(null);
    }
  };

  const resetEntryAndGo = (nextSection: AdminSection) => {
    setEditing(null);
    setPrefill(null);
    setEntryMode("bangumi");
    setSection(nextSection);
  };

  // 表单有未保存修改时，先经确认再执行目标跳转。
  const requestDiscard = (action: () => void) => {
    if (formDirty) {
      setPendingDiscard(() => action);
      return;
    }
    action();
  };

  const handleCancel = () => requestDiscard(() => resetEntryAndGo("records"));

  const handleStartAdd = () => requestDiscard(() => resetEntryAndGo("entry"));

  const handleEdit = (anime: Anime) =>
    requestDiscard(() => {
      setEditing(anime);
      setPrefill(null);
      setEntryMode("manual");
      setSection("entry");
    });

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
    requestDiscard(() => resetEntryAndGo(nextSection));
  };

  // 有未保存修改时，拦截关闭/刷新页面。
  useEffect(() => {
    if (!formDirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () =>
      window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formDirty]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="ui-kicker">ADMIN WORKSPACE</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--ink)] sm:text-4xl">
            追番管理后台
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            维护记录、添加条目，并在需要时管理备份。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="ui-icon-button ui-button-secondary hover:border-red-200 hover:text-[var(--danger)]"
            title="退出登录"
            aria-label="退出登录"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          className="ui-panel-strong mt-6 p-4 sm:p-6"
          id="admin-panel-records"
          role="tabpanel"
        >
          <div className="mb-5 flex flex-col gap-4 border-b border-[rgba(91,83,112,0.1)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="ui-kicker mb-1">LIBRARY</p>
              <h2 className="text-xl font-black text-[var(--ink)]">
                记录管理
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                共 {animeList.length} 条记录，编辑或删除会自动创建快照。
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <label className="sr-only" htmlFor="admin-record-search">
                  搜索记录
                </label>
                <input
                  className="ui-field min-h-11 w-full px-3 pr-10 text-sm"
                  id="admin-record-search"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索番剧..."
                  type="search"
                  value={searchQuery}
                />
                {searchQuery && (
                  <button
                    aria-label="清除记录搜索"
                    className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-[var(--ink-subtle)] hover:bg-white/70"
                    onClick={() => setSearchQuery("")}
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                aria-pressed={showUnratedOnly}
                className={`ui-chip min-h-11 whitespace-nowrap px-3 text-xs font-bold ${
                  showUnratedOnly ? "ui-chip-active" : ""
                }`}
                onClick={() => setShowUnratedOnly((value) => !value)}
                type="button"
              >
                只看未评分{unratedCount > 0 ? ` ${unratedCount}` : ""}
              </button>
              <button
                className="ui-button ui-button-primary whitespace-nowrap rounded-xl"
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
            <div className="py-16 text-center text-sm font-medium text-[var(--ink-muted)]">
              正在读取记录…
            </div>
          ) : filteredList.length === 0 && searchQuery ? (
            <div className="rounded-2xl border border-dashed border-[rgba(91,83,112,0.2)] bg-white/35 py-16 text-center">
              <p className="text-lg font-bold text-[var(--ink)]">
                未找到相关番剧
              </p>
              <p className="mt-2 text-sm text-[var(--ink-muted)]">试试其他关键词吧</p>
              <button
                className="ui-button ui-button-secondary mt-4"
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
              onQuickRate={setQuickRating}
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
          <div className="ui-panel-strong p-4 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="ui-kicker mb-1">ENTRY</p>
                <h2 className="text-xl font-black text-[var(--ink)]">
                  {editing ? "编辑记录" : "添加记录"}
                </h2>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  {editing
                    ? `正在编辑《${editing.title}》`
                    : "支持按季度批量入库，或从 Bangumi 查找、手动填写。"}
                </p>
              </div>
              <button
                className="ui-button ui-button-secondary"
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
              onCancel={handleCancel}
              onDirtyChange={setFormDirty}
              onSave={handleSave}
            />
          ) : (
            <>
              {!prefill && (
                <div className="mb-5 grid grid-cols-1 gap-1.5 rounded-2xl border border-white/70 bg-white/38 p-1.5 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setEntryMode("season")}
                    className={`min-h-11 rounded-xl text-sm font-bold transition-colors ${
                      entryMode === "season"
                        ? "bg-white text-[var(--accent-strong)] shadow-sm"
                        : "text-[var(--ink-muted)] hover:bg-white/45"
                    }`}
                  >
                    季度批量
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryMode("bangumi")}
                    className={`min-h-11 rounded-xl text-sm font-bold transition-colors ${
                      entryMode === "bangumi"
                        ? "bg-white text-[var(--accent-strong)] shadow-sm"
                        : "text-[var(--ink-muted)] hover:bg-white/45"
                    }`}
                  >
                    从 Bangumi 搜索
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryMode("manual")}
                    className={`min-h-11 rounded-xl text-sm font-bold transition-colors ${
                      entryMode === "manual"
                        ? "bg-white text-[var(--info)] shadow-sm"
                        : "text-[var(--ink-muted)] hover:bg-white/45"
                    }`}
                  >
                    手动填写
                  </button>
                </div>
              )}

              {entryMode === "season" && !prefill ? (
                <SeasonBatchAdd
                  onCreated={fetchList}
                  onGoToUnrated={() => {
                    setSection("records");
                    setShowUnratedOnly(true);
                  }}
                />
              ) : entryMode === "bangumi" && !prefill ? (
                <BangumiSearch
                  onSelect={setPrefill}
                  onEditExisting={handleEditExisting}
                  onUseManual={() => setEntryMode("manual")}
                />
              ) : (
                <>
                  {prefill && (
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-blue-200/70 bg-[var(--info-soft)] px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-[var(--ink)]">
                          资料来自 Bangumi
                        </p>
                        <a
                          href={prefill.bangumiUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-[var(--info)] hover:underline"
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
                        className="ui-button min-h-9 px-3 text-xs text-[var(--ink-muted)] hover:bg-white/70 hover:text-[var(--accent-strong)]"
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
                    onCancel={handleCancel}
                    onDirtyChange={setFormDirty}
                    onSave={handleSave}
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

      <ConfirmDialog
        busy={deleting === pendingDelete?.id}
        confirmLabel="确认删除"
        danger
        description="删除前会自动创建快照，之后可以在备份工作区恢复。该记录会立即从公开档案中消失。"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          void confirmDelete();
        }}
        open={pendingDelete !== null}
        title={`删除《${pendingDelete?.title ?? ""}》？`}
      />

      <ConfirmDialog
        confirmLabel="放弃修改"
        danger
        description="表单里有未保存的修改，离开后将无法恢复。"
        onCancel={() => setPendingDiscard(null)}
        onConfirm={() => {
          const action = pendingDiscard;
          setPendingDiscard(null);
          setFormDirty(false);
          action?.();
        }}
        open={pendingDiscard !== null}
        title="放弃未保存的修改？"
      />

      <QuickRateDialog
        anime={quickRating}
        key={quickRating?.id ?? "quick-rate-closed"}
        onClose={() => setQuickRating(null)}
        onSaved={fetchList}
      />
    </div>
  );
}
