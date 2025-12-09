import { NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';

import { MAX_IMAGE_SIZE_BYTES, MAX_VIDEO_SIZE_BYTES, getSizeLimitByMime } from './constants';

// 使用 Edge Runtime 以符合 Cloudflare Pages 的執行環境。
export const runtime = 'edge';

function ensureAdmin(request: Request) {
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

export async function POST(request: Request) {
  try {
    const authError = ensureAdmin(request);
    if (authError) return authError;

    const formData = await request.formData();
    // 支援多檔案上傳，並在此集中取出所有 File 物件
    const files = formData.getAll('files').filter((item): item is File => item instanceof File);
    const targetPath = typeof formData.get('path') === 'string' ? (formData.get('path') as string) : '';

    if (!files.length) {
      return NextResponse.json({ error: '缺少檔案' }, { status: 400 });
    }

    const invalidFiles = files
      .map((file) => {
        const sizeLimit = getSizeLimitByMime(file.type);
        if (!sizeLimit) {
          return { name: file.name, reason: '僅接受圖片或影片檔案' };
        }

        if (typeof file.size === 'number' && file.size > sizeLimit) {
          const readableLimit = `${Math.round(sizeLimit / 1024 / 1024)} MB`;
          const typeLabel = sizeLimit === MAX_IMAGE_SIZE_BYTES ? '圖片' : '影片';
          return { name: file.name, reason: `${typeLabel}檔案大小上限 ${readableLimit}` };
        }

        return null;
      })
      .filter((item): item is { name: string; reason: string } => Boolean(item));

    if (invalidFiles.length) {
      return NextResponse.json({ error: '無效的檔案', details: invalidFiles }, { status: 400 });
    }

    const uploads = await Promise.all(files.map((file) => uploadToR2(file, targetPath)));
    return NextResponse.json({ media: uploads });
  } catch (error) {
    console.error('Upload failed', error);
    return NextResponse.json({ error: '上傳失敗，請稍後再試。' }, { status: 500 });
  }
}
