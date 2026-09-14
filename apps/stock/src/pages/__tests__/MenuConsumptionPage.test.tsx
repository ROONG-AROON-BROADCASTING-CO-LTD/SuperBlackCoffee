import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MenuConsumptionPage } from '../MenuConsumptionPage';

describe('MenuConsumptionPage', () => {
  // Keep the order-selection flow isolated between test cases.
  afterEach(cleanup);
  it('submits selected menu quantities instead of asking staff to edit ingredients', async () => {
    const onConsume = vi.fn().mockResolvedValue(undefined);
    render(
      <MenuConsumptionPage
        loading={false}
        onConsume={onConsume}
        menus={[
          {
            id: 7,
            name: 'อเมริกาโน่เย็น',
            category: 'เมนูกาแฟเย็น',
            status: 'available',
            recipeStatus: 'ready',
            sellable: true,
            ingredients: [
              {
                inventoryItemId: 1,
                name: 'กาแฟ',
                quantity: 20,
                unit: 'กรัม',
                inventoryQuantity: 1000,
                inventoryUnit: 'กรัม',
              },
            ],
          },
        ]}
      />,
    );
    expect(
      screen.getByText('วัตถุดิบ 1 รายการ · เหลือน้อยสุด 1,000 กรัม'),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'ตัดสต๊อก อเมริกาโน่เย็น' }),
    );
    fireEvent.click(
      screen.getAllByRole('button', { name: 'เปิดตะกร้าตัดสต๊อก' })[0],
    );
    expect(await screen.findByText('ตะกร้าตัดสต๊อก')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'ยืนยันตัดวัตถุดิบตามสูตร' }),
    );
    await vi.waitFor(() =>
      expect(onConsume).toHaveBeenCalledWith(
        [{ menuItemId: 7, quantity: 1 }],
        'สรุปยอดสิ้นกะ',
        'storefront',
      ),
    );
  });

  it('disables consumption confirmation when no sellable menu has been selected', () => {
    const onConsume = vi.fn().mockResolvedValue(undefined);
    render(
      <MenuConsumptionPage loading={false} onConsume={onConsume} menus={[]} />,
    );

    fireEvent.click(
      screen.getAllByRole('button', { name: 'เปิดตะกร้าตัดสต๊อก' })[0],
    );
    expect(
      (
        screen.getByRole('button', {
          name: 'ยืนยันตัดวัตถุดิบตามสูตร',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(onConsume).not.toHaveBeenCalled();
  });

  it('opens the cart when the navigation requests it', async () => {
    const onConsume = vi.fn().mockResolvedValue(undefined);
    const onCartRequestHandled = vi.fn();
    const { rerender } = render(
      <MenuConsumptionPage
        loading={false}
        onConsume={onConsume}
        menus={[]}
        cartRequestId={0}
      />,
    );

    rerender(
      <MenuConsumptionPage
        loading={false}
        onConsume={onConsume}
        menus={[]}
        cartRequestId={1}
        onCartRequestHandled={onCartRequestHandled}
      />,
    );

    expect(await screen.findByText('ตะกร้าตัดสต๊อก')).toBeTruthy();
    expect(onCartRequestHandled).toHaveBeenCalledTimes(1);
  });

  it('keeps the chosen menu when stock consumption fails', async () => {
    const onConsume = vi.fn().mockRejectedValue(new Error('สต๊อกไม่เพียงพอ'));
    render(
      <MenuConsumptionPage
        loading={false}
        onConsume={onConsume}
        menus={[
          {
            id: 8,
            name: 'ลาเต้เย็น',
            category: 'เมนูกาแฟเย็น',
            status: 'available',
            recipeStatus: 'ready',
            sellable: true,
            ingredients: [],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'ตัดสต๊อก ลาเต้เย็น' }));
    fireEvent.click(
      screen.getAllByRole('button', { name: 'เปิดตะกร้าตัดสต๊อก' })[0],
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'ยืนยันตัดวัตถุดิบตามสูตร' }),
    );

    expect(await screen.findByText('สต๊อกไม่เพียงพอ')).toBeTruthy();
    expect(screen.getByText('เลือกตัดแล้ว 1 แก้ว / จาน')).toBeTruthy();
  });
});
