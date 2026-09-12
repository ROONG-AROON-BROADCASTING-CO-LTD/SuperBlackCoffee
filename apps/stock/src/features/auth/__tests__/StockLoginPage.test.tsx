import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StockLoginPage } from '../StockLoginPage';

describe('StockLoginPage', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('uses the attendance-style username then PIN flow to sign in', async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<StockLoginPage onLogin={onLogin} error="" loading={false} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'ชื่อผู้ใช้' }), {
      target: { value: 'stock_ayutthaya' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ดำเนินการต่อ' }));

    expect(screen.getByText('กรอก PIN เพื่อเข้าใช้งาน')).toBeTruthy();
    for (const digit of ['1', '2', '3', '4', '5', '6']) {
      fireEvent.click(screen.getByRole('button', { name: `เลข ${digit}` }));
    }

    await waitFor(() =>
      expect(onLogin).toHaveBeenCalledWith('stock_ayutthaya', '123456'),
    );
  });

  it('shows a PIN error on the PIN cells and lets staff change username', async () => {
    sessionStorage.setItem('sbc-stock-username', 'stock_ayutthaya');
    const onClearError = vi.fn();
    render(
      <StockLoginPage
        onLogin={vi.fn()}
        onClearError={onClearError}
        error="PIN ไม่ถูกต้อง"
        loading={false}
      />,
    );

    await waitFor(() =>
      expect(
        screen
          .getByLabelText('กรอก PIN แล้ว 0 จาก 6 หลัก')
          .getAttribute('aria-invalid'),
      ).toBe('true'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'เปลี่ยนชื่อผู้ใช้' }));

    expect(onClearError).toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'ชื่อผู้ใช้' })).toBeTruthy();
  });
});
