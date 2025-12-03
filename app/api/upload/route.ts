import { NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const targetPath = typeof formData.get('path') === 'string' ? (formData.get('path') as string) : '';

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: '缺少檔案' }, { status: 400 });
    }

    const result = await uploadToR2(file, targetPath);
    return NextResponse.json({ media: result });
  } catch (error) {
    console.error('Upload failed', error);
    return NextResponse.json({ error: '上傳失敗，請稍後再試。' }, { status: 500 });
  }
}
