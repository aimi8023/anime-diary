// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import BackupManager from "./backup-manager";

const metadata = {
  id: "backup-1",
  createdAt: "2026-07-29T00:00:00.000Z",
  reason: "add",
  recordCount: 2,
  schemaVersion: 1,
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonFile(content: string, name = "anime-backup.json") {
  const file = new File([content], name, { type: "application/json" });
  Object.defineProperty(file, "text", {
    value: async () => content,
  });
  return file;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BackupManager", () => {
  it("shows current and historical backup summaries without snapshot bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ backups: [metadata] })),
    );

    render(<BackupManager currentCount={3} onDataChanged={vi.fn()} />);

    expect(await screen.findByText(/1 个历史版本/)).toBeInTheDocument();
    expect(screen.getByText(/当前 3 条记录/)).toBeInTheDocument();
    expect(screen.getByText("添加记录")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "下载当前数据" }),
    ).toHaveAttribute("href", "/api/backups/export");
    expect(document.body.textContent).not.toContain('"data"');
  });

  it("previews differences before restoring and refreshes after success", async () => {
    const user = userEvent.setup();
    const onDataChanged = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/backups") {
          return response({ backups: [metadata] });
        }
        if (url === "/api/backups/backup-1") {
          return response({
            metadata,
            diff: {
              added: 1,
              removed: 2,
              changed: 3,
              unchanged: 4,
              addedTitles: ["新番"],
              removedTitles: ["旧番"],
              changedTitles: ["改名番"],
            },
          });
        }
        if (
          url === "/api/backups/backup-1/restore" &&
          init?.method === "POST"
        ) {
          return response({
            restoredSnapshot: metadata,
            revision: 5,
            recordCount: 2,
          });
        }
        throw new Error(`unexpected request: ${url}`);
      }),
    );

    render(
      <BackupManager currentCount={3} onDataChanged={onDataChanged} />,
    );

    await user.click(
      await screen.findByRole("button", {
        name: "恢复 2026-07-29T00:00:00.000Z",
      }),
    );

    const dialog = await screen.findByRole("dialog", { name: "恢复备份" });
    expect(within(dialog).getByText("新增 1 条")).toBeInTheDocument();
    expect(within(dialog).getByText("移除 2 条")).toBeInTheDocument();
    expect(within(dialog).getByText("修改 3 条")).toBeInTheDocument();
    expect(onDataChanged).not.toHaveBeenCalled();

    await user.click(
      within(dialog).getByRole("button", { name: "确认恢复" }),
    );

    expect(await screen.findByText("已恢复到所选历史版本")).toBeInTheDocument();
    expect(onDataChanged).toHaveBeenCalledOnce();
  });

  it("previews and applies a JSON import", async () => {
    const user = userEvent.setup();
    const onDataChanged = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/backups") return response({ backups: [] });
        if (url === "/api/backups/import/preview") {
          expect(init?.method).toBe("POST");
          return response({
            format: "legacy",
            recordCount: 1,
            isEmpty: false,
            warnings: [],
            diff: {
              added: 1,
              removed: 0,
              changed: 0,
              unchanged: 0,
              addedTitles: ["新番"],
              removedTitles: [],
              changedTitles: [],
            },
          });
        }
        if (url === "/api/backups/import/apply?confirmEmpty=false") {
          return response({ revision: 4, recordCount: 1 });
        }
        throw new Error(`unexpected request: ${url}`);
      }),
    );

    render(
      <BackupManager currentCount={0} onDataChanged={onDataChanged} />,
    );
    await user.upload(
      screen.getByLabelText("选择备份 JSON"),
      jsonFile("[]"),
    );

    const dialog = await screen.findByRole("dialog", { name: "导入预览" });
    expect(
      within(dialog).getByText(/文件包含 1 条记录/),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "确认导入" }),
    );

    expect(await screen.findByText("备份导入成功")).toBeInTheDocument();
    expect(onDataChanged).toHaveBeenCalledOnce();
  });

  it("requires an extra acknowledgement for an empty import", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/backups") return response({ backups: [] });
        if (url === "/api/backups/import/preview") {
          return response({
            format: "legacy",
            recordCount: 0,
            isEmpty: true,
            warnings: [],
            diff: {
              added: 0,
              removed: 3,
              changed: 0,
              unchanged: 0,
              addedTitles: [],
              removedTitles: [],
              changedTitles: [],
            },
          });
        }
        throw new Error(`unexpected request: ${url}`);
      }),
    );

    render(<BackupManager currentCount={3} onDataChanged={vi.fn()} />);
    await user.upload(
      screen.getByLabelText("选择备份 JSON"),
      jsonFile("[]"),
    );

    const dialog = await screen.findByRole("dialog", { name: "导入预览" });
    const confirm = within(dialog).getByRole("button", { name: "确认导入" });
    expect(confirm).toBeDisabled();
    expect(
      within(dialog).getByText("这会清空当前全部记录"),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("checkbox", {
        name: "我确认导入空备份并清空当前记录",
      }),
    );
    expect(confirm).toBeEnabled();
  });

  it("shows server validation issues without offering an apply action", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === "/api/backups") {
          return response({ backups: [] });
        }
        return response(
          {
            error: "文件不是有效的 JSON",
            issues: [
              { code: "invalid_json", message: "文件不是有效的 JSON" },
            ],
          },
          400,
        );
      }),
    );

    render(<BackupManager currentCount={3} onDataChanged={vi.fn()} />);
    await user.upload(
      screen.getByLabelText("选择备份 JSON"),
      jsonFile("{broken"),
    );

    expect(
      await screen.findByText("文件不是有效的 JSON"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "确认导入" }),
    ).not.toBeInTheDocument();
  });
});
