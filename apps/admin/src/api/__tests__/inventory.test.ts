import { afterEach, describe, expect, it, vi } from 'vitest';

const secured = vi.hoisted(() => vi.fn());

vi.mock('../client', () => ({ secured }));

import {
  createInventory,
  deleteInventory,
  listInventory,
  updateInventory,
  type InventoryInput,
} from '../inventory';

const inventory: InventoryInput = {
  name: 'เมล็ดกาแฟ',
  category: 'กาแฟ',
  kind: 'ingredient',
  quantity: 12,
  unit: 'ถุง',
  reorderLevel: 3,
  unitCost: 250,
  expiryDate: '2026-12-31',
};

describe('admin inventory API', () => {
  afterEach(() => vi.clearAllMocks());

  it('keeps a branch code scoped and encoded when loading inventory', async () => {
    secured.mockResolvedValueOnce([]);

    await expect(listInventory('ingredient', 'SBC AYA/001')).resolves.toEqual(
      [],
    );

    expect(secured).toHaveBeenCalledWith(
      '/inventory?branchCode=SBC%20AYA%2F001&kind=ingredient',
    );
  });

  it('keeps the selected branch on every inventory mutation', async () => {
    secured
      .mockResolvedValueOnce({ id: 8 })
      .mockResolvedValueOnce({ id: 8 })
      .mockResolvedValueOnce(undefined);

    await createInventory(inventory, 'SBC-PLK-001');
    await updateInventory(8, { ...inventory, quantity: 9 }, 'SBC-PLK-001');
    await deleteInventory(8, 'SBC-PLK-001');

    expect(secured).toHaveBeenNthCalledWith(
      1,
      '/inventory?branchCode=SBC-PLK-001',
      { method: 'POST', data: inventory },
    );
    expect(secured).toHaveBeenNthCalledWith(
      2,
      '/inventory/8?branchCode=SBC-PLK-001',
      { method: 'PATCH', data: { ...inventory, quantity: 9 } },
    );
    expect(secured).toHaveBeenNthCalledWith(
      3,
      '/inventory/8?branchCode=SBC-PLK-001',
      { method: 'DELETE' },
    );
  });
});
