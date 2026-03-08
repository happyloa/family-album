import { NextResponse } from 'next/server';

import {
  ADMIN_RATE_LIMIT_MAX_FAILURES,
  ADMIN_RATE_LIMIT_WINDOW_MS,
  AdminRateLimiter,
  createAdminRateLimiter
} from './admin-rate-limit';

/**
 * 驗證管理員權限與處理速率限制
 * 統一的認證函式，被 media 和 upload API 共用
 */
async function ensureAdmin(request: Request, rateLimiter: AdminRateLimiter) {
  const adminToken = process.env.ADMIN_ACCESS_TOKEN;
  if (!adminToken) {
    console.error('Missing ADMIN_ACCESS_TOKEN');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const providedToken = request.headers.get('x-admin-token');
  if (!providedToken || providedToken !== adminToken) {
    const failures = await rateLimiter.recordFailure();
    const retryAfterMinutes = Math.ceil(ADMIN_RATE_LIMIT_WINDOW_MS / 60000);
    if (failures >= ADMIN_RATE_LIMIT_MAX_FAILURES) {
      return NextResponse.json(
        { error: `因密碼輸入不正確，請於 ${retryAfterMinutes} 分鐘後再試。`, retryAfterMinutes },
        { status: 429 }
      );
    }
    const remainingAttempts = Math.max(ADMIN_RATE_LIMIT_MAX_FAILURES - failures, 0);
    return NextResponse.json({ error: 'Unauthorized', remainingAttempts }, { status: 401 });
  }

  await rateLimiter.reset();
  return null;
}

/**
 * 執行管理員認證流程（速率限制檢查 + 密碼驗證）
 * 回傳 NextResponse 表示認證失敗，null 表示通過
 */
export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  const rateLimiter = createAdminRateLimiter(request);
  const rateLimitError = await rateLimiter.check();
  if (rateLimitError) return rateLimitError;

  return ensureAdmin(request, rateLimiter);
}
