import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { login } from '../../../api/auth';
import { FranchiseLoginPage } from '../FranchiseLoginPage';

const navigate = vi.fn();

vi.mock('@stackbuild/ui', () => ({
  LoginScreen: ({
    onSubmit,
  }: {
    onSubmit: (username: string, password: string) => Promise<void>;
  }) => (
    <button
      onClick={() => void onSubmit('owner', 'password').catch(() => undefined)}
    >
      login
    </button>
  ),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('../../../api/auth', () => ({ login: vi.fn() }));

describe('FranchiseLoginPage', () => {
  beforeEach(() => {
    vi.mocked(login).mockResolvedValue({
      user: {
        id: 1,
        role: 'franchise_owner',
        plan: 'M',
        branchName: 'สุพรรณบุรี M',
        branchCode: 'FR-SUP-001-M',
      },
    });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('starts the franchise session with its real branch scope', async () => {
    const onLogin = vi.fn();
    render(<FranchiseLoginPage onLogin={onLogin} />);

    fireEvent.click(screen.getByRole('button', { name: 'login' }));

    await vi.waitFor(() =>
      expect(onLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: 'M',
          branchName: 'สุพรรณบุรี M',
          branchCode: 'FR-SUP-001-M',
        }),
      ),
    );
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('passes an older franchise session through for App-level safe defaults', async () => {
    vi.mocked(login).mockResolvedValueOnce({
      user: { id: 3, role: 'franchise_owner' },
    });
    const onLogin = vi.fn();
    render(<FranchiseLoginPage onLogin={onLogin} />);

    fireEvent.click(screen.getByRole('button', { name: 'login' }));

    await vi.waitFor(() =>
      expect(onLogin).toHaveBeenCalledWith({
        id: 3,
        role: 'franchise_owner',
      }),
    );
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('does not start a franchise session for another role', async () => {
    vi.mocked(login).mockResolvedValueOnce({
      user: { id: 2, role: 'admin' },
    });
    const onLogin = vi.fn();
    render(<FranchiseLoginPage onLogin={onLogin} />);

    fireEvent.click(screen.getByRole('button', { name: 'login' }));

    await vi.waitFor(() => expect(login).toHaveBeenCalledOnce());
    expect(onLogin).not.toHaveBeenCalled();
  });
});
