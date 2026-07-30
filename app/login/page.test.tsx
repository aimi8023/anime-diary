// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LoginPage", () => {
  it("describes the single management task before requesting a password", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { name: "欢迎回来" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("输入密码进入追番管理后台"),
    ).toBeInTheDocument();
  });

  it("shows a rate-limit response as an accessible inline error", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "登录尝试过于频繁，请稍后再试",
            code: "rate_limited",
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText("输入管理密码"), "wrong");
    await user.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "登录尝试过于频繁，请稍后再试",
    );
    expect(screen.getByRole("button", { name: "登录" })).toBeEnabled();
  });
});
