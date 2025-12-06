import { NextRequest, NextResponse } from 'next/server';
import {
  createFolder,
  deleteFile,
  deleteFolder,
  listMedia,
  moveFile,
  moveFolder,
  renameFile,
  renameFolder
} from '@/lib/r2';

// This route must run on the Edge runtime to be compatible with Cloudflare Pages
// builds. The R2 client in lib/r2.ts is implemented with fetch so it works here.
export const runtime = 'edge';

function ensureAdmin(request: NextRequest) {
  const adminToken = process.env.ADMIN_ACCESS_TOKEN;
  if (!adminToken) {
    console.error('Missing ADMIN_ACCESS_TOKEN');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const providedToken = request.headers.get('x-admin-token');
  if (!providedToken || providedToken !== adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

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
    const authError = ensureAdmin(request);
    if (authError) return authError;

    const body = await request.json();

    if (body?.action === 'validate') {
      return NextResponse.json({ ok: true });
    }

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
    const authError = ensureAdmin(request);
    if (authError) return authError;

    const body = await request.json();

    if (body?.action !== 'rename' && body?.action !== 'move') {
      return NextResponse.json({ error: '未知的請求' }, { status: 400 });
    }

    if (!body.key) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    if (body.action === 'rename') {
      if (!body.newName) {
        return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
      }

      if (body.isFolder) {
        const folder = await renameFolder(body.key, body.newName);
        return NextResponse.json({ folder });
      }

      const media = await renameFile(body.key, body.newName);
      return NextResponse.json({ media });
    }

    if (!('targetPrefix' in body)) {
      return NextResponse.json({ error: '缺少目標路徑' }, { status: 400 });
    }

    if (body.isFolder) {
      const folder = await moveFolder(body.key, body.targetPrefix || '');
      return NextResponse.json({ folder });
    }

    const media = await moveFile(body.key, body.targetPrefix || '');
    return NextResponse.json({ media });
  } catch (error) {
    console.error('Failed to rename item', error);
    return NextResponse.json({ error: '重新命名失敗' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authError = ensureAdmin(request);
    if (authError) return authError;

    const body = await request.json();

    if (body?.action !== 'delete') {
      return NextResponse.json({ error: '未知的請求' }, { status: 400 });
    }

    if (!body.key) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    if (body.isFolder) {
      await deleteFolder(body.key, { moveContentsToParent: true });
      return NextResponse.json({});
    }

    await deleteFile(body.key);
    return NextResponse.json({});
  } catch (error) {
    console.error('Failed to delete item', error);
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
