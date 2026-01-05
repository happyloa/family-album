import { NextResponse } from 'next/server';

import { calculateBucketUsage } from '@/lib/r2';

export const runtime = 'edge';

export async function GET() {
  try {
    const usage = await calculateBucketUsage();
    return NextResponse.json(usage);
  } catch (error) {
    console.error('Failed to calculate bucket usage', error);
    return NextResponse.json({ error: '無法取得貯體容量，請稍後再試。' }, { status: 500 });
  }
}

