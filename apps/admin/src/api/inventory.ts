import { secured } from './client';

export type InventoryItem = {
  id: number;
  name: string;
  category: string;
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
  kind: 'ingredient' | 'stock';
  quantity: number;
  unit: string;
  reorderLevel: number;
  unitCost: number;
  expiryDate: string | null;
};
export const listInventory = (
  kind: 'ingredient' | 'stock',
  branchCode = 'SBC-AYA-001',
) =>
  secured<InventoryItem[]>(
    `/inventory?branchCode=${encodeURIComponent(branchCode)}&kind=${kind}`,
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
