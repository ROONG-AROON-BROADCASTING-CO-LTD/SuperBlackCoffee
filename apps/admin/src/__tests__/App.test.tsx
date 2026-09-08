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
vi.mock('../features/auth/AdminLoginPage', () => ({
  AdminLoginPage: () => <div>admin-login</div>,
}));
vi.mock('../features/dashboard/AdminDashboard', () => ({
  AdminDashboard: ({ logout }: { logout: () => void }) => (
    <button onClick={logout}>admin-logout</button>
  ),
}));
vi.mock('../api/auth', () => ({
  logout: vi.fn().mockResolvedValue(undefined),
  restoreSession: vi.fn().mockResolvedValue({ user: { role: 'admin' } }),
}));

describe('Admin App session', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
  });
  it('restores the admin session from its secure cookie and logs out', async () => {
    render(<App />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'admin-logout' }),
    );
    expect(screen.getByText('admin-login')).toBeTruthy();
    expect(logout).toHaveBeenCalledOnce();
  });

  it('shows login when the restored cookie is missing or belongs to another role', async () => {
    vi.mocked(restoreSession).mockResolvedValueOnce({
      user: { id: 2, role: 'franchise_owner' },
    });

    render(<App />);

    expect(await screen.findByText('admin-login')).toBeTruthy();
  });

  it('ends the session when an authenticated request reports expiry', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'admin-logout' });

    fireEvent(window, new Event('sbc:session-expired'));

    await waitFor(() => expect(screen.getByText('admin-login')).toBeTruthy());
    expect(logout).toHaveBeenCalledOnce();
  });
});
