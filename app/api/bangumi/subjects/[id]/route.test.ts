import { beforeEach, describe, expect, it, vi } from "vitest";
import { BangumiClientError } from "@/lib/bangumi/client";

const clientMock = vi.hoisted(() => ({
  getBangumiPrefill: vi.fn(),
}));

vi.mock("@/lib/bangumi/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bangumi/client")>();
  return { ...actual, getBangumiPrefill: clientMock.getBangumiPrefill };
});

import { GET } from "./route";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/bangumi/subjects/[id]", () => {
  beforeEach(() => clientMock.getBangumiPrefill.mockReset());

  it.each(["0", "-1", "1.5", "abc"])("rejects invalid id %s", async (id) => {
    const response = await GET(
      new Request(`http://localhost/api/bangumi/subjects/${id}`),
      context(id),
    );
    expect(response.status).toBe(400);
    expect(clientMock.getBangumiPrefill).not.toHaveBeenCalled();
  });

  it("returns the mapped editable prefill", async () => {
    const prefill = {
      bangumiId: 352821,
      bangumiUrl: "https://bgm.tv/subject/352821",
      title: "孤独摇滚！",
      originalTitle: "ぼっち・ざ・ろっく！",
      cover: "",
      airDate: "2022-10-09",
      season: "2022冬",
      episodes: 12,
      suggestedTags: ["音乐"],
    };
    clientMock.getBangumiPrefill.mockResolvedValue(prefill);

    const response = await GET(
      new Request("http://localhost/api/bangumi/subjects/352821"),
      context("352821"),
    );

    expect(response.status).toBe(200);
    expect(clientMock.getBangumiPrefill).toHaveBeenCalledWith(352821);
    expect(await response.json()).toEqual(prefill);
  });

  it.each([
    ["not_found", 404],
    ["timeout", 504],
    ["rate_limit", 503],
    ["upstream", 502],
    ["invalid_response", 502],
  ] as const)("maps %s client errors to %i", async (kind, status) => {
    clientMock.getBangumiPrefill.mockImplementationOnce(async () => {
      throw new BangumiClientError(kind, "上游错误");
    });

    const response = await GET(
      new Request("http://localhost/api/bangumi/subjects/352821"),
      context("352821"),
    );
    expect(response.status).toBe(status);
  });
});
