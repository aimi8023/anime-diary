// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SiteHeader from "./site-header";

const navigation = vi.hoisted(() => ({
  pathname: "/",
  search: "",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

function renderHeader() {
  return render(<SiteHeader />);
}

describe("SiteHeader", () => {
  beforeEach(() => {
    navigation.pathname = "/";
    navigation.search = "";
  });

  it("no longer exposes a search launcher", () => {
    renderHeader();

    expect(
      screen.queryByRole("button", { name: "搜索档案" }),
    ).not.toBeInTheDocument();
  });

  it("shows how many archive conditions are active", () => {
    navigation.search =
      "q=%E9%9F%B3%E4%B9%90&year=2024&season=%E6%98%A5&rating=8";
    renderHeader();

    expect(
      screen.getByLabelText("4 个筛选条件生效中"),
    ).toHaveTextContent("筛选中 4");
  });

  it("hides the active filter hint when nothing is filtered", () => {
    renderHeader();

    expect(screen.queryByText(/筛选中/)).not.toBeInTheDocument();
  });

  it("gives the brand and management destinations explicit names", () => {
    renderHeader();

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
