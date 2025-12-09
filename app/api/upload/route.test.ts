import { describe, expect, it, beforeEach, vi } from 'vitest';

import { uploadToR2 } from '@/lib/r2';

import { POST } from './route';

vi.mock('@/lib/r2', () => ({
  uploadToR2: vi.fn(async (file: File, prefix: string) => ({
    key: `${prefix}${file.name}`,
    url: `https://example.com/${prefix}${file.name}`,
    type: 'image'
  }))
}));

const createFile = (size: number, type: string, name: string) => new File([new Uint8Array(size)], name, { type });

const createRequest = (files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  return new Request('https://example.com/api/upload', {
    method: 'POST',
    headers: {
      'x-admin-token': 'admin-token'
    },
    body: formData
  });
};

describe('upload route validation', () => {
  beforeEach(() => {
    process.env.ADMIN_ACCESS_TOKEN = 'admin-token';
    vi.clearAllMocks();
  });

  it('rejects files with unsupported MIME types', async () => {
    const pdf = createFile(100, 'application/pdf', 'doc.pdf');
    const response = await POST(createRequest([pdf]));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: '無效的檔案',
      details: [{ name: 'doc.pdf', reason: '僅接受圖片或影片檔案' }]
    });
    expect(uploadToR2).not.toHaveBeenCalled();
  });

  it('rejects image files exceeding the size limit', async () => {
    const tooLargeImage = createFile(11 * 1024 * 1024, 'image/jpeg', 'huge.jpg');
    const response = await POST(createRequest([tooLargeImage]));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: '無效的檔案',
      details: [{ name: 'huge.jpg', reason: '圖片檔案大小上限 10 MB' }]
    });
    expect(uploadToR2).not.toHaveBeenCalled();
  });

  it('rejects mixed batches and skips uploading valid files', async () => {
    const validImage = createFile(500_000, 'image/png', 'ok.png');
    const invalidVideo = createFile(201 * 1024 * 1024, 'video/mp4', 'too-big.mp4');

    const response = await POST(createRequest([validImage, invalidVideo]));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: '無效的檔案',
      details: [{ name: 'too-big.mp4', reason: '影片檔案大小上限 200 MB' }]
    });
    expect(uploadToR2).not.toHaveBeenCalled();
  });

  it('uploads valid files', async () => {
    const image = createFile(500_000, 'image/jpeg', 'a.jpg');
    const video = createFile(10 * 1024 * 1024, 'video/mp4', 'clip.mp4');

    const response = await POST(createRequest([image, video]));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.media).toHaveLength(2);
    expect(uploadToR2).toHaveBeenCalledTimes(2);
  });
});
