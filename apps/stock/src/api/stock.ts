import { request } from './client';

export type StockSession = {
  user: {
    id: number;
    name: string;
    role: 'cashier' | 'branch_manager';
    branchId: number;
    branchName: string;
  };
};

export type InventoryItem = {
  id: number;
  name: string;
  category: string;
  kind: 'ingredient' | 'stock';
  stockCategory?: 'drink_equipment' | 'postal_equipment';
  quantity: number;
  unit: string;
  reorderLevel: number;
  status: 'ready' | 'low' | 'out';
  expiryDate?: string | null;
};
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
  status: 'available' | 'soldout';
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
export const listMenuItems = () => request<MenuItem[]>('/menu-items');
export const consumeStockFromMenus = (
  items: Array<{ menuItemId: number; quantity: number }>,
  note: string,
  channel: 'storefront' | 'lineman',
) =>
  request<{ menuCount: number }>('/stock/consume', {
    method: 'POST',
    body: JSON.stringify({ items, note, channel }),
  });
