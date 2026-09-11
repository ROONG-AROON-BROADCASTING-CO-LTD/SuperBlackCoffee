import { secured } from './client';

export type MenuItem = {
  id: number;
  name: string;
  category: string;
  storePrice: number;
  storePriceAvailable: boolean;
  linemanPrice: number;
  linemanPriceAvailable: boolean;
  linemanCostPrice: number;
  costPrice: number;
  status: 'available' | 'soldout';
  ingredients: {
    inventoryItemId: number;
    name: string;
    quantity: number;
    unit: string;
    costAmount: number;
  }[];
  imageUrl: string;
};

export type MenuInput = {
  name: string;
  category: string;
  storePrice: number;
  linemanPrice: number;
  linemanCostPrice: number;
  costPrice: number;
  ingredients: { inventoryItemId: number; quantity: number; unit: string }[];
};

export const listMenuItems = (branchCode = 'SBC-AYA-001') =>
  secured<MenuItem[]>(
    `/menu-items?branchCode=${encodeURIComponent(branchCode)}`,
  );

export const updateMenuItem = (
  id: number,
  data: MenuInput,
  branchCode: string,
) =>
  secured<{ id: number }>(
    `/menu-items/${id}?branchCode=${encodeURIComponent(branchCode)}`,
    { method: 'PATCH', data },
  );
