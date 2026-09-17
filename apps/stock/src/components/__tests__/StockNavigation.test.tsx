import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StockMobileNavigation } from '../StockNavigation';

describe('StockMobileNavigation', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows stock actions, product ordering, and logout control on mobile', () => {
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
        cartOpen={false}
        onToggleCart={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'บันทึกขาย' }));
    fireEvent.click(screen.getByRole('button', { name: 'ออกจากระบบ' }));

    expect(onPage).toHaveBeenCalledWith('sales');
    expect(onLogout).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'ภาพรวม' })).toBeNull();
    expect(screen.getByRole('button', { name: 'วัตถุดิบ' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'สั่งซื้อ' })).toBeTruthy();
  });

  it('uses the centre navigation slot to open the stock cart', () => {
    const toggleCart = vi.fn();
    render(
      <StockMobileNavigation
        page="sales"
        onPage={vi.fn()}
        onLogout={vi.fn()}
        cartItemCount={2}
        cartOpen={false}
        onToggleCart={toggleCart}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'เปิดตะกร้า' }));

    expect(toggleCart).toHaveBeenCalledOnce();
    const cartButton = screen.getByRole('button', {
      name: 'เปิดตะกร้า',
    });
    expect(cartButton.textContent).toBe('2');
    expect(cartButton.querySelector('svg')).toBeNull();
  });

  it('turns the cart control into a close action while the cart is open', () => {
    const toggleCart = vi.fn();
    render(
      <StockMobileNavigation
        page="sales"
        onPage={vi.fn()}
        onLogout={vi.fn()}
        cartItemCount={2}
        cartOpen
        onToggleCart={toggleCart}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'ปิดตะกร้า' }));

    expect(toggleCart).toHaveBeenCalledOnce();
    const cartButton = screen.getByRole('button', {
      name: 'ปิดตะกร้า',
    });
    expect(cartButton.textContent).toBe('ปิด');
    expect(cartButton.querySelector('svg')).toBeNull();
  });

  it('keeps the cart drawer clearance stable while a note field opens the keyboard', async () => {
    render(
      <StockMobileNavigation
        page="sales"
        onPage={vi.fn()}
        onLogout={vi.fn()}
        cartItemCount={0}
        cartOpen
        onToggleCart={vi.fn()}
      />,
    );
    const note = document.createElement('textarea');
    document.body.appendChild(note);
    fireEvent.focusIn(note);

    await waitFor(() =>
      expect(
        document.documentElement.style.getPropertyValue(
          '--stock-mobile-nav-height',
        ),
      ).toBe('82px'),
    );

    note.remove();
  });
});
