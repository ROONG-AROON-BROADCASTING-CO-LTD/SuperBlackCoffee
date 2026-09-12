import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { attendanceTodayLabel, useAttendanceClock } from './useAttendanceClock';

const formatClock = (date: Date) =>
  new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

describe('useAttendanceClock', () => {
  afterEach(() => vi.useRealTimers());

  it('updates the clock every second instead of retaining the initial time', () => {
    vi.useFakeTimers();
    const initial = new Date('2026-09-11T08:00:00Z');
    vi.setSystemTime(initial);

    const { result } = renderHook(() => useAttendanceClock());
    expect(result.current).toBe(formatClock(initial));

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current).toBe(formatClock(new Date('2026-09-11T08:00:01Z')));
  });

  it('formats today with the Thai weekday and date contract', () => {
    vi.useFakeTimers();
    const today = new Date('2026-09-11T08:00:00Z');
    vi.setSystemTime(today);

    expect(attendanceTodayLabel()).toBe(
      new Intl.DateTimeFormat('th-TH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(today),
    );
  });
});
