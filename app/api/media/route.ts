import { NextResponse } from 'next/server';
import { listMedia } from '@/lib/r2';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const media = await listMedia();
    return NextResponse.json({ media });
  } catch (error) {
    console.error('Failed to list media', error);
    return NextResponse.json({ error: '無法載入媒體列表' }, { status: 500 });
  }
}
