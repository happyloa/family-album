import { NextResponse } from 'next/server';

import {
  ADMIN_RATE_LIMIT_MAX_FAILURES,
  ADMIN_RATE_LIMIT_WINDOW_MS,
  AdminRateLimiter,
  createAdminRateLimiter
} from './admin-rate-limit';

/**
 * 統一 API 回應格式
 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
};

/**
 * 建立成功回應
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * 建立錯誤回應
 */
export function errorResponse(
  error: string,
  status = 400,
  details?: unknown
): NextResponse<ApiResponse<never>> {
  const body: ApiResponse<never> = { success: false, error };
  if (details !== undefined) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

/**
 * 驗證管理員權限與處理速率限制
 * 統一的認證中介函式，被 media 和 upload API 共用
 */
export async function ensureAdmin(
  request: Request,
  rateLimiter: AdminRateLimiter
): Promise<NextResponse<ApiResponse<never>> | null> {
  const adminToken = process.env.ADMIN_ACCESS_TOKEN;
  if (!adminToken) {
    console.error('Missing ADMIN_ACCESS_TOKEN');
    return errorResponse('Server configuration error', 500);
  }

  const providedToken = request.headers.get('x-admin-token');
  if (!providedToken || providedToken !== adminToken) {
    const failures = await rateLimiter.recordFailure();
    const retryAfterMinutes = Math.ceil(ADMIN_RATE_LIMIT_WINDOW_MS / 60000);
    if (failures >= ADMIN_RATE_LIMIT_MAX_FAILURES) {
      return errorResponse(
        `因密碼輸入不正確，請於 ${retryAfterMinutes} 分鐘後再試。`,
        429,
        { retryAfterMinutes }
      );
    }
    const remainingAttempts = Math.max(ADMIN_RATE_LIMIT_MAX_FAILURES - failures, 0);
    return errorResponse('Unauthorized', 401, { remainingAttempts });
  }

  await rateLimiter.reset();
  return null;
}

/**
 * 建立帶有認證檢查的請求處理器
 * 封裝速率限制器建立與認證邏輯
 */
export async function withAdminAuth<T>(
  request: Request,
  handler: () => Promise<NextResponse<ApiResponse<T>>>
): Promise<NextResponse<ApiResponse<T | never>>> {
  const rateLimiter = createAdminRateLimiter(request);
  const rateLimitError = await rateLimiter.check();
  if (rateLimitError) return rateLimitError as NextResponse<ApiResponse<never>>;

  const authError = await ensureAdmin(request, rateLimiter);
  if (authError) return authError;

  return handler();
}
