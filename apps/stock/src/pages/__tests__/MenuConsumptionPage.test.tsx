import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MenuConsumptionPage } from '../MenuConsumptionPage';

describe('MenuConsumptionPage', () => {
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
          },
        ]}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'ตัดสต๊อก อเมริกาโน่เย็น' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'ยืนยันตัดวัตถุดิบตามสูตร' }),
    );
    await vi.waitFor(() =>
      expect(onConsume).toHaveBeenCalledWith(
        [{ menuItemId: 7, quantity: 1 }],
        'สรุปยอดสิ้นกะ',
      ),
    );
  });
});
