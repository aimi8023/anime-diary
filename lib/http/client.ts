import type { ApiErrorBody } from "./types";

export async function readApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  if (!response.headers.get("content-type")?.toLowerCase().includes("json")) {
    return fallback;
  }

  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    return typeof body.error === "string" && body.error.trim()
      ? body.error.trim()
      : fallback;
  } catch {
    return fallback;
  }
}
