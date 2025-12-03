import { NextRequest, NextResponse } from 'next/server';
import { createFolder, listMedia, renameFile, renameFolder } from '@/lib/r2';

// The AWS SDK for JavaScript (v3) relies on Node.js APIs that aren't available
// in the Edge runtime, so this route must run on the Node.js runtime.
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const prefix = request.nextUrl.searchParams.get('prefix') || '';
    const media = await listMedia(prefix);
    return NextResponse.json(media);
  } catch (error) {
    console.error('Failed to list media', error);
    return NextResponse.json({ error: '無法載入媒體列表' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body?.action !== 'create-folder') {
      return NextResponse.json({ error: '未知的請求' }, { status: 400 });
    }

    if (!body.name) {
      return NextResponse.json({ error: '資料夾名稱不可為空' }, { status: 400 });
    }

    const folder = await createFolder(body.prefix || '', body.name);
    return NextResponse.json({ folder });
  } catch (error) {
    console.error('Failed to create folder', error);
    return NextResponse.json({ error: '建立資料夾失敗' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (body?.action !== 'rename') {
      return NextResponse.json({ error: '未知的請求' }, { status: 400 });
    }

    if (!body.key || !body.newName) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    if (body.isFolder) {
      const folder = await renameFolder(body.key, body.newName);
      return NextResponse.json({ folder });
    }

    const media = await renameFile(body.key, body.newName);
    return NextResponse.json({ media });
  } catch (error) {
    console.error('Failed to rename item', error);
    return NextResponse.json({ error: '重新命名失敗' }, { status: 500 });
  }
}
