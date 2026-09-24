import { Skeleton } from '@mui/material';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SbcThemeProvider } from '../theme/SbcThemeProvider';
import {
  DEFAULT_SKELETON_MINIMUM_MS,
  useMinimumLoading,
} from './useMinimumLoading';

function LoadingProbe({ loading }: { loading: boolean }) {
  const visible = useMinimumLoading(loading);
  return <span>{visible ? 'loading' : 'ready'}</span>;
}

describe('shared skeleton standard', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps loading visible for the shared minimum duration', () => {
    vi.useFakeTimers();
    const view = render(<LoadingProbe loading />);

    view.rerender(<LoadingProbe loading={false} />);
    act(() => vi.advanceTimersByTime(DEFAULT_SKELETON_MINIMUM_MS - 1));
    expect(screen.getByText('loading')).toBeTruthy();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText('ready')).toBeTruthy();
  });

  it('applies the Admin wave animation and shared color through the theme', () => {
    const { container } = render(
      <SbcThemeProvider skeletonAnimation="wave" skeletonColor="#eee5df">
        <Skeleton aria-label="shared-skeleton" />
      </SbcThemeProvider>,
    );

    const skeleton = screen.getByLabelText('shared-skeleton');
    expect(skeleton.className).toContain('MuiSkeleton-wave');
    expect(getComputedStyle(skeleton).backgroundColor).toBe(
      'rgb(238, 229, 223)',
    );
    expect(container).toBeTruthy();
  });
});
