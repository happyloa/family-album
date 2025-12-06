import { NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';

// 使用 Node.js 執行環境來避開 Edge Runtime 的小檔案限制，
// 以便處理較大的影片上傳並確保媒體檔案完整性。
export const runtime = 'nodejs';

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

    const uploads = await Promise.all(files.map((file) => uploadToR2(file, targetPath)));
    return NextResponse.json({ media: uploads });
  } catch (error) {
    console.error('Upload failed', error);
    return NextResponse.json({ error: '上傳失敗，請稍後再試。' }, { status: 500 });
  }
}
