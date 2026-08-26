import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom 未实现 matchMedia，供响应式/动效相关组件使用。
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom 未实现元素的平滑滚动方法，测试中可用 spy 覆盖。
if (typeof Element !== "undefined" && !Element.prototype.scrollBy) {
  Element.prototype.scrollBy = () => undefined;
}

afterEach(() => cleanup());
