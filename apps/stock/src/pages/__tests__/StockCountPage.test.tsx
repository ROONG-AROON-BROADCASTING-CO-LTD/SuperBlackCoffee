import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
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

  it('presents stock records as accessible cards in a responsive grid', () => {
    const onOrderIngredients = vi.fn();
    render(
      <StockCountPage
        ingredients={[ingredient, { ...ingredient, id: 2, name: 'นมสด' }]}
        drinkStock={[]}
        postalStock={[]}
        loading={false}
        onAdjust={vi.fn()}
        onOrderIngredients={onOrderIngredients}
      />,
    );

    const grid = screen.getByRole('list', { name: 'รายการตรวจนับสต๊อก' });
    expect(grid).toBeTruthy();
    expect(grid.querySelectorAll('[role="listitem"]')).toHaveLength(2);
    expect(grid.querySelectorAll('img[alt^="รูป"]')).toHaveLength(2);
    expect(
      screen.getAllByRole('button', { name: 'บันทึกยอดจริง' }),
    ).toHaveLength(2);
    expect(screen.getAllByText('หมดอายุ: ไม่ระบุ')).toHaveLength(2);
    expect(
      screen.getAllByRole('button', { name: 'สั่งซื้อวัตถุดิบ' }),
    ).toHaveLength(2);
    fireEvent.click(
      screen.getAllByRole('button', { name: 'สั่งซื้อวัตถุดิบ' })[0],
    );
    expect(onOrderIngredients).toHaveBeenCalledWith(ingredient);
  });

  it('uses an inventory image from the API when one is available', () => {
    render(
      <StockCountPage
        ingredients={[
          { ...ingredient, imageUrl: 'https://cdn.example.test/coffee.png' },
        ]}
        drinkStock={[]}
        postalStock={[]}
        loading={false}
        onAdjust={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('img', { name: 'รูปเมล็ดกาแฟ' }).getAttribute('src'),
    ).toBe('https://cdn.example.test/coffee.png');
  });

  it('excludes cost-only recipe inputs even when a legacy payload omits trackStock', () => {
    render(
      <StockCountPage
        ingredients={[
          ingredient,
          {
            ...ingredient,
            id: 2,
            name: 'น้ำสกัดกาแฟ',
            status: 'cost_only',
          },
          {
            ...ingredient,
            id: 3,
            name: 'น้ำร้อน',
            trackStock: false,
            status: 'ready',
          },
        ]}
        drinkStock={[]}
        postalStock={[]}
        loading={false}
        onAdjust={vi.fn()}
      />,
    );

    expect(screen.getByText('เมล็ดกาแฟ')).toBeTruthy();
    expect(screen.queryByText('น้ำสกัดกาแฟ')).toBeNull();
    expect(screen.queryByText('น้ำร้อน')).toBeNull();
  });

  it('formats an inventory expiry date in Thai on its card', () => {
    render(
      <StockCountPage
        ingredients={[{ ...ingredient, expiryDate: '2026-09-30' }]}
        drinkStock={[]}
        postalStock={[]}
        loading={false}
        onAdjust={vi.fn()}
      />,
    );

    expect(screen.getByText('หมดอายุ: 30 ก.ย. 2569')).toBeTruthy();
  });

  it('labels a well-stocked ingredient as expiring soon when its expiry warning is active', () => {
    render(
      <StockCountPage
        ingredients={[{ ...ingredient, expiryStatus: 'expiring_soon' }]}
        drinkStock={[]}
        postalStock={[]}
        loading={false}
        onAdjust={vi.fn()}
      />,
    );

    expect(screen.getByText('มีของ แต่ใกล้หมดอายุ')).toBeTruthy();
    expect(screen.queryByText('เพียงพอ')).toBeNull();
  });

  it('labels an ingredient as stale when it has not moved recently', () => {
    render(
      <StockCountPage
        ingredients={[{ ...ingredient, status: 'stale' }]}
        drinkStock={[]}
        postalStock={[]}
        loading={false}
        onAdjust={vi.fn()}
      />,
    );

    expect(screen.getByText('ค้างสต๊อก')).toBeTruthy();
    expect(screen.queryByText('เพียงพอ')).toBeNull();
  });

  it('opens the count form in the stock cart drawer and keeps its content during close', async () => {
    render(
      <StockCountPage
        ingredients={[ingredient, { ...ingredient, id: 2, name: 'นมสด' }]}
        drinkStock={[]}
        postalStock={[]}
        loading={false}
        onAdjust={vi.fn()}
      />,
    );

    const grid = screen.getByRole('list', { name: 'รายการตรวจนับสต๊อก' });
    fireEvent.click(
      screen.getAllByRole('button', { name: 'บันทึกยอดจริง' })[0],
    );

    const editor = screen.getByRole('region', {
      name: 'บันทึกยอดจริง เมล็ดกาแฟ',
    });
    const quantityInput = screen.getByLabelText('จำนวนคงเหลือ (กรัม)');
    expect(grid.contains(editor)).toBe(false);
    expect(quantityInput).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'ปิด' }));
    expect(
      screen.getByRole('region', { name: 'บันทึกยอดจริง เมล็ดกาแฟ' }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'บันทึกยอดจริง เมล็ดกาแฟ' }),
      ).toBeNull(),
    );
    expect(grid.querySelectorAll('[role="listitem"]')).toHaveLength(2);
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

  it('allows zero as an actual count and never treats it as missing input', async () => {
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
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันบันทึก' }));

    await waitFor(() =>
      expect(onAdjust).toHaveBeenCalledWith(ingredient, 0, 'ตรวจนับสิ้นกะ'),
    );
  });

  it('rejects an empty actual count instead of silently saving zero', () => {
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
      target: { value: '' },
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
