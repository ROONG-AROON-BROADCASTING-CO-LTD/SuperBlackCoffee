import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adjustInventory,
  consumeStockFromMenus,
  listInventory,
  listMenuItems,
  listMyStockMovements,
  logoutStock,
  restoreStaffSessionForStock,
  restoreStockSession,
} from '../api/stock';
import { ApiRequestError } from '../api/client';
import App from '../App';

const mutationOutcome = vi.hoisted(() => vi.fn());

vi.mock('@stackbuild/ui', () => ({
  SbcThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  ActionSnackbar: () => null,
  ConnectionRetrySnackbar: () => null,
  CircleCheckIcon: () => <span aria-hidden="true" />,
  tabletOrSmallerMediaQuery: '(max-width:899.95px)',
  snackbarAnchorOrigin: (isTabletOrSmaller: boolean) => ({
    vertical: isTabletOrSmaller ? 'top' : 'bottom',
    horizontal: 'center',
  }),
  snackbarBelowTopbarSx: {},
  snackbarBottomSx: {},
  useServiceWorkerUpdateAvailable: () => false,
}));
vi.mock('../components/StockNavigation', () => ({
  stockNavigation: [{ page: 'sales', label: 'บันทึกเมนูที่ขาย' }],
}));
vi.mock('../components/AutoRetrySnackbar', () => ({
  AutoRetrySnackbar: ({ open }: { open: boolean }) => (
    <output data-testid="stock-retry-open">{String(open)}</output>
  ),
}));
vi.mock('../api/stock', () => ({
  adjustInventory: vi.fn(),
  consumeStockFromMenus: vi.fn(),
  listInventory: vi.fn().mockResolvedValue([]),
  listMenuItems: vi.fn().mockResolvedValue([]),
  listMyStockMovements: vi.fn().mockResolvedValue([]),
  isStockSession: (value: { user?: { id?: number } }) =>
    typeof value.user?.id === 'number',
  loginStock: vi.fn(),
  confirmStaffSessionForStock: vi.fn(),
  logoutStock: vi.fn().mockResolvedValue(undefined),
  restoreStockSession: vi.fn().mockResolvedValue({
    user: {
      id: 7,
      name: 'พนักงานสต๊อก',
      role: 'cashier',
      branchId: 4,
      branchName: 'อยุธยา',
      isFranchise: false,
    },
  }),
  restoreStaffSessionForStock: vi.fn(),
  setupStockPIN: vi.fn(),
}));
vi.mock('../features/auth/StockLoginPage', () => ({
  StockLoginPage: ({
    staffSession,
  }: {
    staffSession?: { user: { name: string } };
  }) => (
    <div>
      stock-login
      {staffSession ? <output>{staffSession.user.name}</output> : null}
    </div>
  ),
}));
vi.mock('../layouts/StockAppLayout', () => ({
  StockAppLayout: ({
    children,
    onLogout,
    onToggleCart,
    onPage,
  }: {
    children: React.ReactNode;
    onLogout: () => void;
    onToggleCart: () => void;
    onPage: (page: 'history') => void;
  }) => (
    <>
      <button onClick={onLogout}>stock-logout</button>
      <button onClick={onToggleCart}>toggle-stock-cart</button>
      <button onClick={() => onPage('history')}>go-history</button>
      {children}
    </>
  ),
}));
vi.mock('../routes/StockPageRouter', () => ({
  StockPageRouter: ({
    page,
    cartOpen,
    onOrderIngredients,
    isInitialLoading,
    onConsume,
    onAdjust,
  }: {
    page: string;
    cartOpen: boolean;
    isInitialLoading: boolean;
    onConsume: (
      items: { menuItemId: number; quantity: number }[],
      note: string,
      channel: 'storefront',
    ) => Promise<void>;
    onAdjust: (
      item: { id: number; name: string; unit: string },
      quantity: number,
      note: string,
    ) => Promise<void>;
    onOrderIngredients: (item: {
      id: number;
      name: string;
      category: string;
      kind: 'ingredient';
      quantity: number;
      unit: string;
      reorderLevel: number;
      status: 'low';
    }) => void;
  }) => (
    <div>
      <div data-testid="stock-page">{page}</div>
      <button
        onClick={() =>
          void onConsume(
            [{ menuItemId: 1, quantity: 1 }],
            'audit',
            'storefront',
          ).then(
            () => mutationOutcome('saved'),
            () => mutationOutcome('rejected'),
          )
        }
      >
        consume-stock
      </button>
      <button
        onClick={() =>
          void onAdjust({ id: 1, name: 'นม', unit: 'กรัม' }, 5, 'audit').then(
            () => mutationOutcome('saved'),
            () => mutationOutcome('rejected'),
          )
        }
      >
        adjust-stock
      </button>
      <output data-testid="cart-open">{String(cartOpen)}</output>
      <output data-testid="stock-initial-loading">
        {String(isInitialLoading)}
      </output>
      <button
        onClick={() =>
          onOrderIngredients({
            id: 99,
            name: 'เมล็ดกาแฟ',
            category: 'coffee',
            kind: 'ingredient',
            quantity: 1,
            unit: 'ถุง',
            reorderLevel: 3,
            status: 'low',
          })
        }
      >
        add-order-ingredient
      </button>
    </div>
  ),
}));

