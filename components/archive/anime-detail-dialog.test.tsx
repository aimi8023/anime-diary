// @vitest-environment jsdom

import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Anime } from "@/lib/types";
import AnimeDetailDialog from "./anime-detail-dialog";

const completeAnime: Anime = {
  id: "anime-1",
  title: "孤独摇滚！",
  originalTitle: "ぼっち・ざ・ろっく！",
  season: "2024夏",
  cover: "https://lain.bgm.tv/pic/cover/l/example.jpg",
  rating: 9,
  comment: "乐队成长的故事",
  episodes: 12,
  tags: ["音乐", "日常"],
  bangumiId: 328609,
  bangumiUrl: "https://bgm.tv/subject/328609",
  airDate: "2022-10-09",
  createdAt: "2024-07-01T00:00:00.000Z",
};

function DialogHarness({
  anime = completeAnime,
}: {
  anime?: Anime;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        打开详情
      </button>
      <AnimeDetailDialog
        anime={open ? anime : null}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

describe("AnimeDetailDialog", () => {
  it("locks background scrolling while open and restores the previous value", () => {
    document.body.style.overflow = "clip";
    const onClose = () => {};
    const { rerender, unmount } = render(
      <AnimeDetailDialog anime={completeAnime} onClose={onClose} />,
    );

    try {
      expect(document.body.style.overflow).toBe("hidden");
      rerender(<AnimeDetailDialog anime={null} onClose={onClose} />);
      expect(document.body.style.overflow).toBe("clip");
    } finally {
      unmount();
      document.body.style.overflow = "";
    }
  });

  it("shows complete metadata, closes with Escape, and restores focus", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const opener = screen.getByRole("button", { name: "打开详情" });
    await user.click(opener);

    const dialog = screen.getByRole("dialog", {
      name: "孤独摇滚！",
    });
    expect(dialog.parentElement).toBe(document.body);
    expect(
      screen.getByRole("region", { name: "作品封面" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "追番详情" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "孤独摇滚！封面" }),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent("ぼっち・ざ・ろっく！");
    expect(dialog).toHaveTextContent("我的感想");
    expect(dialog).toHaveTextContent("乐队成长的故事");
    expect(dialog).toHaveTextContent("12 话");
    expect(dialog).toHaveTextContent("2022-10-09");
    expect(dialog).toHaveTextContent("音乐");
    expect(
      screen.getByRole("link", { name: "在 Bangumi 查看" }),
    ).toHaveAttribute("href", completeAnime.bangumiUrl);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("omits missing optional metadata and closes from its close button", async () => {
    const user = userEvent.setup();
    render(
      <DialogHarness
        anime={{
          ...completeAnime,
          originalTitle: undefined,
          bangumiUrl: undefined,
          airDate: undefined,
          episodes: 0,
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "打开详情" }));
    expect(
      screen.queryByRole("link", { name: "在 Bangumi 查看" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("12 话")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "关闭详情" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps details readable when a cover is unavailable", async () => {
    const user = userEvent.setup();
    render(
      <DialogHarness anime={{ ...completeAnime, cover: "" }} />,
    );

    await user.click(screen.getByRole("button", { name: "打开详情" }));

    expect(screen.getByText("封面暂缺")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "追番详情" }),
    ).toHaveTextContent("孤独摇滚！");
  });

  it("closes from the backdrop but not from clicks inside the panel", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "打开详情" }));
    const dialog = screen.getByRole("dialog");
    await user.click(screen.getByRole("heading", { name: "孤独摇滚！" }));
    expect(dialog).toBeInTheDocument();

    await user.click(dialog);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
