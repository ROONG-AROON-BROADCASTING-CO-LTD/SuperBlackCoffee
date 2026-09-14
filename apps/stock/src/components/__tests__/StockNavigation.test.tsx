import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StockMobileNavigation } from '../StockNavigation';

describe('StockMobileNavigation', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the four stock actions and logout control on mobile', () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    const onPage = vi.fn();
    const onLogout = vi.fn();
    render(
      <StockMobileNavigation
        page="sales"
        onPage={onPage}
        onLogout={onLogout}
        cartItemCount={0}
        onOpenCart={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'บันทึกขาย' }));
    fireEvent.click(screen.getByRole('button', { name: 'ออกจากระบบ' }));

    expect(onPage).toHaveBeenCalledWith('sales');
    expect(onLogout).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'ภาพรวม' })).toBeNull();
    expect(screen.getByRole('button', { name: 'ตัดสต๊อก' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ประวัติ' })).toBeTruthy();
  });

  it('uses the centre navigation slot to open the stock cart', () => {
    const openCart = vi.fn();
    render(
      <StockMobileNavigation
        page="sales"
        onPage={vi.fn()}
        onLogout={vi.fn()}
        cartItemCount={2}
        onOpenCart={openCart}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'เปิดตะกร้าตัดสต๊อก' }));

    expect(openCart).toHaveBeenCalledOnce();
  });
});
