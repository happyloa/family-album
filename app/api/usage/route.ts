import { NextResponse } from 'next/server';

import { getBucketUsage } from '@/lib/r2';
import { AdminRateLimiter, createAdminRateLimiter } from '@/lib/admin-rate-limit';

// Edge runtime to align with other R2 operations
export const runtime = 'edge';

async function ensureAdmin(request: Request, rateLimiter: AdminRateLimiter) {
  const adminToken = process.env.ADMIN_ACCESS_TOKEN;
  if (!adminToken) {
    console.error('Missing ADMIN_ACCESS_TOKEN');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const providedToken = request.headers.get('x-admin-token');
  if (!providedToken || providedToken !== adminToken) {
    await rateLimiter.recordFailure();
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await rateLimiter.reset();
  return null;
}

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
