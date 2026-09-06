import { useEffect, useRef } from 'react';

const retryDelay = 10_000;

export function useAutoRetry(hasError: boolean, retry: () => void) {
  const retryRef = useRef(retry);
  retryRef.current = retry;

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
