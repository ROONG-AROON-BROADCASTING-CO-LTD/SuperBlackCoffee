import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FranchiseSettingsPage } from '../FranchiseSettingsPage';
import {
  getFranchiseAccountSettings,
  updateFranchiseAccountPassword,
} from '../../../api/account';

vi.mock('../../../api/account', () => ({
  getFranchiseAccountSettings: vi.fn(),
  updateFranchiseAccountPassword: vi.fn(),
}));

const mockedGetSettings = vi.mocked(getFranchiseAccountSettings);
const mockedUpdatePassword = vi.mocked(updateFranchiseAccountPassword);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FranchiseSettingsPage />
    </QueryClientProvider>,
  );
}

describe('FranchiseSettingsPage', () => {
  it('requires the current password when submitting the form directly', async () => {
    renderPage();
    await screen.findByText('suphan.owner');
    fireEvent.change(screen.getByLabelText(/^รหัสผ่านใหม่/), {
      target: { value: 'NewPass8' },
    });
    fireEvent.change(screen.getByLabelText(/ยืนยันรหัสผ่านใหม่/), {
      target: { value: 'NewPass8' },
    });
    fireEvent.submit(screen.getByLabelText(/^รหัสผ่านใหม่/).closest('form')!);
    await screen.findByText('กรุณาระบุรหัสผ่านปัจจุบัน');
    expect(mockedUpdatePassword).not.toHaveBeenCalled();
  });

  it('accepts a matching new password at the exact eight-character minimum', async () => {
    renderPage();
    await screen.findByText('suphan.owner');
    fireEvent.change(screen.getByLabelText(/รหัสผ่านปัจจุบัน/), {
      target: { value: 'OldPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/^รหัสผ่านใหม่/), {
      target: { value: 'NewPass8' },
    });
    fireEvent.change(screen.getByLabelText(/ยืนยันรหัสผ่านใหม่/), {
      target: { value: 'NewPass8' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }));
    await screen.findByText('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
    expect(mockedUpdatePassword).toHaveBeenCalledTimes(1);
    expect(mockedUpdatePassword.mock.calls[0]?.[0]).toEqual({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPass8',
    });
  });
  it('rejects a short password even when the form is submitted without clicking its disabled button', async () => {
    renderPage();
    await screen.findByText('suphan.owner');
    fireEvent.change(screen.getByLabelText(/รหัสผ่านปัจจุบัน/), {
      target: { value: 'OldPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/^รหัสผ่านใหม่/), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText(/ยืนยันรหัสผ่านใหม่/), {
      target: { value: 'short' },
    });
    const form = screen.getByLabelText(/^รหัสผ่านใหม่/).closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    expect(
      await screen.findByText('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร'),
    ).toBeTruthy();
    expect(mockedUpdatePassword).not.toHaveBeenCalled();
  });

  it('shows the account loading failure without inventing account data', async () => {
    mockedGetSettings.mockRejectedValueOnce(new Error('Service unavailable'));
    renderPage();
    expect(
      await screen.findByText(
        'ไม่สามารถโหลดข้อมูลการตั้งค่าระบบได้ กรุณาลองใหม่อีกครั้ง',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('suphan.owner')).toBeNull();
  });

  it('does not start a second password mutation while one is pending', async () => {
    let finish!: (value: { id: number }) => void;
    mockedUpdatePassword.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    renderPage();
    await screen.findByText('suphan.owner');
    fireEvent.change(screen.getByLabelText(/รหัสผ่านปัจจุบัน/), {
      target: { value: 'OldPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/^รหัสผ่านใหม่/), {
      target: { value: 'NewPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/ยืนยันรหัสผ่านใหม่/), {
      target: { value: 'NewPassword123!' },
    });
    const form = screen.getByLabelText(/^รหัสผ่านใหม่/).closest('form')!;
    fireEvent.submit(form);
    expect(
      (
        await screen.findByRole('button', { name: 'กำลังบันทึก...' })
      ).hasAttribute('disabled'),
    ).toBe(true);
    fireEvent.submit(form);
    finish({ id: 22 });
    await screen.findByText('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
    expect(mockedUpdatePassword).toHaveBeenCalledTimes(1);
  });
  beforeEach(() => {
    mockedGetSettings.mockResolvedValue({
      accountName: 'แฟรนไชส์สุพรรณบุรี',
      username: 'suphan.owner',
      email: 'suphan@example.com',
      franchiseName: 'บริษัท สุพรรณบุรี คาเฟ่',
      branchName: 'สุพรรณบุรี S',
      branchCode: 'FRA-SPB-S',
      plan: 'S',
    });
    mockedUpdatePassword.mockResolvedValue({ id: 22 });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows franchise account information as read-only details', async () => {
    renderPage();

    expect(await screen.findByText('suphan.owner')).toBeTruthy();
    expect(screen.getByText('FRA-SPB-S')).toBeTruthy();
    expect(screen.getByText('แพ็กเกจ S')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /แก้ไขข้อมูลบัญชี/ }),
    ).toBeNull();
  });

  it('changes only the password after current-password confirmation', async () => {
    renderPage();
    await screen.findByText('suphan.owner');

    fireEvent.change(screen.getByLabelText(/รหัสผ่านปัจจุบัน/), {
      target: { value: 'OldPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/^รหัสผ่านใหม่/), {
      target: { value: 'NewPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/ยืนยันรหัสผ่านใหม่/), {
      target: { value: 'NewPassword123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }));

    await waitFor(() =>
      expect(mockedUpdatePassword.mock.calls[0]?.[0]).toEqual({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      }),
    );
    expect(
      await screen.findByText('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว'),
    ).toBeTruthy();
    expect(screen.getByLabelText(/รหัสผ่านปัจจุบัน/)).toHaveProperty(
      'value',
      '',
    );
    expect(screen.getByLabelText(/^รหัสผ่านใหม่/)).toHaveProperty('value', '');
    expect(screen.getByLabelText(/ยืนยันรหัสผ่านใหม่/)).toHaveProperty(
      'value',
      '',
    );
  });

  it('does not submit when password confirmation differs', async () => {
    renderPage();
    await screen.findByText('suphan.owner');

    fireEvent.change(screen.getByLabelText(/รหัสผ่านปัจจุบัน/), {
      target: { value: 'OldPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/^รหัสผ่านใหม่/), {
      target: { value: 'NewPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/ยืนยันรหัสผ่านใหม่/), {
      target: { value: 'DifferentPassword123!' },
    });

    expect(
      screen
        .getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(mockedUpdatePassword).not.toHaveBeenCalled();
  });

  it('keeps the password form available when the current password is rejected', async () => {
    mockedUpdatePassword.mockRejectedValueOnce(
      new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง'),
    );
    renderPage();
    await screen.findByText('suphan.owner');

    fireEvent.change(screen.getByLabelText(/รหัสผ่านปัจจุบัน/), {
      target: { value: 'Incorrect123!' },
    });
    fireEvent.change(screen.getByLabelText(/^รหัสผ่านใหม่/), {
      target: { value: 'NewPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/ยืนยันรหัสผ่านใหม่/), {
      target: { value: 'NewPassword123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }));

    expect(await screen.findByText('รหัสผ่านปัจจุบันไม่ถูกต้อง')).toBeTruthy();
    expect(
      screen.getByLabelText(/รหัสผ่านปัจจุบัน/).getAttribute('value'),
    ).toBe('Incorrect123!');
    expect(
      screen
        .getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' })
        .hasAttribute('disabled'),
    ).toBe(false);
  });
});
