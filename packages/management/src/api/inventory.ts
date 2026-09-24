import { secured } from './client';

export type InventoryItem = {
  id: number;
  name: string;
  category: string;
  stockCategory?: 'drink_equipment' | 'postal_equipment';
  kind: 'ingredient' | 'stock';
  quantity: number;
  unit: string;
  reorderLevel: number;
  unitCost: number;
  trackStock?: boolean;
  status: 'ready' | 'low' | 'out' | 'stale' | 'cost_only';
  imageUrl: string;
  expiryDate?: string | null;
  expiryStatus?: 'none' | 'expiring_soon' | 'expired';
};
export type InventoryInput = {
  name: string;
  category: string;
  stockCategory?: 'drink_equipment' | 'postal_equipment';
  kind: 'ingredient' | 'stock';
  quantity: number;
  unit: string;
  reorderLevel: number;
  unitCost: number;
  trackStock?: boolean;
  imageUrl: string;
  expiryDate: string | null;
};

export type FreshInventoryLot = {
  id: number;
  lotNumber: string;
  manufacturedAt: string;
  receivedAt: string;
  expiryDate: string;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: number;
  status: 'active' | 'discarded';
  expiryStatus: 'ready' | 'expiring_soon' | 'expired';
  discardReason: string;
  createdAt: string;
};

export type FreshInventoryLotReceipt = {
  lotNumber: string;
  manufacturedAt: string;
  receivedAt: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
  note: string;
};

export type ExpiryWarningSettings = { warningDays: number };

export type ExpiryAlert = {
  lotId: number;
  inventoryItemId: number;
  ingredientName: string;
  lotNumber: string;
  manufacturedAt: string;
  expiryDate: string;
  quantityRemaining: number;
  unit: string;
  daysUntilExpiry: number;
  expiryStatus: 'ready' | 'expiring_soon' | 'expired';
};

export type ExpiryAlertsResponse = {
  warningDays: number;
  alerts: ExpiryAlert[];
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

export const listInventory = (
  kind: 'ingredient' | 'stock',
  branchCode = 'SBC-AYA-001',
  stockCategory?: 'drink_equipment' | 'postal_equipment',
) =>
  secured<InventoryItem[]>(
    `/inventory?branchCode=${encodeURIComponent(branchCode)}&kind=${kind}${
      stockCategory ? `&stockCategory=${stockCategory}` : ''
    }`,
  );

const branchQuery = (branchCode: string) =>
  `?branchCode=${encodeURIComponent(branchCode)}`;

export const createInventory = (data: InventoryInput, branchCode: string) =>
  secured<{ id: number }>(`/inventory${branchQuery(branchCode)}`, {
    method: 'POST',
    data,
  });

export const updateInventory = (
  id: number,
  data: InventoryInput,
  branchCode: string,
) =>
  secured<{ id: number }>(`/inventory/${id}${branchQuery(branchCode)}`, {
    method: 'PATCH',
    data,
  });

export const deleteInventory = (id: number, branchCode: string) =>
  secured<void>(`/inventory/${id}${branchQuery(branchCode)}`, {
    method: 'DELETE',
  });

export const adjustInventory = (
  id: number,
  quantity: number,
  note: string,
  branchCode: string,
) =>
  secured<{ id: number; quantity: number }>(
    `/inventory/${id}/adjust${branchQuery(branchCode)}`,
    { method: 'POST', data: { quantity, note } },
  );

export const listFreshInventoryLots = (id: number, branchCode: string) =>
  secured<FreshInventoryLot[]>(
    `/inventory/${id}/fresh-lots${branchQuery(branchCode)}`,
  );

export const receiveFreshInventoryLot = (
  inventoryID: number,
  data: FreshInventoryLotReceipt,
  branchCode: string,
) =>
  secured<{ id: number; quantity: number }>(
    `/inventory/${inventoryID}/fresh-lots${branchQuery(branchCode)}`,
    { method: 'POST', data },
  );

export const discardFreshInventoryLot = (
  lotID: number,
  quantity: number,
  note: string,
  branchCode: string,
) =>
  secured<{ id: number; quantity: number }>(
    `/fresh-inventory-lots/${lotID}${branchQuery(branchCode)}`,
    { method: 'POST', data: { quantity, note } },
  );

export const getExpiryWarningSettings = (branchCode: string) =>
  secured<ExpiryWarningSettings>(
    `/inventory/expiry-settings${branchQuery(branchCode)}`,
  );

export const updateExpiryWarningSettings = (
  warningDays: number,
  branchCode: string,
) =>
  secured<ExpiryWarningSettings>(
    `/inventory/expiry-settings${branchQuery(branchCode)}`,
    { method: 'PATCH', data: { warningDays } },
  );

export const listExpiryAlerts = (branchCode: string) =>
  secured<ExpiryAlertsResponse>(
    `/inventory/expiry-alerts${branchQuery(branchCode)}`,
  );

export const listExpiryPromotionSuggestions = (branchCode: string) =>
  secured<ExpiryPromotionSuggestionsResponse>(
    `/inventory/expiry-promotion-suggestions${branchQuery(branchCode)}`,
  );
