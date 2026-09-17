import { lazy, Suspense } from 'react';
import { Box } from '@mui/material';
import { StockOrderCartDrawer } from '../components/StockOrderCartDrawer';
import type { InventoryItem, MenuItem, StockMovement } from '../api/stock';
import { StockPageSkeleton } from '../components/skeletons/StockPageSkeleton';
import type { StockPage } from '../types/stock';

const MenuConsumptionPage = lazy(() =>
  import('../pages/MenuConsumptionPage').then(
    ({ MenuConsumptionPage: Page }) => ({ default: Page }),
  ),
);
const StockCountPage = lazy(() =>
  import('../pages/StockCountPage').then(({ StockCountPage: Page }) => ({
    default: Page,
  })),
);
const StockHistoryPage = lazy(() =>
  import('../pages/StockHistoryPage').then(({ StockHistoryPage: Page }) => ({
    default: Page,
  })),
);
const StockOrderPage = lazy(() =>
  import('../pages/StockOrderPage').then(({ StockOrderPage: Page }) => ({
    default: Page,
  })),
);

type StockPageRouterProps = {
  page: StockPage;
  ingredients: InventoryItem[];
  drinkStock: InventoryItem[];
  postalStock: InventoryItem[];
  menus: MenuItem[];
  onRefreshMenus: () => Promise<MenuItem[]>;
  movements: StockMovement[];
  isInitialLoading: boolean;
  onAdjust: (
    item: InventoryItem,
    quantity: number,
    note: string,
  ) => Promise<void>;
  onConsume: (
    items: Array<{
      menuItemId: number;
      quantity: number;
      channel?: 'storefront' | 'lineman';
    }>,
    note: string,
    channel: 'storefront' | 'lineman',
  ) => Promise<void>;
  cartOpen: boolean;
  onCartOpenChange: (open: boolean) => void;
  onCartItemCountChange: (count: number) => void;
  cartMode: 'consume' | 'order';
  onCartModeChange: (mode: 'consume' | 'order') => void;
  isFranchise: boolean;
  onCreateStockRequest: (
    items: Array<{
      inventoryItemId: number;
      name: string;
      quantity: number;
      unit: string;
    }>,
    note: string,
  ) => Promise<void>;
  onOpenHistory: () => void;
  onOrderIngredients: (item: InventoryItem) => void;
  pendingOrderItem: InventoryItem | null;
  onPendingOrderItemAdded: () => void;
};

export function StockPageRouter({
  page,
  ingredients,
  drinkStock,
  postalStock,
  menus,
  onRefreshMenus,
  movements,
  isInitialLoading,
  onAdjust,
  onConsume,
  cartOpen,
  onCartOpenChange,
  onCartItemCountChange,
  cartMode,
  onCartModeChange,
  isFranchise,
  onCreateStockRequest,
  onOpenHistory,
  onOrderIngredients,
  pendingOrderItem,
  onPendingOrderItemAdded,
}: StockPageRouterProps) {
  if (isInitialLoading) return <StockPageSkeleton page={page} />;

  // Keep the cart mounted while switching pages. Its Drawer is portalled, so
  // it can open from Count or History without redirecting to the sales page.
  const menuConsumptionPage = (
    <MenuConsumptionPage
      menus={menus}
      onRefreshMenus={onRefreshMenus}
      loading={false}
      onConsume={onConsume}
      cartOpen={cartOpen}
      cartMode={cartMode}
      onCartOpenChange={onCartOpenChange}
      onCartItemCountChange={
        cartMode === 'consume' ? onCartItemCountChange : undefined
      }
      onStartStockDeduction={() => onCartModeChange('consume')}
      onOpenHistory={onOpenHistory}
    />
  );

  let content = null;
  switch (page) {
    case 'sales':
      break;
    case 'count':
      content = (
        <StockCountPage
          ingredients={ingredients}
          drinkStock={drinkStock}
          postalStock={postalStock}
          loading={false}
          onAdjust={onAdjust}
          onOrderIngredients={onOrderIngredients}
        />
      );
      break;
    case 'history':
      content = <StockHistoryPage movements={movements} />;
      break;
    case 'order':
      content = (
        <StockOrderPage
          ingredients={ingredients}
          drinkStock={drinkStock}
          postalStock={postalStock}
          isFranchise={isFranchise}
          onCreateRequest={onCreateStockRequest}
          pendingItem={pendingOrderItem}
          onPendingItemAdded={onPendingOrderItemAdded}
        />
      );
      break;
    default:
      break;
  }

  return (
    <Suspense fallback={<StockPageSkeleton page={page} />}>
      <Box sx={{ display: page === 'sales' ? 'block' : 'none' }}>
        {menuConsumptionPage}
      </Box>
      {content}
      <StockOrderCartDrawer
        open={cartOpen && cartMode === 'order'}
        pendingItem={pendingOrderItem}
        isFranchise={isFranchise}
        onOpenChange={onCartOpenChange}
        onPendingItemAdded={onPendingOrderItemAdded}
        onItemCountChange={
          cartMode === 'order' ? onCartItemCountChange : () => undefined
        }
        onCreateRequest={onCreateStockRequest}
      />
    </Suspense>
  );
}
