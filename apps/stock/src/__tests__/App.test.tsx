import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listInventory,
  listMenuItems,
  listMyStockMovements,
  logoutStock,
  restoreStockSession,
} from '../api/stock';
import { ApiRequestError } from '../api/client';
import App from '../App';

vi.mock('@stackbuild/ui', () => ({
  SbcThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  CircleCheckIcon: () => <span aria-hidden="true" />,
}));
vi.mock('../components/StockNavigation', () => ({
  stockNavigation: [
    { page: 'overview', label: 'ภาพรวม' },
    { page: 'sales', label: 'บันทึกเมนูที่ขาย' },
  ],
}));
vi.mock('../components/AutoRetrySnackbar', () => ({
  AutoRetrySnackbar: () => null,
}));
vi.mock('../api/stock', () => ({
  adjustInventory: vi.fn(),
  consumeStockFromMenus: vi.fn(),
  listInventory: vi.fn().mockResolvedValue([]),
  listMenuItems: vi.fn().mockResolvedValue([]),
  listMyStockMovements: vi.fn().mockResolvedValue([]),
  loginStock: vi.fn(),
  logoutStock: vi.fn().mockResolvedValue(undefined),
  restoreStockSession: vi.fn().mockResolvedValue({
    user: {
      id: 7,
      name: 'พนักงานสต๊อก',
      role: 'cashier',
      branchId: 4,
      branchName: 'อยุธยา',
    },
  }),
}));
vi.mock('../features/auth/StockLoginPage', () => ({
  StockLoginPage: () => <div>stock-login</div>,
}));
vi.mock('../layouts/StockAppLayout', () => ({
  StockAppLayout: ({
    children,
    onLogout,
  }: {
    children: React.ReactNode;
    onLogout: () => void;
  }) => (
    <>
      <button onClick={onLogout}>stock-logout</button>
      {children}
    </>
  ),
}));
vi.mock('../routes/StockPageRouter', () => ({
  StockPageRouter: ({ page }: { page: string }) => (
    <div data-testid="stock-page">{page}</div>
  ),
}));

describe('Stock App session and loading', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('restores the stock cookie session, loads all branch stock groups, and keeps the URL page', async () => {
    window.history.replaceState(null, '', '/sales');

    render(<App />);

    expect((await screen.findByTestId('stock-page')).textContent).toBe('sales');
    await waitFor(() => {
      expect(listInventory).toHaveBeenNthCalledWith(1, 'ingredient');
      expect(listInventory).toHaveBeenNthCalledWith(
        2,
        'stock',
        'drink_equipment',
      );
      expect(listInventory).toHaveBeenNthCalledWith(
        3,
        'stock',
        'postal_equipment',
      );
      expect(listMyStockMovements).toHaveBeenCalledOnce();
      expect(listMenuItems).toHaveBeenCalledOnce();
    });
  });

  it.each([401, 403])(
    'ends the local session when a protected stock request returns %i',
    async (status) => {
      vi.mocked(listInventory).mockRejectedValueOnce(
        new ApiRequestError('เซสชันใช้งานไม่ได้', status),
      );

      render(<App />);

      expect(await screen.findByText('stock-login')).toBeTruthy();
    },
  );

  it('logs out locally and resets the browser route to the overview', async () => {
    window.history.replaceState(null, '', '/history');
    render(<App />);

    await screen.findByTestId('stock-page');
    fireEvent.click(screen.getByRole('button', { name: 'stock-logout' }));

    await waitFor(() => expect(screen.getByText('stock-login')).toBeTruthy());
    expect(logoutStock).toHaveBeenCalledOnce();
    expect(window.location.pathname).toBe('/');
  });

  it('shows login when the stock session cannot be restored', async () => {
    vi.mocked(restoreStockSession).mockRejectedValueOnce(
      new Error('เซสชันหมดอายุ'),
    );

    render(<App />);

    expect(await screen.findByText('stock-login')).toBeTruthy();
  });
});
