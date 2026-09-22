import { request } from './client';

export type StockSession = {
  user: {
    id: number;
    name: string;
    role: 'cashier' | 'branch_manager';
    branchId: number;
    branchName: string;
    isFranchise: boolean;
  };
};

export type InventoryItem = {
  id: number;
  name: string;
  category: string;
  imageUrl?: string;
  kind: 'ingredient' | 'stock';
  stockCategory?: 'drink_equipment' | 'postal_equipment';
  quantity: number;
  unit: string;
  reorderLevel: number;
  status: 'ready' | 'low' | 'out' | 'stale' | 'cost_only';
  trackStock?: boolean;
  expiryDate?: string | null;
  expiryStatus?: 'none' | 'expiring_soon' | 'expired';
};

// Count and ordering screens are branch operations.  A cost-only input can
// still belong in a recipe, but it must never be presented as stock to count
// or replenish—even while older responses are being rolled out without the
// explicit `trackStock` flag.
export const isCountableStockItem = (
  item: Pick<InventoryItem, 'status' | 'trackStock'>,
) => item.trackStock !== false && item.status !== 'cost_only';

export type StockMovement = {
  id: number;
  inventoryItemName: string;
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  note: string;
  createdAt: string;
};
export type MenuItem = {
  id: number;
  name: string;
  category: string;
  imageUrl?: string;
  status: 'available' | 'soldout';
  storePrice?: number;
  storePriceAvailable?: boolean;
  linemanPrice?: number;
  linemanPriceAvailable?: boolean;
  recipeStatus: 'ready' | 'missing_recipe' | 'insufficient_stock';
  sellable: boolean;
  linemanRecipeStatus?: 'ready' | 'missing_recipe' | 'insufficient_stock';
  linemanSellable?: boolean;
  ingredients?: Array<{
    inventoryItemId: number;
    name: string;
    quantity: number;
    unit: string;
    inventoryQuantity: number;
    inventoryUnit: string;
  }>;
  linemanIngredients?: MenuItem['ingredients'];
};

export const loginStock = (username: string, pin: string) =>
  request<StockSession>('/stock/login', {
    method: 'POST',
    body: JSON.stringify({ username, pin }),
  });
export const restoreStockSession = () =>
  request<StockSession>('/stock/session');
export const logoutStock = () =>
  request<void>('/stock/logout', { method: 'POST' });
export const listInventory = (
  kind: 'ingredient' | 'stock',
  stockCategory?: InventoryItem['stockCategory'],
) =>
  request<InventoryItem[]>(
    `/inventory?kind=${kind}${stockCategory ? `&stockCategory=${stockCategory}` : ''}`,
  );
export const adjustInventory = (id: number, quantity: number, note: string) =>
  request<{ id: number; quantity: number }>(`/inventory/${id}/adjust`, {
    method: 'POST',
    body: JSON.stringify({ quantity, note }),
  });
export const listMyStockMovements = () =>
  request<StockMovement[]>('/stock-movements?limit=100');
export const createStockRequest = (data: {
  note: string;
  items: Array<{
    inventoryItemId: number;
    name: string;
    quantity: number;
    unit: string;
  }>;
}) =>
  request<{ id: number; status: 'pending' }>('/stock-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const listMenuItems = () => request<MenuItem[]>('/menu-items');
export const consumeStockFromMenus = (
  items: Array<{
    menuItemId: number;
    quantity: number;
    channel?: 'storefront' | 'lineman';
  }>,
  note: string,
  channel: 'storefront' | 'lineman',
) =>
  request<{ menuCount: number; salesTotal: number }>('/stock/consume', {
    method: 'POST',
    body: JSON.stringify({ items, note, channel }),
  });
