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
    fireEvent.click(
      await screen.findByRole('button', { name: 'franchise-logout' }),
    );
    expect(screen.getByText('franchise-login')).toBeTruthy();
  });
});
