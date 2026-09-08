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
  }: {
    logout: () => void;
    plan: string;
  }) => (
    <>
      <span>franchise-plan-{plan}</span>
      <button onClick={logout}>franchise-logout</button>
    </>
  ),
}));
vi.mock('../api/auth', () => ({
  logout: vi.fn().mockResolvedValue(undefined),
  restoreSession: vi
    .fn()
    .mockResolvedValue({ user: { role: 'franchise_owner', plan: 'M' } }),
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
});
