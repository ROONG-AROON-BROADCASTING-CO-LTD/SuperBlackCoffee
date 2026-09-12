import { useEffect, useRef } from 'react';
import { setAutoRetryError } from '../components/autoRetryErrorStore';

const retryDelay = 10_000;

export function useAutoRetry(hasError: boolean, retry: () => void) {
  const retryRef = useRef(retry);
  const errorSourceRef = useRef<symbol>(Symbol('auto-retry-error'));
  retryRef.current = retry;

  useEffect(() => {
    const source = errorSourceRef.current;
    setAutoRetryError(source, hasError);
    return () => setAutoRetryError(source, false);
  }, [hasError]);

  useEffect(() => {
    if (!hasError) return;

    const retryNow = () => retryRef.current();
    const interval = window.setInterval(retryNow, retryDelay);
    window.addEventListener('online', retryNow);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', retryNow);
    };
  }, [hasError]);
}
