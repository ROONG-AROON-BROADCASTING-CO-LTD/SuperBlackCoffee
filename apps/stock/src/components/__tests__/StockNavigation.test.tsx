import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StockMobileNavigation } from '../StockNavigation';

describe('StockMobileNavigation', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('uses the same five-action mobile navigation pattern as attendance', () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    const onPage = vi.fn();
    const onLogout = vi.fn();
    render(
      <StockMobileNavigation
        page="overview"
        onPage={onPage}
        onLogout={onLogout}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'บันทึกขาย' }));
    fireEvent.click(screen.getByRole('button', { name: 'ออกจากระบบ' }));

    expect(onPage).toHaveBeenCalledWith('sales');
    expect(onLogout).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'ตัดสต๊อก' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ประวัติ' })).toBeTruthy();
  });
});
