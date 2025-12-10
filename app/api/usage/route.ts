import { NextResponse } from 'next/server';

import { getBucketUsage } from '@/lib/r2';

// Edge runtime to align with other R2 operations
export const runtime = 'edge';

export async function GET() {
  try {
    const usage = await getBucketUsage();
    return NextResponse.json(usage);
  } catch (error) {
    console.error('Failed to load bucket usage', error);
    return NextResponse.json({ error: '無法取得 bucket 使用量' }, { status: 500 });
  }
}
