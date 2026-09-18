import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StockOrderPage } from '../StockOrderPage';

const item = {
  id: 11,
  name: 'เมล็ดกาแฟ',
  category: 'coffee',
  kind: 'ingredient' as const,
  quantity: 2,
  unit: 'ถุง',
  reorderLevel: 3,
  status: 'low' as const,
};

describe('StockOrderPage', () => {
  afterEach(() => cleanup());

  it('sends a branch order to the headquarters workflow with the signed-in branch inventory only', async () => {
    const onCreateRequest = vi.fn().mockResolvedValue(undefined);
    render(
      <StockOrderPage
        ingredients={[item]}
        drinkStock={[]}
        postalStock={[]}
        isFranchise={false}
        onCreateRequest={onCreateRequest}
      />,
    );

    expect(
      screen.getByText(
        'ส่งคำขอเข้าหน้าคำสั่งซื้อของสำนักงานใหญ่เพื่อให้ทีม SBC ดำเนินการ',
      ),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'เพิ่ม เมล็ดกาแฟ ในรายการสั่งซื้อ',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'เปิดรายการสั่งซื้อ' }));
    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำสั่งซื้อ' }));

    await waitFor(() =>
      expect(onCreateRequest).toHaveBeenCalledWith(
        [
          {
            inventoryItemId: 11,
            name: 'เมล็ดกาแฟ',
            quantity: 1,
            unit: 'ถุง',
          },
        ],
        'ขอเติมสินค้าเข้าสต๊อก',
      ),
    );
  });

  it('labels franchise orders for the franchise dashboard workflow', () => {
    render(
      <StockOrderPage
        ingredients={[]}
        drinkStock={[item]}
        postalStock={[]}
        isFranchise
        onCreateRequest={vi.fn()}
      />,
    );

    expect(screen.getByText('คำสั่งซื้อแฟรนไชส์')).toBeTruthy();
    expect(
      screen.getByText(
        'ส่งคำขอเข้าหน้าแดชบอร์ดแฟรนไชส์เพื่อให้ผู้ดูแลดำเนินการ',
      ),
    ).toBeTruthy();
  });

  it('does not offer cost-only recipe inputs for a stock order', () => {
    render(
      <StockOrderPage
        ingredients={[
          item,
          {
            ...item,
            id: 12,
            name: 'น้ำสกัดกาแฟ',
            // Older saved records may only expose this persisted status.
            status: 'cost_only',
          },
        ]}
        drinkStock={[]}
        postalStock={[]}
        isFranchise={false}
        onCreateRequest={vi.fn()}
      />,
    );

    expect(screen.getByText('เมล็ดกาแฟ')).toBeTruthy();
    expect(screen.queryByText('น้ำสกัดกาแฟ')).toBeNull();
  });

  it('puts an ingredient selected from its stock card straight into the open order cart', () => {
    const onPendingItemAdded = vi.fn();
    render(
      <StockOrderPage
        ingredients={[item]}
        drinkStock={[]}
        postalStock={[]}
        isFranchise={false}
        onCreateRequest={vi.fn()}
        pendingItem={item}
        onPendingItemAdded={onPendingItemAdded}
      />,
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'วัตถุดิบ' })).toBeTruthy();
    expect(
      within(screen.getByRole('dialog')).getByText('เมล็ดกาแฟ'),
    ).toBeTruthy();
    expect(onPendingItemAdded).toHaveBeenCalledOnce();
  });
});
