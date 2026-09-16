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
  status: 'ready' | 'low' | 'out';
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
  imageUrl: string;
  expiryDate: string | null;
};

export type FreshInventoryLot = {
  id: number;
  lotNumber: string;
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
  receivedAt: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
  note: string;
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