describe('Stock App session and loading', () => {
  it('clears stock data and route when server logout fails offline', async () => {
    vi.mocked(logoutStock).mockRejectedValueOnce(new Error('offline logout'));
    render(<App />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'stock-logout' }),
    );
    await Promise.resolve();
    await waitFor(() => expect(screen.getByText('stock-login')).not.toBeNull());
    expect(location.pathname).toBe('/sales');
    expect(logoutStock).toHaveBeenCalledOnce();
  });
  it.each(['consume', 'adjust'])(
    'still rejects a failed %s mutation without refreshing or reporting success',
    async (operation) => {
      if (operation === 'consume')
        vi.mocked(consumeStockFromMenus).mockRejectedValueOnce(
          new Error('rejected mutation'),
        );
      else
        vi.mocked(adjustInventory).mockRejectedValueOnce(
          new Error('rejected mutation'),
        );
      render(<App />);
      await waitFor(() =>
        expect(screen.getByTestId('stock-initial-loading').textContent).toBe(
          'false',
        ),
      );
      fireEvent.click(
        screen.getByRole('button', { name: `${operation}-stock` }),
      );
      await waitFor(() =>
        expect(mutationOutcome).toHaveBeenCalledExactlyOnceWith('rejected'),
      );
      expect(listInventory).toHaveBeenCalledTimes(3);
      expect(listMyStockMovements).toHaveBeenCalledOnce();
    },
  );

  it('clears the stock session if a post-commit refresh reports an expired cookie', async () => {
    vi.mocked(consumeStockFromMenus).mockResolvedValueOnce({
      menuCount: 1,
      salesTotal: 60,
    } as Awaited<ReturnType<typeof consumeStockFromMenus>>);
    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId('stock-initial-loading').textContent).toBe(
        'false',
      ),
    );
    vi.mocked(listMyStockMovements).mockRejectedValueOnce(
      new ApiRequestError('expired', 401),
    );
    fireEvent.click(screen.getByRole('button', { name: 'consume-stock' }));
    await screen.findByText('stock-login');
    expect(logoutStock).toHaveBeenCalledOnce();
    expect(consumeStockFromMenus).toHaveBeenCalledOnce();
  });
  it.each(['consume', 'adjust'])(
    'does not report a committed %s as failed when the following refresh is offline',
    async (operation) => {
      if (operation === 'consume')
        vi.mocked(consumeStockFromMenus).mockResolvedValueOnce({
          menuCount: 1,
          salesTotal: 60,
        } as Awaited<ReturnType<typeof consumeStockFromMenus>>);
      else
        vi.mocked(adjustInventory).mockResolvedValueOnce({
          quantity: 5,
        } as Awaited<ReturnType<typeof adjustInventory>>);
      render(<App />);
      await waitFor(() =>
        expect(screen.getByTestId('stock-initial-loading').textContent).toBe(
          'false',
        ),
      );
      vi.mocked(listMyStockMovements).mockRejectedValueOnce(
        new Error('offline after commit'),
      );
      fireEvent.click(
        screen.getByRole('button', { name: `${operation}-stock` }),
      );
      await waitFor(() =>
        expect(mutationOutcome).toHaveBeenCalledExactlyOnceWith('saved'),
      );
      expect(screen.getByTestId('stock-retry-open').textContent).toBe('true');
      fireEvent(window, new Event('online'));
      await waitFor(() =>
        expect(screen.getByTestId('stock-retry-open').textContent).toBe(
          'false',
        ),
      );
      expect(
        operation === 'consume' ? consumeStockFromMenus : adjustInventory,
      ).toHaveBeenCalledOnce();
    },
  );
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

  it('uses sales as the default page when the old overview URL is opened', async () => {
    window.history.replaceState(null, '', '/');

    render(<App />);

    expect((await screen.findByTestId('stock-page')).textContent).toBe('sales');
  });

  it('opens the promotions workspace from its dedicated route', async () => {
    window.history.replaceState(null, '', '/promotions');
    render(<App />);

    expect((await screen.findByTestId('stock-page')).textContent).toBe(
      'promotions',
    );
  });

  it('keeps the previous order URL pointing to promotions', async () => {
    window.history.replaceState(null, '', '/order');
    render(<App />);

    expect((await screen.findByTestId('stock-page')).textContent).toBe(
      'promotions',
    );
  });

  it('keeps the session and reloads all stock data when the connection returns', async () => {
    vi.mocked(listInventory).mockRejectedValueOnce(
      new Error('network unavailable'),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('stock-retry-open').textContent).toBe('true');
    });
    expect(screen.getByTestId('stock-page')).toBeTruthy();

    fireEvent(window, new Event('online'));

    await waitFor(() => {
      expect(screen.getByTestId('stock-retry-open').textContent).toBe('false');
    });
    expect(listInventory).toHaveBeenCalledTimes(6);
    expect(listMyStockMovements).toHaveBeenCalledTimes(2);
    expect(listMenuItems).toHaveBeenCalledTimes(2);
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

  it('offers the Staff PIN flow when the dedicated Stock session is missing', async () => {
    vi.mocked(restoreStockSession).mockRejectedValueOnce(
      new ApiRequestError('ไม่พบเซสชันหรือเซสชันหมดอายุ', 401),
    );
    vi.mocked(restoreStaffSessionForStock).mockResolvedValueOnce({
      user: { name: 'พนักงานอยุธยา' },
    });

    render(<App />);

    expect(await screen.findByText('พนักงานอยุธยา')).toBeTruthy();
    expect(restoreStaffSessionForStock).toHaveBeenCalledOnce();
  });

  it('logs out locally and resets the browser route to sales', async () => {
    window.history.replaceState(null, '', '/history');
    render(<App />);

    await screen.findByTestId('stock-page');
    fireEvent.click(screen.getByRole('button', { name: 'stock-logout' }));

    await waitFor(() => expect(screen.getByText('stock-login')).toBeTruthy());
    expect(logoutStock).toHaveBeenCalledOnce();
    expect(window.location.pathname).toBe('/sales');
  });

  it('shows login when the stock session cannot be restored', async () => {
    vi.mocked(restoreStockSession).mockRejectedValueOnce(
      new Error('เซสชันหมดอายุ'),
    );

    render(<App />);

    expect(await screen.findByText('stock-login')).toBeTruthy();
  });

  it('does not restore a signed-out screen when an earlier inventory load completes late', async () => {
    let resolveInventory!: (
      items: Awaited<ReturnType<typeof listInventory>>,
    ) => void;
    vi.mocked(listInventory).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInventory = resolve;
        }),
    );
    render(<App />);
    await screen.findByTestId('stock-page');
    await waitFor(() => expect(listInventory).toHaveBeenCalledTimes(3));
    fireEvent.click(screen.getByRole('button', { name: 'stock-logout' }));
    await screen.findByText('stock-login');
    await act(async () => {
      resolveInventory([]);
    });
    expect(screen.getByText('stock-login')).toBeTruthy();
    expect(screen.queryByTestId('stock-page')).toBeNull();
    expect(logoutStock).toHaveBeenCalledOnce();
  });

  it('toggles cart visibility directly without an intermediate request state', async () => {
    render(<App />);
    await screen.findByTestId('stock-page');

    fireEvent.click(screen.getByRole('button', { name: 'toggle-stock-cart' }));
    await waitFor(() =>
      expect(screen.getByTestId('cart-open').textContent).toBe('true'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'toggle-stock-cart' }));
    await waitFor(() =>
      expect(screen.getByTestId('cart-open').textContent).toBe('false'),
    );
  });

  it('opens the cart from another stock page without redirecting to sales', async () => {
    window.history.replaceState(null, '', '/count');
    render(<App />);

    expect((await screen.findByTestId('stock-page')).textContent).toBe('count');
    fireEvent.click(screen.getByRole('button', { name: 'toggle-stock-cart' }));

    await waitFor(() =>
      expect(screen.getByTestId('cart-open').textContent).toBe('true'),
    );
    expect(screen.getByTestId('stock-page').textContent).toBe('count');
    expect(window.location.pathname).toBe('/count');

    fireEvent.click(screen.getByRole('button', { name: 'go-history' }));
    await waitFor(() =>
      expect(screen.getByTestId('cart-open').textContent).toBe('false'),
    );
    expect(screen.getByTestId('stock-page').textContent).toBe('history');
  });

  it('adds an ingredient to the order cart without popping the cart open', async () => {
    window.history.replaceState(null, '', '/count');
    render(<App />);

    await screen.findByTestId('stock-page');
    fireEvent.click(
      screen.getByRole('button', { name: 'add-order-ingredient' }),
    );

    expect(screen.getByTestId('cart-open').textContent).toBe('false');
    expect(window.location.pathname).toBe('/count');
  });
});
