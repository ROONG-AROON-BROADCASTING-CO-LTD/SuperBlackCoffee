import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { logout, restoreSession } from '../api/auth';
import App from '../App';

vi.mock('@stackbuild/ui', () => ({
  SbcThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../features/auth/FranchiseLoginPage', () => ({
  FranchiseLoginPage: () => <div>franchise-login</div>,
}));
vi.mock('../features/dashboard/FranchiseDashboard', () => ({
  FranchiseDashboard: ({
    logout,
    plan,
    branchName,
    branchCode,
  }: {
    logout: () => void;
    plan: string;
    branchName: string;
    branchCode: string;
  }) => (
    <>
      <span>franchise-plan-{plan}</span>
      <span>{`franchise-branch-${branchName}:${branchCode}`}</span>
      <button onClick={logout}>franchise-logout</button>
    </>
  ),
}));
vi.mock('../api/auth', () => ({
  logout: vi.fn().mockResolvedValue(undefined),
  restoreSession: vi.fn().mockResolvedValue({
    user: {
      id: 1,
      role: 'franchise_owner',
      plan: 'M',
      branchName: 'สุพรรณบุรี M',
      branchCode: 'FR-SUP-001-M',
    },
  }),
}));

describe('Franchise App session', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
  });
  it('restores the franchise session from its secure cookie and logs out', async () => {
    render(<App />);
    expect(await screen.findByText('franchise-plan-M')).toBeTruthy();
    expect(
      screen.getByText('franchise-branch-สุพรรณบุรี M:FR-SUP-001-M'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'franchise-logout' }));
    expect(screen.getByText('franchise-login')).toBeTruthy();
    expect(logout).toHaveBeenCalledOnce();
  });

  it('shows login when the restored cookie belongs to a different role', async () => {
    vi.mocked(restoreSession).mockResolvedValueOnce({
      user: { id: 1, role: 'admin' },
    });

    render(<App />);

    expect(await screen.findByText('franchise-login')).toBeTruthy();
  });

  it('defaults an older franchise cookie without a plan to the starter plan', async () => {
    vi.mocked(restoreSession).mockResolvedValueOnce({
      user: { id: 8, role: 'franchise_owner' },
    });

    render(<App />);

    expect(await screen.findByText('franchise-plan-S')).toBeTruthy();
  });

  it('shows login when restoring the franchise session fails', async () => {
    vi.mocked(restoreSession).mockRejectedValueOnce(new Error('เซสชันหมดอายุ'));

    render(<App />);

    expect(await screen.findByText('franchise-login')).toBeTruthy();
  });

  it('ends the session when an authenticated request reports expiry', async () => {
    sessionStorage.setItem('sbc-franchise-active-page', 'overview');
    sessionStorage.setItem('sbc-franchise-sidebar-collapsed', 'true');
    render(<App />);
    await screen.findByRole('button', { name: 'franchise-logout' });

    fireEvent(window, new Event('sbc:session-expired'));

    await waitFor(() =>
      expect(screen.getByText('franchise-login')).toBeTruthy(),
    );
    expect(logout).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem('sbc-franchise-active-page')).toBeNull();
    expect(
      sessionStorage.getItem('sbc-franchise-sidebar-collapsed'),
    ).toBeNull();
  });

  it('does not restore an expired franchise session from a late response', async () => {
    let resolveRestore!: (value: {
      user: { id: number; role: string; plan: 'M' };
    }) => void;
    vi.mocked(restoreSession).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRestore = resolve;
      }),
    );

    render(<App />);
    fireEvent(window, new Event('sbc:session-expired'));
    resolveRestore({ user: { id: 1, role: 'franchise_owner', plan: 'M' } });

    expect(await screen.findByText('franchise-login')).toBeTruthy();
    expect(screen.queryByText('franchise-plan-M')).toBeNull();
  });
});
