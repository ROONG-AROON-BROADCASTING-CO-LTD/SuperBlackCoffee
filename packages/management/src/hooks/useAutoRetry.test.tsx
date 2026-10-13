import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAutoRetry } from './useAutoRetry';
import { hasAutoRetryErrors } from '../components/autoRetryErrorStore';

describe('automatic recovery across management pages', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('retries only after ten seconds and uses the latest callback', () => {
    vi.useFakeTimers();
    const original = vi.fn(),
      latest = vi.fn();
    const view = renderHook(({ retry }) => useAutoRetry(true, retry), {
      initialProps: { retry: original },
    });
    act(() => vi.advanceTimersByTime(9_999));
    expect(original).not.toHaveBeenCalled();
    view.rerender({ retry: latest });
    act(() => vi.advanceTimersByTime(1));
    expect(latest).toHaveBeenCalledOnce();
    expect(original).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new Event('online')));
    expect(latest).toHaveBeenCalledTimes(2);
  });

  it('stops both timer and online retries after recovery and unmount', () => {
    vi.useFakeTimers();
    const retry = vi.fn();
    const view = renderHook(({ error }) => useAutoRetry(error, retry), {
      initialProps: { error: true },
    });
    expect(hasAutoRetryErrors()).toBe(true);
    view.rerender({ error: false });
    expect(hasAutoRetryErrors()).toBe(false);
    act(() => {
      vi.advanceTimersByTime(20_000);
      window.dispatchEvent(new Event('online'));
    });
    expect(retry).not.toHaveBeenCalled();
    view.rerender({ error: true });
    view.unmount();
    act(() => {
      vi.advanceTimersByTime(20_000);
      window.dispatchEvent(new Event('online'));
    });
    expect(retry).not.toHaveBeenCalled();
    expect(hasAutoRetryErrors()).toBe(false);
  });

  it('retains the shared error while another page still needs recovery', () => {
    const first = renderHook(() => useAutoRetry(true, vi.fn()));
    const second = renderHook(() => useAutoRetry(true, vi.fn()));
    first.unmount();
    expect(hasAutoRetryErrors()).toBe(true);
    second.unmount();
    expect(hasAutoRetryErrors()).toBe(false);
  });
});
