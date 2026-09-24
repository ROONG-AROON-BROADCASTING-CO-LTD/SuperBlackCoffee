import { useEffect, useRef, useState } from 'react';

export const DEFAULT_SKELETON_MINIMUM_MS = 350;

export function useMinimumLoading(
  loading: boolean,
  minimumMs = DEFAULT_SKELETON_MINIMUM_MS,
) {
  const [visible, setVisible] = useState(loading);
  const startedAtRef = useRef(loading ? performance.now() : 0);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timeoutRef.current);
    if (loading) {
      startedAtRef.current = performance.now();
      setVisible(true);
      return undefined;
    }
    if (!visible) return undefined;
    const remaining = Math.max(
      0,
      minimumMs - (performance.now() - startedAtRef.current),
    );
    timeoutRef.current = window.setTimeout(() => setVisible(false), remaining);
    return () => window.clearTimeout(timeoutRef.current);
  }, [loading, minimumMs, visible]);

  return visible;
}
