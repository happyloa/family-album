import { useCallback, useEffect, useState } from 'react';

import { MessageTone } from '../types';

/**
 * useMessage Hook: 全域訊息提示管理
 * 提供顯示訊息 (info, success, error) 並自動在 5 秒後消失的功能
 */
export function useMessage() {
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageTone>('info');

  const pushMessage = useCallback((text: string, tone: MessageTone = 'info') => {
    setMessageTone(tone);
    setMessage(text);
  }, []);

  // 設定自動消失計時器
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  return {
    message,
    messageTone,
    pushMessage
  };
}
