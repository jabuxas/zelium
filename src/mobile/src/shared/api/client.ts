import { apiBaseUrl } from "@/src/shared/config/env";

import {
  ApiError,
  DependencyConflictError,
  type DependencyConflictPayload,
} from "@/src/shared/api/errors";

const JSON_CONTENT_TYPE = "application/json";

function buildUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!text) {
    return null;
  }

  if (contentType.includes(JSON_CONTENT_TYPE)) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function createErrorFromPayload(status: number, payload: unknown): Error {
  if (
    status === 409 &&
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload
  ) {
    return new DependencyConflictError(payload as DependencyConflictPayload);
  }

  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const message = String(
      (payload as { error?: unknown }).error ?? "Request failed",
    );
    return new ApiError(message, status, payload);
  }

  return new ApiError(`Request failed with status ${status}`, status, payload);
}

export async function apiClient(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const headers = new Headers(options.headers);

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (
    !isFormData &&
    !headers.has("Content-Type") &&
    !headers.has("content-type")
  ) {
    headers.set("Content-Type", JSON_CONTENT_TYPE);
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  if (response.ok) {
    if (response.status === 204) {
      return null;
    }

    return parseResponseBody(response);
  }

  const payload = await parseResponseBody(response);
  throw createErrorFromPayload(response.status, payload);
}
