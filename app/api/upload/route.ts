import { NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
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
