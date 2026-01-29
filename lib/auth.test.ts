import { describe, expect, it, vi } from "vitest";

import { successResponse, errorResponse, ApiResponse } from "./auth";

/**
 * auth 模組測試
 * 測試統一 API 回應格式
 */
describe("auth module", () => {
  describe("successResponse", () => {
    it("should create a success response with data", async () => {
      const response = successResponse({
        folder: { key: "test", name: "test" },
      });
      const body = (await response.json()) as ApiResponse<{
        folder: { key: string; name: string };
      }>;

      expect(body.success).toBe(true);
      expect(body.data).toEqual({ folder: { key: "test", name: "test" } });
      expect(body.error).toBeUndefined();
    });

    it("should use default status 200", () => {
      const response = successResponse({ test: true });
      expect(response.status).toBe(200);
    });

    it("should allow custom status code", () => {
      const response = successResponse({ created: true }, 201);
      expect(response.status).toBe(201);
    });
  });

  describe("errorResponse", () => {
    it("should create an error response with message", async () => {
      const response = errorResponse("Something went wrong");
      const body = (await response.json()) as ApiResponse<never>;

      expect(body.success).toBe(false);
      expect(body.error).toBe("Something went wrong");
      expect(body.data).toBeUndefined();
    });

    it("should include details when provided", async () => {
      const response = errorResponse("Validation failed", 400, {
        field: "name",
        reason: "required",
      });
      const body = (await response.json()) as ApiResponse<never>;

      expect(body.success).toBe(false);
      expect(body.error).toBe("Validation failed");
      expect(body.details).toEqual({ field: "name", reason: "required" });
    });

    it("should use correct status code", () => {
      const response = errorResponse("Unauthorized", 401);
      expect(response.status).toBe(401);
    });

    it("should default to status 400", () => {
      const response = errorResponse("Bad request");
      expect(response.status).toBe(400);
    });
  });
});
