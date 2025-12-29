import { NextResponse } from 'next/server';

import { getBucketUsage } from '@/lib/r2';
import {
  ADMIN_RATE_LIMIT_MAX_FAILURES,
  ADMIN_RATE_LIMIT_WINDOW_MS,
  AdminRateLimiter,
  createAdminRateLimiter
} from '@/lib/admin-rate-limit';

// Edge runtime to align with other R2 operations
export const runtime = 'edge';

// 驗證管理員權限與處理速率限制
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
 * GET: 查詢 Bucket 使用量
 * 若有設定 CLOUDFLARE_API_TOKEN，會直接查詢 API；否則透過列舉檔案計算總和。
 */
export async function GET(request: Request) {
  try {
    const rateLimiter = createAdminRateLimiter(request);
    const rateLimitError = await rateLimiter.check();
    if (rateLimitError) return rateLimitError;
    const authError = await ensureAdmin(request, rateLimiter);
    if (authError) return authError;

    const usage = await getBucketUsage();
    return NextResponse.json(usage);
  } catch (error) {
    console.error('Failed to load bucket usage', error);
    return NextResponse.json({ error: '無法取得 bucket 使用量' }, { status: 500 });
  }
}
