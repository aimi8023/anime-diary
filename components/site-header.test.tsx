// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SiteHeader from "./site-header";

describe("SiteHeader", () => {
  it("links browsing to the archive without a client search dialog", () => {
    render(<SiteHeader />);

    expect(
      screen.getByRole("link", { name: "浏览档案" }),
    ).toHaveAttribute("href", "/#archive");
    expect(
      screen.queryByRole("dialog", { name: "搜索" }),
    ).not.toBeInTheDocument();
  });

  it("keeps home, brand, and the secondary management entry", () => {
    render(<SiteHeader />);

    expect(
      screen.getByRole("link", { name: "追番记录" }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "管理" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });
});
