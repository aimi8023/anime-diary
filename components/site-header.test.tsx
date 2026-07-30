// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArchiveSearchProvider } from "./archive/archive-search-context";
import SiteHeader from "./site-header";

const navigation = vi.hoisted(() => ({
  pathname: "/",
  push: vi.fn(),
  search: "",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

function renderHeader() {
  return render(
    <ArchiveSearchProvider>
      <SiteHeader />
    </ArchiveSearchProvider>,
  );
}

describe("SiteHeader", () => {
  beforeEach(() => {
    navigation.pathname = "/";
    navigation.push.mockReset();
    navigation.search = "";
  });

  it("opens archive search from the navigation", async () => {
    const user = userEvent.setup();
    renderHeader();

    const searchButton = screen.getByRole("button", {
      name: "搜索档案",
    });
    expect(searchButton).toHaveAttribute("aria-expanded", "false");

    await user.click(searchButton);

    expect(searchButton).toHaveAttribute("aria-expanded", "true");
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("returns home before opening search from another page", async () => {
    const user = userEvent.setup();
    navigation.pathname = "/admin";
    renderHeader();

    await user.click(screen.getByRole("button", { name: "搜索档案" }));

    expect(navigation.push).toHaveBeenCalledWith("/");
  });

  it("shows the number of active archive conditions", () => {
    navigation.search =
      "q=%E9%9F%B3%E4%B9%90&year=2024&tag=%E6%97%A5%E5%B8%B8,%E6%B2%BB%E6%84%88";
    renderHeader();

    expect(screen.getByLabelText("4 个筛选条件")).toHaveTextContent("4");
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
