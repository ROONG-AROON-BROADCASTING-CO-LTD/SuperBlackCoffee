import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

describe('Admin App session', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
  });
  it('restores and clears the admin session', () => {
    sessionStorage.setItem('sbc-admin-session', 'true');
    sessionStorage.setItem('sbc-access-token', 'token');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'admin-logout' }));
    expect(screen.getByText('admin-login')).toBeTruthy();
    expect(sessionStorage.getItem('sbc-admin-session')).toBeNull();
    expect(sessionStorage.getItem('sbc-access-token')).toBeNull();
  });
});
