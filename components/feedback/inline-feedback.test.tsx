// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import InlineFeedback from "./inline-feedback";

describe("InlineFeedback", () => {
  it("announces errors immediately", () => {
    render(
      <InlineFeedback tone="error" className="extra-class">
        保存失败
      </InlineFeedback>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("保存失败");
    expect(screen.getByRole("alert")).toHaveClass("extra-class");
  });

  it("exposes success messages as status updates", () => {
    render(
      <InlineFeedback tone="success">
        备份导入成功
      </InlineFeedback>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("备份导入成功");
  });
});
