// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AnimeForm from "./anime-form";

describe("AnimeForm Bangumi prefill", () => {
  it("announces save failures as an inline alert", async () => {
    const user = userEvent.setup();
    render(
      <AnimeForm
        initial={{
          title: "孤独摇滚！",
          season: "2022冬",
          cover: "",
          rating: 9.5,
          comment: "",
          episodes: 12,
          tags: [],
        }}
        onSave={vi.fn().mockRejectedValue(new Error("保存暂时失败"))}
        onCancel={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "更新" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "保存暂时失败",
    );
  });

  it("keeps suggested tags opt-in and preserves source metadata on save", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <AnimeForm
        initial={{
          title: "孤独摇滚！",
          season: "2022冬",
          cover: "https://lain.bgm.tv/cover.jpg",
          rating: 8.5,
          comment: "",
          episodes: 12,
          tags: [],
          bangumiId: 352821,
          bangumiUrl: "https://bgm.tv/subject/352821",
          originalTitle: "ぼっち・ざ・ろっく！",
          airDate: "2022-10-09",
        }}
        suggestedTags={[" 音乐 ", "青春", "音乐", ""]}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );

    expect(
      screen.getByPlaceholderText("例如：葬送的芙莉莲"),
    ).toHaveValue("孤独摇滚！");
    expect(screen.getAllByRole("button", { name: "音乐" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "青春" })).toBeInTheDocument();
    expect(screen.queryByTitle("删除标签")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "音乐" }));

    expect(screen.queryByRole("button", { name: "音乐" })).not.toBeInTheDocument();
    expect(screen.getByText("音乐")).toBeInTheDocument();
    expect(screen.getAllByTitle("删除标签")).toHaveLength(1);

    const manualInput = screen.getByPlaceholderText(
      "输入标签后按回车或点击添加",
    );
    await user.type(manualInput, "年度最佳{Enter}");
    expect(screen.getByText("年度最佳")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "更新" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "孤独摇滚！",
        season: "2022冬",
        tags: ["音乐", "年度最佳"],
        bangumiId: 352821,
        bangumiUrl: "https://bgm.tv/subject/352821",
        originalTitle: "ぼっち・ざ・ろっく！",
        airDate: "2022-10-09",
      }),
    );
  });
});
