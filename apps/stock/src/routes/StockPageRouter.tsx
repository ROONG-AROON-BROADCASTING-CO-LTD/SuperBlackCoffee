import { lazy, Suspense } from 'react';
import { Box } from '@mui/material';
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
      onCartOpenChange={onCartOpenChange}
      onCartItemCountChange={onCartItemCountChange}
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
        />
      );
      break;
    case 'history':
      content = <StockHistoryPage movements={movements} />;
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
    </Suspense>
  );
}
