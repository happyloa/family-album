import { useCallback, useEffect, useRef, useState } from 'react';

import { ADMIN_SESSION_DURATION_MS, ADMIN_TOKEN_STORAGE_KEY, MAX_ADMIN_TOKEN_LENGTH } from '../constants';

type UseAdminAuthProps = {
  pushMessage: (text: string, tone: 'info' | 'success' | 'error') => void;
};

export function useAdminAuth({ pushMessage }: UseAdminAuthProps) {
  const [adminToken, setAdminToken] = useState('');
  const [adminInput, setAdminInput] = useState('');
  const isAdmin = Boolean(adminToken);
  const adminTimeoutRef = useRef<number | null>(null);

  const clearAdminSession = useCallback(
    (notice?: string) => {
      setAdminInput('');
      setAdminToken('');
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      }

      if (adminTimeoutRef.current) {
        window.clearTimeout(adminTimeoutRef.current);
        adminTimeoutRef.current = null;
      }

      if (notice) {
        pushMessage(notice, 'info');
      }
    },
    [pushMessage]
  );

  const resetAdminTimeout = useCallback(() => {
    if (adminTimeoutRef.current) {
      window.clearTimeout(adminTimeoutRef.current);
    }

    // 重新點擊會刷新計時，避免長時間閒置導致管理者操作到一半被踢出
    adminTimeoutRef.current = window.setTimeout(() => {
      clearAdminSession('管理模式已逾時，請重新輸入。');
    }, ADMIN_SESSION_DURATION_MS);
  }, [clearAdminSession]);

  const validateAndApplyToken = useCallback(
    async (token: string, options?: { silent?: boolean }) => {
      const trimmed = token.trim();
      if (!trimmed) {
        clearAdminSession(options?.silent ? undefined : '請輸入管理密碼');
        return false;
      }

      if (trimmed.length > MAX_ADMIN_TOKEN_LENGTH) {
        if (!options?.silent) {
          pushMessage('管理密碼最多 15 個字', 'error');
        }
        clearAdminSession();
        return false;
      }

      if (!options?.silent) {
        pushMessage('正在驗證管理密碼…', 'info');
      }

      try {
        const response = await fetch('/api/media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': trimmed
          },
          body: JSON.stringify({ action: 'validate' })
        });

        if (!response.ok) {
          let payload: { remainingAttempts?: number; retryAfterMinutes?: number } | null = null;
          try {
            payload = (await response.json()) as { remainingAttempts?: number; retryAfterMinutes?: number };
          } catch (parseError) {
            payload = null;
          }

          clearAdminSession();
          if (!options?.silent) {
            if (response.status === 429) {
              const minutes = payload?.retryAfterMinutes ?? 5;
              pushMessage(`因密碼輸入不正確，請於 ${minutes} 分鐘後再試`, 'error');
            } else if (response.status === 401 && typeof payload?.remainingAttempts === 'number') {
              pushMessage(`管理密碼不正確，還有 ${payload.remainingAttempts} 次機會`, 'error');
            } else {
              pushMessage('管理密碼不正確，請再試一次', 'error');
            }
          }
          return false;
        }

        setAdminToken(trimmed);
        setAdminInput(trimmed);
        sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, trimmed);
        resetAdminTimeout();
        pushMessage(options?.silent ? '' : '已啟用管理模式', 'success');
        return true;
      } catch (error) {
        if (!options?.silent) {
          pushMessage('驗證時出現錯誤，請檢查網路後重試。', 'error');
        }
        return false;
      }
    },
    [clearAdminSession, pushMessage, resetAdminTimeout]
  );

  const requestAdminToken = useCallback(
    async (promptMessage = '請輸入管理密碼以繼續'): Promise<boolean> => {
      if (!adminToken) {
        const input = window.prompt(promptMessage, adminInput);
        if (input === null) return false;

        setAdminInput(input);
        const isValid = await validateAndApplyToken(input);
        if (!isValid) return false;
      }

      resetAdminTimeout();
      return true;
    },
    [adminToken, adminInput, validateAndApplyToken, resetAdminTimeout]
  );

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) : '';
    if (saved) {
      // Avoid calling setState synchronously within an effect
      // Use requestAnimationFrame to defer the execution until the next frame
      requestAnimationFrame(() => {
        void validateAndApplyToken(saved, { silent: true });
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const authorizedFetch = useCallback(
    (input: RequestInfo | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers || {});
      if (isAdmin && adminToken) {
        headers.set('x-admin-token', adminToken);
      }
      return fetch(input, { ...init, headers });
    },
    [isAdmin, adminToken]
  );

  return {
    adminToken,
    adminInput,
    isAdmin,
    setAdminInput,
    validateAndApplyToken,
    clearAdminSession,
    requestAdminToken,
    authorizedFetch
  };
}
