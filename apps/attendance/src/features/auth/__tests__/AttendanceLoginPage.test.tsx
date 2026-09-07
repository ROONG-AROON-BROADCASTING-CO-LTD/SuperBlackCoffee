import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AttendanceLoginPage } from '../AttendanceLoginPage';

describe('AttendanceLoginPage', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  const defaultProps = {
    onUsername: vi.fn().mockResolvedValue('pin' as const),
    onPIN: vi.fn().mockResolvedValue(undefined),
    onSetupPIN: vi.fn().mockResolvedValue(undefined),
  };

  it('continues from username to an existing PIN prompt', async () => {
    const onUsername = vi.fn().mockResolvedValue('pin' as const);
    render(<AttendanceLoginPage {...defaultProps} onUsername={onUsername} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'ชื่อผู้ใช้' }), {
      target: { value: 'staff_ayutthaya' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ดำเนินการต่อ' }));

    await waitFor(() =>
      expect(onUsername).toHaveBeenCalledWith('staff_ayutthaya'),
    );
    expect(screen.getByLabelText('PIN 6 หลัก')).toBeTruthy();
  });

  it('shows an API login error', () => {
    render(<AttendanceLoginPage {...defaultProps} error="PIN ไม่ถูกต้อง" />);
    expect(screen.getByText('PIN ไม่ถูกต้อง')).toBeTruthy();
  });

  it('shows PIN errors on the PIN cells instead of a text message', async () => {
    sessionStorage.setItem('sbc-attendance-username', 'staff_ayutthaya');
    render(<AttendanceLoginPage {...defaultProps} error="PIN ไม่ถูกต้อง" />);

    await waitFor(() =>
      expect(
        screen
          .getByLabelText('กรอก PIN แล้ว 0 จาก 6 หลัก')
          .getAttribute('aria-invalid'),
      ).toBe('true'),
    );
    expect(screen.queryByText('PIN ไม่ถูกต้อง')).toBeNull();
  });

  it('clears a PIN error before returning to the username step', () => {
    sessionStorage.setItem('sbc-attendance-username', 'staff_ayutthaya');
    const onClearError = vi.fn();
    render(
      <AttendanceLoginPage
        {...defaultProps}
        error="PIN ไม่ถูกต้อง"
        onClearError={onClearError}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'เปลี่ยนชื่อผู้ใช้' }));

    expect(onClearError).toHaveBeenCalledOnce();
  });

  it('accepts and removes PIN digits through the number keypad', async () => {
    sessionStorage.setItem('sbc-attendance-username', 'staff_ayutthaya');
    const onPIN = vi.fn().mockResolvedValue(undefined);
    render(<AttendanceLoginPage {...defaultProps} onPIN={onPIN} />);

    for (const digit of ['1', '2', '3', '4', '5', '6']) {
      fireEvent.click(screen.getByRole('button', { name: `เลข ${digit}` }));
    }

    await waitFor(() =>
      expect(onPIN).toHaveBeenCalledWith('staff_ayutthaya', '123456'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'ลบตัวเลข' }));
    expect(
      (screen.getByLabelText('PIN 6 หลัก') as HTMLInputElement).value,
    ).toBe('12345');
  });

  it('clears every PIN digit after a rejected six digit PIN', async () => {
    sessionStorage.setItem('sbc-attendance-username', 'staff_ayutthaya');
    const view = render(<AttendanceLoginPage {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('PIN 6 หลัก'), {
      target: { value: '123456' },
    });
    view.rerender(
      <AttendanceLoginPage {...defaultProps} error="PIN ไม่ถูกต้อง" />,
    );

    await screen.findByRole('button', { name: 'ล้าง PIN ทั้งหมด' });
    fireEvent.click(screen.getByRole('button', { name: 'ล้าง PIN ทั้งหมด' }));
    expect(
      (screen.getByLabelText('PIN 6 หลัก') as HTMLInputElement).value,
    ).toBe('');
  });

  it('requires confirmation before setting a new six digit PIN', async () => {
    const onSetupPIN = vi.fn().mockResolvedValue(undefined);
    render(
      <AttendanceLoginPage
        {...defaultProps}
        onUsername={vi.fn().mockResolvedValue('setup-pin')}
        onSetupPIN={onSetupPIN}
      />,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'ชื่อผู้ใช้' }), {
      target: { value: 'staff_ayutthaya' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ดำเนินการต่อ' }));
    await screen.findByLabelText('PIN 6 หลัก');
    fireEvent.change(screen.getByLabelText('PIN 6 หลัก'), {
      target: { value: '123456' },
    });
    await screen.findByText('ยืนยัน PIN อีกครั้ง');
    fireEvent.change(screen.getByLabelText('PIN 6 หลัก'), {
      target: { value: '123456' },
    });
    await waitFor(() =>
      expect(onSetupPIN).toHaveBeenCalledWith('staff_ayutthaya', '123456'),
    );
    expect(sessionStorage.getItem('sbc-attendance-username')).toBe(
      'staff_ayutthaya',
    );
  });

  it('uses the remembered username and opens directly at the PIN prompt', () => {
    sessionStorage.setItem('sbc-attendance-username', 'staff_ayutthaya');
    render(<AttendanceLoginPage {...defaultProps} />);
    expect(screen.getByText('กรอก PIN เพื่อเข้าใช้งาน')).toBeTruthy();
    expect(screen.queryByText(/staff_ayutthaya/)).toBeNull();
  });
});
