import { useCallback, useEffect, useState } from 'react';

import { MessageTone } from '../types';

export function useMessage() {
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageTone>('info');

  const pushMessage = useCallback((text: string, tone: MessageTone = 'info') => {
    setMessageTone(tone);
    setMessage(text);
  }, []);

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
