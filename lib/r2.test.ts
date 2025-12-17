import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetch = vi.fn();

vi.mock('aws4fetch', () => ({
  AwsClient: vi.fn(() => ({
    fetch: mockFetch
  }))
}));

const setEnv = () => {
  process.env.R2_ACCOUNT_ID = 'acc';
  process.env.R2_ACCESS_KEY_ID = 'key';
  process.env.R2_SECRET_ACCESS_KEY = 'secret';
  process.env.R2_BUCKET_NAME = 'bucket';
  process.env.R2_PUBLIC_BASE = 'https://example.com/public';
};

const importUploadToR2 = async () => {
  vi.resetModules();
  setEnv();
  const module = await import('./r2');
  return module.uploadToR2;
};

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('uploadToR2', () => {
  it('sanitizes filenames with path separators before uploading', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 200, statusText: 'OK' }));
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    const uploadToR2 = await importUploadToR2();
    const file = new File([new Uint8Array([1])], 'folder/nested/image.png', { type: 'image/png' });

    const result = await uploadToR2(file, 'albums/2024');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const requestUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(requestUrl).toContain('/albums/2024/1700000000000-foldernestedimage.png');
    expect(result.key).toBe('albums/2024/1700000000000-foldernestedimage.png');
  });

  it('rejects filenames that include traversal attempts', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 200, statusText: 'OK' }));

    const uploadToR2 = await importUploadToR2();
    const file = new File([new Uint8Array([1])], '../escape.png', { type: 'image/png' });

    await expect(uploadToR2(file, 'albums')).rejects.toThrow('檔案名稱包含無效路徑片段');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects overly long filenames', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 200, statusText: 'OK' }));

    const uploadToR2 = await importUploadToR2();
    const file = new File([new Uint8Array([1])], `${'a'.repeat(260)}.png`, { type: 'image/png' });

    await expect(uploadToR2(file, '')).rejects.toThrow('檔案名稱最多');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('enforces depth limits after combining with the target prefix', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 200, statusText: 'OK' }));

    const uploadToR2 = await importUploadToR2();
    const file = new File([new Uint8Array([1])], 'photo.png', { type: 'image/png' });

    await expect(uploadToR2(file, 'too/deep/path')).rejects.toThrow('資料夾層數最多兩層');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
