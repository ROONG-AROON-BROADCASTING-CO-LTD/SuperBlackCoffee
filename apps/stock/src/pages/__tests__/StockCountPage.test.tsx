import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StockCountPage } from '../StockCountPage';

const ingredient = {
  id: 1,
  name: 'เมล็ดกาแฟ',
  category: 'coffee',
  kind: 'ingredient' as const,
  quantity: 10,
  unit: 'กรัม',
  reorderLevel: 2,
  status: 'ready' as const,
};

describe('StockCountPage', () => {
  it('records the actual remaining quantity with a required note', async () => {
    const onAdjust = vi.fn().mockResolvedValue(undefined);
    render(
      <StockCountPage
        ingredients={[ingredient]}
        drinkStock={[]}
        postalStock={[]}
        loading={false}
        onAdjust={onAdjust}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกยอดจริง' }));
    fireEvent.change(screen.getByLabelText('จำนวนคงเหลือ (กรัม)'), {
      target: { value: '6' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันบันทึก' }));
    await vi.waitFor(() =>
      expect(onAdjust).toHaveBeenCalledWith(ingredient, 6, 'ตรวจนับสิ้นกะ'),
    );
  });
});
