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
    const onUsername = vi.fn().mockResolvedValue('pin');
    const onPIN = vi.fn().mockResolvedValue(undefined);
    render(
      <StockLoginPage
        onUsername={onUsername}
        onPIN={onPIN}
        onSetupPIN={vi.fn()}
        error=""
        loading={false}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'ชื่อผู้ใช้' }), {
      target: { value: 'stock_ayutthaya' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ดำเนินการต่อ' }));

    await waitFor(() =>
      expect(onUsername).toHaveBeenCalledWith('stock_ayutthaya'),
    );
    expect(screen.getByText('กรอก PIN เพื่อเข้าใช้งาน')).toBeTruthy();
    for (const digit of ['1', '2', '3', '4', '5', '6']) {
      fireEvent.click(screen.getByRole('button', { name: `เลข ${digit}` }));
    }

    await waitFor(() =>
      expect(onPIN).toHaveBeenCalledWith('stock_ayutthaya', '123456'),
    );
  });

  it('shows a PIN error on the PIN cells and lets staff change username', async () => {
    sessionStorage.setItem('sbc-stock-username', 'stock_ayutthaya');
    const onClearError = vi.fn();
    render(
      <StockLoginPage
        onUsername={vi.fn()}
        onPIN={vi.fn()}
        onSetupPIN={vi.fn()}
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
    expect(
      (screen.getByRole('textbox', { name: 'ชื่อผู้ใช้' }) as HTMLInputElement)
        .value,
    ).toBe('');
    expect(sessionStorage.getItem('sbc-stock-username')).toBeNull();
  });

  it('asks a new user to set and confirm a PIN before starting Stock', async () => {
    const onSetupPIN = vi.fn().mockResolvedValue(undefined);
    render(
      <StockLoginPage
        onUsername={vi.fn().mockResolvedValue('setup-pin')}
        onPIN={vi.fn()}
        onSetupPIN={onSetupPIN}
        error=""
        loading={false}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'ชื่อผู้ใช้' }), {
      target: { value: 'new_stock_user' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ดำเนินการต่อ' }));
    expect(await screen.findByText('ตั้ง PIN ของคุณ')).toBeTruthy();
    for (const digit of ['1', '2', '3', '4', '5', '6']) {
      fireEvent.click(screen.getByRole('button', { name: `เลข ${digit}` }));
    }
    expect(await screen.findByText('ยืนยัน PIN อีกครั้ง')).toBeTruthy();
    for (const digit of ['1', '2', '3', '4', '5', '6']) {
      fireEvent.click(screen.getByRole('button', { name: `เลข ${digit}` }));
    }
    await waitFor(() =>
      expect(onSetupPIN).toHaveBeenCalledWith('new_stock_user', '123456'),
    );
  });
});
