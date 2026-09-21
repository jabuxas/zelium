import { apiClient } from "@/src/shared/api/client";
import { ApiError, DependencyConflictError } from "@/src/shared/api/errors";

jest.mock("@/src/shared/config/env", () => ({
  apiBaseUrl: "http://localhost:8000/api",
}));

function mockFetch(
  handler: (
    url: string,
    opts?: RequestInit,
  ) => { status: number; body: unknown },
) {
  global.fetch = jest.fn(async (url: RequestInfo | URL, opts?: RequestInit) => {
    const { status, body } = handler(url.toString(), opts);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () =>
        typeof body === "string" ? body : JSON.stringify(body),
      headers: new Headers({ "content-type": "application/json" }),
    } as Response;
  }) as typeof fetch;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("apiClient", () => {
  describe("successful requests", () => {
    it("builds URL from apiBaseUrl + path", async () => {
      mockFetch((url) => ({ status: 200, body: { ok: true } }));

      await apiClient("/patrimonios");

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/patrimonios",
        expect.objectContaining({
          headers: expect.any(Headers),
        }),
      );
    });

    it("sets Content-Type to application/json by default", async () => {
      mockFetch((_url, opts) => {
        const headers = new Headers(opts?.headers);
        expect(headers.get("Content-Type")).toBe("application/json");
        return { status: 200, body: {} };
      });

      await apiClient("/test");
    });

    it("returns parsed JSON body on 200", async () => {
      const data = { id: 1, name: "test" };
      mockFetch(() => ({ status: 200, body: data }));

      const result = await apiClient("/test");

      expect(result).toEqual(data);
    });

    it("returns null on 204", async () => {
      mockFetch(() => ({ status: 204, body: null }));

      const result = await apiClient("/test");

      expect(result).toBeNull();
    });

    it("passes through custom headers", async () => {
      mockFetch((_url, opts) => {
        const headers = new Headers(opts?.headers);
        expect(headers.get("X-Custom")).toBe("value");
        return { status: 200, body: {} };
      });

      await apiClient("/test", { headers: { "X-Custom": "value" } });
    });

    it("passes through custom method", async () => {
      mockFetch((_url, opts) => {
        expect(opts?.method).toBe("DELETE");
        return { status: 204, body: null };
      });

      await apiClient("/test/1", { method: "DELETE" });
    });
  });

  describe("error handling", () => {
    it("throws ApiError on 400 with error message", async () => {
      mockFetch(() => ({
        status: 400,
        body: { error: "Bad request" },
      }));

      await expect(apiClient("/test")).rejects.toThrow(ApiError);
      await expect(apiClient("/test")).rejects.toThrow("Bad request");
    });

    it("throws ApiError with status on generic error", async () => {
      mockFetch(() => ({
        status: 500,
        body: { error: "Internal server error" },
      }));

      try {
        await apiClient("/test");
        fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).status).toBe(500);
      }
    });

    it("throws ApiError with payload attached", async () => {
      const payload = {
        error: "Validation failed",
        details: ["field required"],
      };
      mockFetch(() => ({ status: 422, body: payload }));

      try {
        await apiClient("/test");
        fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).payload).toEqual(payload);
      }
    });

    it("throws DependencyConflictError on 409 with error field", async () => {
      const payload = {
        error: "Cannot delete: has dependencies",
        patrimonios: [{ id: 1 }],
        ambientes: [{ id: 2 }],
      };
      mockFetch(() => ({ status: 409, body: payload }));

      try {
        await apiClient("/test/1", { method: "DELETE" });
        fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(DependencyConflictError);
        expect((e as DependencyConflictError).status).toBe(409);
        expect((e as DependencyConflictError).patrimonios).toEqual([{ id: 1 }]);
        expect((e as DependencyConflictError).ambientes).toEqual([{ id: 2 }]);
        expect((e as DependencyConflictError).message).toBe(
          "Cannot delete: has dependencies",
        );
      }
    });

    it("throws generic ApiError on 409 without error field", async () => {
      mockFetch(() => ({ status: 409, body: { message: "conflict" } }));

      await expect(apiClient("/test")).rejects.toThrow(ApiError);
      await expect(apiClient("/test")).rejects.not.toThrow(
        DependencyConflictError,
      );
    });

    it("throws ApiError on non-JSON error response", async () => {
      global.fetch = jest.fn(async () => {
        return {
          ok: false,
          status: 500,
          text: async () => "Internal Server Error",
          headers: new Headers({ "content-type": "text/plain" }),
        } as Response;
      }) as typeof fetch;

      await expect(apiClient("/test")).rejects.toThrow(ApiError);
    });
  });
});
