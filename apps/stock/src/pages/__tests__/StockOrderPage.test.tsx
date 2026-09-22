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

  it('keeps an order in the cart when sending fails so it can be retried', async () => {
    const onCreateRequest = vi
      .fn()
      .mockRejectedValueOnce(new Error('ส่งคำสั่งซื้อไม่สำเร็จ'))
      .mockResolvedValueOnce(undefined);
    render(
      <StockOrderPage
        ingredients={[item]}
        drinkStock={[]}
        postalStock={[]}
        isFranchise={false}
        onCreateRequest={onCreateRequest}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'เพิ่ม เมล็ดกาแฟ ในรายการสั่งซื้อ' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'เปิดรายการสั่งซื้อ' }));
    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำสั่งซื้อ' }));

    expect(await screen.findByText('ส่งคำสั่งซื้อไม่สำเร็จ')).toBeTruthy();
    expect(
      within(screen.getByRole('dialog')).getByText('เมล็ดกาแฟ'),
    ).toBeTruthy();
    expect(onCreateRequest).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำสั่งซื้อ' }));
    await waitFor(() => expect(onCreateRequest).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
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

  it('uses an inventory image from the API when one is available', () => {
    render(
      <StockOrderPage
        ingredients={[
          { ...item, imageUrl: 'https://cdn.example.test/coffee.png' },
        ]}
        drinkStock={[]}
        postalStock={[]}
        isFranchise={false}
        onCreateRequest={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('img', { name: 'รูปเมล็ดกาแฟ' }).getAttribute('src'),
    ).toBe('https://cdn.example.test/coffee.png');
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

  it('does not add a forwarded cost-only item to a branch order', () => {
    const onPendingItemAdded = vi.fn();
    render(
      <StockOrderPage
        ingredients={[item]}
        drinkStock={[]}
        postalStock={[]}
        isFranchise={false}
        onCreateRequest={vi.fn()}
        pendingItem={{
          ...item,
          id: 12,
          name: 'น้ำสกัดกาแฟ',
          status: 'cost_only',
        }}
        onPendingItemAdded={onPendingItemAdded}
      />,
    );

    expect(screen.queryByText('น้ำสกัดกาแฟ')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'เปิดรายการสั่งซื้อ' }).textContent,
    ).toContain('(0)');
    expect(onPendingItemAdded).toHaveBeenCalledOnce();
  });

  it('does not add a forwarded item explicitly marked as untracked stock', () => {
    const onPendingItemAdded = vi.fn();
    render(
      <StockOrderPage
        ingredients={[item]}
        drinkStock={[]}
        postalStock={[]}
        isFranchise={false}
        onCreateRequest={vi.fn()}
        pendingItem={{
          ...item,
          id: 13,
          name: 'น้ำกระบวนการ',
          trackStock: false,
        }}
        onPendingItemAdded={onPendingItemAdded}
      />,
    );

    expect(screen.queryByText('น้ำกระบวนการ')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'เปิดรายการสั่งซื้อ' }).textContent,
    ).toContain('(0)');
    expect(onPendingItemAdded).toHaveBeenCalledOnce();
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
