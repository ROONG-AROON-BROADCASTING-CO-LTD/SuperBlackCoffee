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

export type StockPINChallenge = {
  requiresPIN?: true;
  requiresPINSetup?: true;
  user: { name: string };
};

export type StockLoginResult = StockSession | StockPINChallenge;

export type StockStaffSession = {
  user: { name: string };
};

export const isStockSession = (
  result: StockLoginResult,
): result is StockSession =>
  'id' in result.user &&
  'branchId' in result.user &&
  'branchName' in result.user;

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
  manufacturedAt?: string | null;
  expiryDate?: string | null;
  expiryStatus?: 'none' | 'expiring_soon' | 'expired';
};

export type StockDateDetails = {
  manufacturedAt?: string;
  expiryDate?: string;
};

export type ExpiryPromotionSuggestion = {
  menuId: number;
  menuName: string;
  category: string;
  storePrice: number;
  lotId: number;
  inventoryItemId: number;
  ingredientName: string;
  lotNumber: string;
  expiryDate: string;
  quantityRemaining: number;
  unit: string;
  daysUntilExpiry: number;
  suggestedDiscountPercent: number;
  reason: string;
};

export type ExpiryPromotionSuggestionsResponse = {
  warningDays: number;
  suggestions: ExpiryPromotionSuggestion[];
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

export const loginStock = (username: string, pin = '') =>
  request<StockLoginResult>('/stock/login', {
    method: 'POST',
    body: JSON.stringify({ username, pin }),
  });
export const setupStockPIN = (username: string, pin: string) =>
  request<StockSession>('/stock/setup-pin', {
    method: 'POST',
    body: JSON.stringify({ username, pin }),
  });
export const restoreStockSession = () =>
  request<StockSession>('/stock/session');
export const restoreStaffSessionForStock = () =>
  request<StockStaffSession>('/stock/staff-session', {
    headers: { 'X-SBC-Session-Role': 'attendance' },
  });
export const confirmStaffSessionForStock = (pin: string) =>
  request<StockSession>('/stock/staff-session/confirm', {
    method: 'POST',
    headers: { 'X-SBC-Session-Role': 'attendance' },
    body: JSON.stringify({ pin }),
  });
export const logoutStock = () =>
  request<void>('/stock/logout', { method: 'POST' });
export const listInventory = (
  kind: 'ingredient' | 'stock',
  stockCategory?: InventoryItem['stockCategory'],
) =>
  request<InventoryItem[]>(
    `/inventory?kind=${kind}${stockCategory ? `&stockCategory=${stockCategory}` : ''}`,
  );
export const adjustInventory = (
  id: number,
  quantity: number,
  note: string,
  dates?: StockDateDetails,
) =>
  request<{ id: number; quantity: number }>(`/inventory/${id}/adjust`, {
    method: 'POST',
    body: JSON.stringify({ quantity, note, ...dates }),
  });
export const listMyStockMovements = () =>
  request<StockMovement[]>('/stock-movements?limit=100');
export const listExpiryPromotionSuggestions = () =>
  request<ExpiryPromotionSuggestionsResponse>(
    '/inventory/expiry-promotion-suggestions',
  );
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
export const createExpenseRequest = (data: {
  title: string;
  category: 'maintenance' | 'office' | 'transport' | 'service' | 'other';
  estimatedAmount: number;
  note: string;
}) =>
  request<{ id: number; status: 'pending' }>('/expense-requests', {
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
