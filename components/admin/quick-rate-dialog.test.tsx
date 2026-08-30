// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Anime } from "@/lib/types";
import QuickRateDialog from "./quick-rate-dialog";

const unrated: Anime = {
  id: "anime-1",
  title: "孤独摇滚！",
  season: "2024夏",
  cover: "",
  rating: 0,
  comment: "",
  episodes: 12,
  tags: [],
  createdAt: "2024-07-01T00:00:00.000Z",
};

describe("QuickRateDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing without a record", () => {
    render(
      <QuickRateDialog anime={null} onClose={vi.fn()} onSaved={vi.fn()} />,
    );
    expect(document.body.textContent).toBe("");
  });

  it("requires a star rating before saving", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn());

    render(
      <QuickRateDialog anime={unrated} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    expect(
      screen.getByRole("button", { name: "保存" }),
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "8 分" }));
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
  });

  it("saves the rating and comment via PUT", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "anime-1" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <QuickRateDialog anime={unrated} onClose={onClose} onSaved={onSaved} />,
    );

    await user.click(screen.getByRole("button", { name: "10 分" }));
    await user.type(
      screen.getByLabelText("感想（可选）"),
      "乐队成长的故事",
    );
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/anime/anime-1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ rating: 10, comment: "乐队成长的故事" }),
      }),
    );
  });

  it("closes on escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    vi.stubGlobal("fetch", vi.fn());

    render(
      <QuickRateDialog anime={unrated} onClose={onClose} onSaved={vi.fn()} />,
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
