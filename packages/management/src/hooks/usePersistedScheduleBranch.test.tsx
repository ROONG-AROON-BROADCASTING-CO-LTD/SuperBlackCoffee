import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { usePersistedScheduleBranch } from './usePersistedScheduleBranch';

describe('schedule branch selection persistence', () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
  });

  it('restores an encoded branch and changes only its query parameter', () => {
    window.history.replaceState(
      { saved: true },
      '',
      '/employees?tab=month&scheduleBranch=%E0%B8%AD%E0%B8%A2%E0%B8%B8%E0%B8%98%E0%B8%A2%E0%B8%B2#calendar',
    );
    const view = renderHook(() => usePersistedScheduleBranch());
    expect(view.result.current.selectedBranchCode).toBe('อยุธยา');
    act(() => view.result.current.selectBranch('SBC-NEW&1'));
    expect(view.result.current.selectedBranchCode).toBe('SBC-NEW&1');
    expect(new URLSearchParams(location.search).get('scheduleBranch')).toBe(
      'SBC-NEW&1',
    );
    expect(new URLSearchParams(location.search).get('tab')).toBe('month');
    expect(location.pathname).toBe('/employees');
    expect(location.hash).toBe('#calendar');
    expect(window.history.state).toEqual({ saved: true });
    view.unmount();
    expect(
      renderHook(() => usePersistedScheduleBranch()).result.current
        .selectedBranchCode,
    ).toBe('SBC-NEW&1');
  });

  it('starts without a selected branch when the URL has none', () => {
    window.history.replaceState(null, '', '/employees');
    expect(
      renderHook(() => usePersistedScheduleBranch()).result.current
        .selectedBranchCode,
    ).toBeNull();
  });
});
