import { afterEach, describe, expect, it, vi } from 'vitest';

const secured = vi.hoisted(() => vi.fn());

vi.mock('../client', () => ({ secured }));

import {
  createMenuItem,
  deleteMenuItem,
  listMenuItems,
  updateMenuItem,
  type MenuInput,
} from '../menu';

const menu: MenuInput = {
  name: 'อเมริกาโน่เย็น',
  category: 'กาแฟ',
  storePrice: 60,
  linemanPrice: 70,
  linemanCostPrice: 20,
  costPrice: 18,
  ingredients: [{ inventoryItemId: 4, quantity: 18, unit: 'กรัม' }],
};

describe('admin menu API', () => {
  afterEach(() => vi.clearAllMocks());

  it('keeps an encoded branch scope on menu reads and every menu mutation', async () => {
    secured
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ id: 8 })
      .mockResolvedValueOnce({ id: 8 })
      .mockResolvedValueOnce(undefined);

    await listMenuItems('SBC AYA/001');
    await createMenuItem(menu, 'SBC AYA/001');
    await updateMenuItem(8, { ...menu, storePrice: 65 }, 'SBC AYA/001');
    await deleteMenuItem(8, 'SBC AYA/001');

    expect(secured).toHaveBeenNthCalledWith(
      1,
      '/menu-items?branchCode=SBC%20AYA%2F001',
    );
    expect(secured).toHaveBeenNthCalledWith(
      2,
      '/menu-items?branchCode=SBC%20AYA%2F001',
      { method: 'POST', data: menu },
    );
    expect(secured).toHaveBeenNthCalledWith(
      3,
      '/menu-items/8?branchCode=SBC%20AYA%2F001',
      { method: 'PATCH', data: { ...menu, storePrice: 65 } },
    );
    expect(secured).toHaveBeenNthCalledWith(
      4,
      '/menu-items/8?branchCode=SBC%20AYA%2F001',
      { method: 'DELETE' },
    );
  });
});
