import { NextResponse } from 'next/server';

type MemoryEntry = {
  count: number;
  expiresAt: number;
};

type RateLimitStore = {
  getCount: (key: string) => Promise<number>;
  increment: (key: string, ttlSeconds: number) => Promise<number>;
  reset: (key: string) => Promise<void>;
};

const DEFAULT_ADMIN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5分鐘
const DEFAULT_ADMIN_RATE_LIMIT_MAX_FAILURES = 5;

const processEnv = typeof process !== 'undefined' ? process.env : undefined;

function readPositiveInt(name: string, fallback: number) {
  const raw = processEnv?.[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export const ADMIN_RATE_LIMIT_WINDOW_MS = DEFAULT_ADMIN_RATE_LIMIT_WINDOW_MS;
export const ADMIN_RATE_LIMIT_MAX_FAILURES = readPositiveInt(
  'ADMIN_RATE_LIMIT_MAX_FAILURES',
  DEFAULT_ADMIN_RATE_LIMIT_MAX_FAILURES
);

const ADMIN_RATE_LIMIT_KEY_PREFIX = 'admin-failure';
const ADMIN_RATE_LIMIT_WINDOW_SECONDS = Math.ceil(ADMIN_RATE_LIMIT_WINDOW_MS / 1000);

// 記憶體內存（適用於單一實例環境）
const memoryStore = new Map<string, MemoryEntry>();

const memoryStoreAdapter: RateLimitStore = {
  async getCount(key: string) {
    const entry = memoryStore.get(key);
    if (!entry) return 0;
    if (Date.now() > entry.expiresAt) {
      memoryStore.delete(key);
      return 0;
    }
    return entry.count;
  },
  async increment(key: string, ttlSeconds: number) {
    const now = Date.now();
    const entry = memoryStore.get(key);
    if (!entry || now > entry.expiresAt) {
      const expiresAt = now + ttlSeconds * 1000;
      memoryStore.set(key, { count: 1, expiresAt });
      return 1;
    }
    const next = entry.count + 1;
    memoryStore.set(key, { count: next, expiresAt: entry.expiresAt });
    return next;
  },
  async reset(key: string) {
    memoryStore.delete(key);
  }
};

// 取得客戶端 IP
function getClientIp(request: Request): string {
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }
  return 'unknown';
}

function buildKey(ip: string) {
  return `${ADMIN_RATE_LIMIT_KEY_PREFIX}:${ip}`;
}

export type AdminRateLimiter = {
  check: () => Promise<NextResponse | null>;
  recordFailure: () => Promise<number>;
  reset: () => Promise<void>;
};

/**
 * 建立管理員登入速率限制器
 * 使用 IP 作為 Key，限制短時間內的嘗試次數，防止暴力破解
 */
export function createAdminRateLimiter(request: Request): AdminRateLimiter {
  const store = memoryStoreAdapter;
  const ip = getClientIp(request);
  const key = buildKey(ip);

  return {
    // 檢查是否超過限制
    async check() {
      const count = await store.getCount(key);
      if (count >= ADMIN_RATE_LIMIT_MAX_FAILURES) {
        const minutes = Math.ceil(ADMIN_RATE_LIMIT_WINDOW_MS / 60000);
        return NextResponse.json(
          { error: `因密碼輸入不正確，請於 ${minutes} 分鐘後再試。`, retryAfterMinutes: minutes },
          { status: 429 }
        );
      }
      return null;
    },
    // 記錄失敗嘗試
    async recordFailure() {
      return store.increment(key, ADMIN_RATE_LIMIT_WINDOW_SECONDS);
    },
    // 重設計數 (登入成功時)
    async reset() {
      await store.reset(key);
    }
  };
}
