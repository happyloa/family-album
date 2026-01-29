import { describe, expect, it } from "vitest";

import { fetchWithRetry } from "./fetch-with-retry";

/**
 * fetchWithRetry 測試
 * 測試重試機制與錯誤處理
 */
describe("fetchWithRetry", () => {
  it("should return response on successful fetch", async () => {
    const mockResponse = new Response(JSON.stringify({ data: "test" }), {
      status: 200,
    });
    globalThis.fetch = async () => mockResponse;

    const response = await fetchWithRetry("https://example.com/api");
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ data: "test" });
  });

  it("should retry on 5xx errors", async () => {
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts++;
      if (attempts < 3) {
        return new Response(null, { status: 503 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    const response = await fetchWithRetry(
      "https://example.com/api",
      undefined,
      {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 50,
      }
    );

    expect(response.status).toBe(200);
    expect(attempts).toBe(3);
  });

  it("should not retry on 4xx errors by default", async () => {
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts++;
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
      });
    };

    const response = await fetchWithRetry(
      "https://example.com/api",
      undefined,
      {
        maxRetries: 3,
        initialDelayMs: 10,
      }
    );

    expect(response.status).toBe(404);
    expect(attempts).toBe(1);
  });

  it("should call onRetry callback when retrying", async () => {
    let retryCount = 0;
    globalThis.fetch = async () => {
      if (retryCount < 2) {
        return new Response(null, { status: 500 });
      }
      return new Response(null, { status: 200 });
    };

    await fetchWithRetry("https://example.com/api", undefined, {
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 50,
      onRetry: (attempt) => {
        retryCount = attempt;
      },
    });

    expect(retryCount).toBe(2);
  });

  it("should throw on network error after max retries", async () => {
    globalThis.fetch = async () => {
      throw new Error("Network error");
    };

    await expect(
      fetchWithRetry("https://example.com/api", undefined, {
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 50,
      })
    ).rejects.toThrow("Network error");
  });
});
