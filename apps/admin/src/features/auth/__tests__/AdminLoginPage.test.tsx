import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { login } from '../../../api';
import { AdminLoginPage } from '../AdminLoginPage';

const navigate = vi.fn();

vi.mock('@stackbuild/ui', () => ({
  ActionSnackbar: ({ notice }: { notice: { message: string } | null }) =>
    notice ? <div role="alert">{notice.message}</div> : null,
  LoginScreen: ({
    onSubmit,
  }: {
    onSubmit: (username: string, password: string) => Promise<void>;
  }) => (
    <button onClick={() => void onSubmit('admin', 'password')}>login</button>
  ),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('../../../api', () => ({ login: vi.fn() }));

describe('AdminLoginPage', () => {
  beforeEach(() => {
    vi.mocked(login).mockResolvedValue({
      user: { id: 1, role: 'admin' },
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('starts the admin session only for an admin account', async () => {
    const onLogin = vi.fn();
    render(<AdminLoginPage onLogin={onLogin} />);

    fireEvent.click(screen.getByRole('button', { name: 'login' }));

    await vi.waitFor(() => expect(onLogin).toHaveBeenCalledOnce());
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('does not start a session for a non-admin account', async () => {
    vi.mocked(login).mockResolvedValueOnce({
      user: { id: 2, role: 'franchise_owner' },
    });
    const onLogin = vi.fn();
    render(<AdminLoginPage onLogin={onLogin} />);

    fireEvent.click(screen.getByRole('button', { name: 'login' }));

    await vi.waitFor(() =>
      expect(screen.getByText('บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ')).toBeTruthy(),
    );
    expect(onLogin).not.toHaveBeenCalled();
  });
});
