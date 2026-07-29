// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AdminSectionNav from "./admin-section-nav";

describe("AdminSectionNav", () => {
  it("exposes three accessible tabs and the selected section", () => {
    render(
      <AdminSectionNav
        current="records"
        onChange={vi.fn()}
        recordCount={7}
      />,
    );

    expect(screen.getByRole("tablist", { name: "管理工作区" }))
      .toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "记录" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("tab", { name: "添加记录" }),
    ).toHaveAttribute("aria-selected", "false");
    expect(
      screen.getByRole("tab", { name: "备份恢复" }),
    ).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("requests a section change when another tab is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AdminSectionNav
        current="records"
        onChange={onChange}
        recordCount={0}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "备份恢复" }));
    expect(onChange).toHaveBeenCalledWith("backups");
  });
});
