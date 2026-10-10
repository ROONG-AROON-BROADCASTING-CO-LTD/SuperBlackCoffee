import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { attendanceTodayLabel, useAttendanceClock } from './useAttendanceClock';

describe('useAttendanceClock', () => {
  afterEach(() => vi.useRealTimers());

  it('updates the clock every second instead of retaining the initial time', () => {
    vi.useFakeTimers();
    const initial = new Date('2026-09-11T08:00:00Z');
    vi.setSystemTime(initial);

    const { result } = renderHook(() => useAttendanceClock());
    expect(result.current).toBe('15:00:00');

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current).toBe('15:00:01');
  });

  it('cleans up its interval when the attendance page unmounts', () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const { unmount } = renderHook(() => useAttendanceClock());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledOnce();
  });

  it('formats today with the Thai weekday and date contract', () => {
    vi.useFakeTimers();
    const today = new Date('2026-09-11T08:00:00Z');
    vi.setSystemTime(today);

    expect(attendanceTodayLabel()).toBe('วันศุกร์ที่ 11 กันยายน 2569');
  });
  it.each([
    ['2026-12-31T17:00:00Z', 'วันศุกร์ที่ 1 มกราคม 2570'],
    ['2024-02-28T17:00:00Z', 'วันพฤหัสบดีที่ 29 กุมภาพันธ์ 2567'],
  ])(
    'uses the Bangkok work date at the UTC boundary %s',
    (instant, expected) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(instant));
      expect(attendanceTodayLabel()).toBe(expected);
      const { result } = renderHook(() => useAttendanceClock());
      expect(result.current).toBe('00:00:00');
    },
  );
});
