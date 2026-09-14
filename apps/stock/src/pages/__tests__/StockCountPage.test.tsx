import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  // Keep each stock-editing scenario independent; an open editor from one
  // render must not make the next interaction ambiguous.
  afterEach(cleanup);

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

  it('rejects a negative counted quantity before it can adjust stock', async () => {
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
      target: { value: '-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันบันทึก' }));

    expect(screen.getByText('กรอกจำนวนคงเหลือเป็น 0 หรือมากกว่า')).toBeTruthy();
    expect(onAdjust).not.toHaveBeenCalled();
  });

  it('requires a note before recording a stock adjustment', async () => {
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
    fireEvent.change(screen.getByLabelText('หมายเหตุ'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันบันทึก' }));

    expect(screen.getByText('ระบุหมายเหตุของการปรับยอด')).toBeTruthy();
    expect(onAdjust).not.toHaveBeenCalled();
  });

  it('keeps the count form open and reports a failed stock adjustment', async () => {
    const onAdjust = vi.fn().mockRejectedValue(new Error('บันทึกยอดไม่สำเร็จ'));
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
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันบันทึก' }));

    expect(await screen.findByText('บันทึกยอดไม่สำเร็จ')).toBeTruthy();
    expect(screen.getByLabelText('จำนวนคงเหลือ (กรัม)')).toBeTruthy();
  });
});
