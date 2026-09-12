import { lazy, Suspense } from 'react';
import type { InventoryItem, MenuItem, StockMovement } from '../api/stock';
import { StockPageSkeleton } from '../components/skeletons/StockPageSkeleton';
import type { StockPage } from '../types/stock';

const StockOverviewPage = lazy(() =>
  import('../pages/StockOverviewPage').then(({ StockOverviewPage: Page }) => ({
    default: Page,
  })),
);
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
  movements: StockMovement[];
  isInitialLoading: boolean;
  onAdjust: (
    item: InventoryItem,
    quantity: number,
    note: string,
  ) => Promise<void>;
  onConsume: (
    items: Array<{ menuItemId: number; quantity: number }>,
    note: string,
    channel: 'storefront' | 'lineman',
  ) => Promise<void>;
};

export function StockPageRouter({
  page,
  ingredients,
  drinkStock,
  postalStock,
  menus,
  movements,
  isInitialLoading,
  onAdjust,
  onConsume,
}: StockPageRouterProps) {
  if (isInitialLoading) return <StockPageSkeleton page={page} />;

  let content;
  switch (page) {
    case 'sales':
      content = (
        <MenuConsumptionPage
          menus={menus}
          loading={false}
          onConsume={onConsume}
        />
      );
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
      content = (
        <StockOverviewPage
          ingredients={ingredients}
          drinkStock={drinkStock}
          postalStock={postalStock}
        />
      );
  }

  return (
    <Suspense fallback={<StockPageSkeleton page={page} />}>{content}</Suspense>
  );
}
