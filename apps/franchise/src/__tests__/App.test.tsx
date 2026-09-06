import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

vi.mock('@stackbuild/ui', () => ({
  SbcThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../features/auth/FranchiseLoginPage', () => ({
  FranchiseLoginPage: () => <div>franchise-login</div>,
}));
vi.mock('../features/dashboard/FranchiseDashboard', () => ({
  FranchiseDashboard: ({ logout }: { logout: () => void }) => (
    <button onClick={logout}>franchise-logout</button>
  ),
}));

describe('Franchise App session', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
  });
  it('restores and clears the franchise session', () => {
    sessionStorage.setItem('sbc-franchise-session', 'true');
    sessionStorage.setItem('sbc-access-token', 'token');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'franchise-logout' }));
    expect(screen.getByText('franchise-login')).toBeTruthy();
    expect(sessionStorage.getItem('sbc-franchise-session')).toBeNull();
    expect(sessionStorage.getItem('sbc-access-token')).toBeNull();
  });
});
