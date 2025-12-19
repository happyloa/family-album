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
import { MAX_FOLDER_DEPTH, MAX_FOLDER_NAME_LENGTH } from '@/components/media/constants';
import {
  ADMIN_RATE_LIMIT_MAX_FAILURES,
  ADMIN_RATE_LIMIT_WINDOW_MS,
  AdminRateLimiter,
  createAdminRateLimiter
} from '@/lib/admin-rate-limit';

// This route must run on the Edge runtime to be compatible with Cloudflare Pages
// builds. The R2 client in lib/r2.ts is implemented with fetch so it works here.
export const runtime = 'edge';

const getDepth = (path: string) => (path ? path.split('/').filter(Boolean).length : 0);

export function validateCreateFolder(prefix: string, name: string | undefined) {
  if (!name) return '資料夾名稱不可為空';

  if (name.length > MAX_FOLDER_NAME_LENGTH) {
    return `資料夾名稱最多 ${MAX_FOLDER_NAME_LENGTH} 個字`;
  }

  if (getDepth(prefix) + 1 > MAX_FOLDER_DEPTH) {
    return '資料夾層數最多兩層，無法在此建立新資料夾';
  }

  return null;
}

export function validateRenameFolder(isFolder: boolean | undefined, newName: string) {
  if (!isFolder) return null;

  if (newName.length > MAX_FOLDER_NAME_LENGTH) {
    return `資料夾名稱最多 ${MAX_FOLDER_NAME_LENGTH} 個字`;
  }

  return null;
}

export function validateMoveTarget(targetPrefix: string, isFolder: boolean | undefined) {
  const targetDepth = getDepth(targetPrefix);

  if (targetDepth > MAX_FOLDER_DEPTH) {
    return '資料夾層數最多兩層，請選擇較淺的目標路徑';
  }

  if (isFolder && targetDepth + 1 > MAX_FOLDER_DEPTH) {
    return '移動後會超過資料夾層數上限（2 層）';
  }

  return null;
}

async function ensureAdmin(request: NextRequest, rateLimiter: AdminRateLimiter) {
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
    const rateLimiter = createAdminRateLimiter(request);
    const rateLimitError = await rateLimiter.check();
    if (rateLimitError) return rateLimitError;
    const authError = await ensureAdmin(request, rateLimiter);
    if (authError) return authError;

    const body = await request.json();

    if (body?.action === 'validate') {
      return NextResponse.json({ ok: true });
    }

    if (body?.action !== 'create-folder') {
      return NextResponse.json({ error: '未知的請求' }, { status: 400 });
    }

    const validationError = validateCreateFolder(body.prefix || '', body.name);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
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
    const rateLimiter = createAdminRateLimiter(request);
    const rateLimitError = await rateLimiter.check();
    if (rateLimitError) return rateLimitError;
    const authError = await ensureAdmin(request, rateLimiter);
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

      const renameError = validateRenameFolder(body.isFolder, body.newName);
      if (renameError) {
        return NextResponse.json({ error: renameError }, { status: 400 });
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

    const moveError = validateMoveTarget(body.targetPrefix || '', body.isFolder);
    if (moveError) {
      return NextResponse.json({ error: moveError }, { status: 400 });
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
    const rateLimiter = createAdminRateLimiter(request);
    const rateLimitError = await rateLimiter.check();
    if (rateLimitError) return rateLimitError;
    const authError = await ensureAdmin(request, rateLimiter);
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
