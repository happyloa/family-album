import { NextResponse } from 'next/server';

type KvNamespace = {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

type MemoryEntry = {
  count: number;
  expiresAt: number;
};

type RateLimitStore = {
  getCount: (key: string) => Promise<number>;
  increment: (key: string, ttlSeconds: number) => Promise<number>;
  reset: (key: string) => Promise<void>;
};

export const ADMIN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
export const ADMIN_RATE_LIMIT_MAX_FAILURES = 5;

const ADMIN_RATE_LIMIT_KEY_PREFIX = 'admin-failure';
const ADMIN_RATE_LIMIT_WINDOW_SECONDS = Math.ceil(ADMIN_RATE_LIMIT_WINDOW_MS / 1000);

const memoryStore = new Map<string, MemoryEntry>();

function getKvBinding(): KvNamespace | null {
  const globalBinding = (globalThis as { ADMIN_RATE_LIMIT_KV?: KvNamespace }).ADMIN_RATE_LIMIT_KV;
  return globalBinding ?? null;
}

function getStore(): RateLimitStore {
  const kv = getKvBinding();

  if (kv) {
    return {
      async getCount(key: string) {
        const value = await kv.get(key);
        const parsed = value ? Number.parseInt(value, 10) : 0;
        return Number.isNaN(parsed) ? 0 : parsed;
      },
      async increment(key: string, ttlSeconds: number) {
        const current = await this.getCount(key);
        const next = current + 1;
        await kv.put(key, String(next), { expirationTtl: ttlSeconds });
        return next;
      },
      async reset(key: string) {
        await kv.delete(key);
      }
    };
  }

  return {
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
}

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
  recordFailure: () => Promise<void>;
  reset: () => Promise<void>;
};

export function createAdminRateLimiter(request: Request): AdminRateLimiter {
  const store = getStore();
  const ip = getClientIp(request);
  const key = buildKey(ip);

  return {
    async check() {
      const count = await store.getCount(key);
      if (count >= ADMIN_RATE_LIMIT_MAX_FAILURES) {
        const minutes = Math.ceil(ADMIN_RATE_LIMIT_WINDOW_MS / 60000);
        return NextResponse.json(
          { error: `嘗試次數過多，請於 ${minutes} 分鐘後再試。` },
          { status: 429 }
        );
      }
      return null;
    },
    async recordFailure() {
      await store.increment(key, ADMIN_RATE_LIMIT_WINDOW_SECONDS);
    },
    async reset() {
      await store.reset(key);
    }
  };
}
