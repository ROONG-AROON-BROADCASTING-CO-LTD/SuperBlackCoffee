import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StockPageRouter } from '../StockPageRouter';

vi.mock('../../components/skeletons/StockPageSkeleton', () => ({
  StockPageSkeleton: ({ page }: { page: string }) => (
    <div data-testid="stock-skeleton">{page}</div>
  ),
}));
vi.mock('../../pages/MenuConsumptionPage', () => ({
  MenuConsumptionPage: () => <div data-testid="menu-consumption-page" />,
}));
vi.mock('../../pages/StockCountPage', () => ({
  StockCountPage: () => <div data-testid="stock-count-page" />,
}));
vi.mock('../../pages/StockHistoryPage', () => ({
  StockHistoryPage: ({ movements }: { movements: unknown[] }) => (
    <div data-testid="stock-history-page">{movements.length}</div>
  ),
}));
vi.mock('@stackbuild/management/pages/promotions', () => ({
  PromotionsManagementPage: ({
    mode,
    branchName,
  }: {
    mode: string;
    branchName: string;
  }) => (
    <div data-testid="promotions-page">
      {mode}:{branchName}
    </div>
  ),
}));
vi.mock('../../components/StockOrderCartDrawer', () => ({
  StockOrderCartDrawer: ({ open }: { open: boolean }) => (
    <output data-testid="order-cart-open">{String(open)}</output>
  ),
}));

const baseProps = {
  ingredients: [],
  drinkStock: [],
  postalStock: [],
  menus: [],
  onRefreshMenus: vi.fn().mockResolvedValue([]),
  movements: [
    {
      id: 1,
      inventoryItemName: 'เมล็ดกาแฟ',
      quantityDelta: -1,
      quantityBefore: 10,
      quantityAfter: 9,
      note: 'ขายหน้าร้าน',
      createdAt: '2026-09-21T08:00:00+07:00',
    },
  ],
  onAdjust: vi.fn(),
  onConsume: vi.fn(),
  cartOpen: false,
  onCartOpenChange: vi.fn(),
  onCartItemCountChange: vi.fn(),
  cartMode: 'consume' as const,
  onCartModeChange: vi.fn(),
  isFranchise: false,
  branchName: 'อยุธยา',
  onCreateStockRequest: vi.fn(),
  onOpenHistory: vi.fn(),
  onOrderIngredients: vi.fn(),
  pendingOrderItem: null,
  onPendingOrderItemAdded: vi.fn(),
};

describe('StockPageRouter', () => {
  afterEach(cleanup);

  it('keeps the page-specific skeleton visible while initial data is loading', () => {
    render(<StockPageRouter {...baseProps} page="count" isInitialLoading />);

    expect(screen.getByTestId('stock-skeleton').textContent).toBe('count');
    expect(screen.queryByTestId('stock-count-page')).toBeNull();
  });

  it.each([
    ['count', 'stock-count-page', ''],
    ['history', 'stock-history-page', '1'],
    ['promotions', 'promotions-page', 'franchise:อยุธยา'],
  ] as const)('routes %s to the expected page', async (page, testId, text) => {
    render(
      <StockPageRouter {...baseProps} page={page} isInitialLoading={false} />,
    );

    const routedPage = await screen.findByTestId(testId);
    expect(routedPage.textContent).toBe(text);
    expect(screen.getByTestId('menu-consumption-page')).toBeTruthy();
  });

  it('opens the order drawer only when the persistent cart is in order mode', async () => {
    const { rerender } = render(
      <StockPageRouter
        {...baseProps}
        page="count"
        cartOpen
        cartMode="consume"
        isInitialLoading={false}
      />,
    );

    expect((await screen.findByTestId('order-cart-open')).textContent).toBe(
      'false',
    );

    rerender(
      <StockPageRouter
        {...baseProps}
        page="count"
        cartOpen
        cartMode="order"
        isInitialLoading={false}
      />,
    );

    expect(screen.getByTestId('order-cart-open').textContent).toBe('true');
  });
});
