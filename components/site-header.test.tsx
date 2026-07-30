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

  it("gives the brand and management destinations explicit names", () => {
    render(<SiteHeader />);

    expect(
      screen.getByRole("link", { name: "追番记录首页" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("navigation", { name: "主导航" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "管理后台" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });
});
