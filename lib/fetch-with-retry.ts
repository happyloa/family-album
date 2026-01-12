/**
 * 帶有重試機制的 Fetch 封裝
 * 使用 exponential backoff 策略處理網路不穩定情況
 */

type FetchWithRetryOptions = {
  /** 最大重試次數，預設 3 */
  maxRetries?: number;
  /** 初始延遲時間（毫秒），預設 500 */
  initialDelayMs?: number;
  /** 延遲時間倍數，預設 2 */
  backoffMultiplier?: number;
  /** 最大延遲時間（毫秒），預設 5000 */
  maxDelayMs?: number;
  /** 可重試的 HTTP 狀態碼，預設 [408, 429, 500, 502, 503, 504] */
  retryableStatuses?: number[];
  /** 每次重試時的回調 */
  onRetry?: (
    attempt: number,
    error: Error | null,
    response: Response | null
  ) => void;
};

const DEFAULT_RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  backoffMultiplier: number,
  maxDelayMs: number
): number {
  const delay = initialDelayMs * backoffMultiplier ** attempt;
  // 加入 jitter 避免 thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, maxDelayMs);
}

/**
 * 帶有重試機制的 Fetch
 * 在網路錯誤或可重試的 HTTP 狀態碼時自動重試
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelayMs = 500,
    backoffMultiplier = 2,
    maxDelayMs = 5000,
    retryableStatuses = DEFAULT_RETRYABLE_STATUSES,
    onRetry,
  } = options;

  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(input, init);

      // 如果是可重試的狀態碼且還有重試次數，則重試
      if (retryableStatuses.includes(response.status) && attempt < maxRetries) {
        lastResponse = response;
        onRetry?.(attempt + 1, null, response);
        const delay = calculateDelay(
          attempt,
          initialDelayMs,
          backoffMultiplier,
          maxDelayMs
        );
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 如果是最後一次嘗試，拋出錯誤
      if (attempt >= maxRetries) {
        throw lastError;
      }

      // 網路錯誤時重試
      onRetry?.(attempt + 1, lastError, null);
      const delay = calculateDelay(
        attempt,
        initialDelayMs,
        backoffMultiplier,
        maxDelayMs
      );
      await sleep(delay);
    }
  }

  // 這段理論上不會執行到，但 TypeScript 需要它
  if (lastResponse) {
    return lastResponse;
  }
  throw lastError ?? new Error("Fetch failed after retries");
}

/**
 * 建立預設配置的 fetchWithRetry
 */
export function createFetchWithRetry(
  defaultOptions: FetchWithRetryOptions = {}
) {
  return (
    input: RequestInfo | URL,
    init?: RequestInit,
    options?: FetchWithRetryOptions
  ) => fetchWithRetry(input, init, { ...defaultOptions, ...options });
}
