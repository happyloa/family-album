import { describe, expect, it, vi, beforeEach } from 'vitest';

import { calculateBucketUsage } from '@/lib/r2';
import { GET } from './route';

vi.mock('@/lib/r2', () => ({
  calculateBucketUsage: vi.fn()
}));

describe('media usage route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns bucket usage when calculation succeeds', async () => {
    vi.mocked(calculateBucketUsage).mockResolvedValue({ totalBytes: 1024 });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ totalBytes: 1024 });
  });

  it('returns 500 when calculation fails', async () => {
    vi.mocked(calculateBucketUsage).mockRejectedValue(new Error('boom'));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: '無法取得貯體容量，請稍後再試。' });
  });
});

