import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MenuConsumptionPage } from '../MenuConsumptionPage';

describe('MenuConsumptionPage', () => {
  // Keep the order-selection flow isolated between test cases.
  afterEach(cleanup);
  it('submits selected menu quantities instead of asking staff to edit ingredients', async () => {
    const onConsume = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <MenuConsumptionPage
        loading={false}
        onConsume={onConsume}
        cartOpen={false}
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
      screen.queryByText('วัตถุดิบ 1 รายการ · เหลือน้อยสุด 1,000 กรัม'),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'ลดจำนวน อเมริกาโน่เย็น' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'ตัดสต๊อก อเมริกาโน่เย็น' }),
    );
    rerender(
      <MenuConsumptionPage
        loading={false}
        onConsume={onConsume}
        cartOpen
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
    expect(await screen.findByText('ตะกร้าตัดสต๊อก')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'ยืนยันตัดวัตถุดิบตามสูตร' }),
    );
    await vi.waitFor(() =>
      expect(onConsume).toHaveBeenCalledWith(
        [{ menuItemId: 7, quantity: 1, channel: 'storefront' }],
        'สรุปยอดสิ้นกะ',
        'storefront',
      ),
    );
  });

  it('disables consumption confirmation when no sellable menu has been selected', () => {
    const onConsume = vi.fn().mockResolvedValue(undefined);
    render(
      <MenuConsumptionPage
        loading={false}
        onConsume={onConsume}
        menus={[]}
        cartOpen
      />,
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

  it('renders the cart immediately when its parent opens it', async () => {
    const onConsume = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <MenuConsumptionPage
        loading={false}
        onConsume={onConsume}
        menus={[]}
        cartOpen={false}
      />,
    );

    rerender(
      <MenuConsumptionPage
        loading={false}
        onConsume={onConsume}
        menus={[]}
        cartOpen
      />,
    );

    expect(await screen.findByText('ตะกร้าตัดสต๊อก')).toBeTruthy();
  });

  it('offers Excel import only and does not render an image-upload control', () => {
    render(
      <MenuConsumptionPage
        loading={false}
        onConsume={vi.fn().mockResolvedValue(undefined)}
        menus={[]}
      />,
    );

    expect(screen.getByRole('button', { name: 'นำเข้า Excel' })).toBeTruthy();
    expect(screen.queryByText('อัปโหลดภาพ')).toBeNull();
    expect(screen.queryByLabelText(/อัปโหลด.*ภาพ/u)).toBeNull();
  });

  it('does not render the sales summary heading on the stock home screen', () => {
    render(
      <MenuConsumptionPage
        loading={false}
        onConsume={vi.fn().mockResolvedValue(undefined)}
        menus={[]}
      />,
    );

    expect(screen.queryByText('สรุปเมนูที่ขาย')).toBeNull();
    expect(
      screen.queryByText('เลือกจำนวนที่ขาย ระบบจะตัดวัตถุดิบตามสูตรอัตโนมัติ'),
    ).toBeNull();
  });

  it('keeps the chosen menu when stock consumption fails', async () => {
    const onConsume = vi.fn().mockRejectedValue(new Error('สต๊อกไม่เพียงพอ'));
    const { rerender } = render(
      <MenuConsumptionPage
        loading={false}
        onConsume={onConsume}
        cartOpen={false}
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
    rerender(
      <MenuConsumptionPage
        loading={false}
        onConsume={onConsume}
        cartOpen
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
    fireEvent.click(
      screen.getByRole('button', { name: 'ยืนยันตัดวัตถุดิบตามสูตร' }),
    );

    expect(await screen.findByText('สต๊อกไม่เพียงพอ')).toBeTruthy();
    expect(screen.getByText('เลือกแล้ว 1 แก้ว / จาน')).toBeTruthy();
  });
});
