import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StockHistoryPage } from '../StockHistoryPage';

describe('StockHistoryPage', () => {
  it('shows a stock movement as a clear before-and-after summary', () => {
    render(
      <StockHistoryPage
        movements={[
          {
            id: 1,
            inventoryItemName: 'แก้วเย็น',
            quantityBefore: 996,
            quantityAfter: 990,
            quantityDelta: -6,
            createdAt: '2026-09-15T03:12:41Z',
            note: 'ตัดสต๊อกจากไฟล์ Excel sale-by-bill-detail.xlsx',
          },
        ]}
      />,
    );

    expect(screen.getByText('แก้วเย็น')).toBeTruthy();
    expect(screen.getByText('ลด 6')).toBeTruthy();
    expect(screen.getByText('ก่อนบันทึก')).toBeTruthy();
    expect(screen.getByText('คงเหลือ')).toBeTruthy();
    expect(screen.getByText('นำเข้ายอดขายจาก Excel')).toBeTruthy();
    expect(screen.queryByText(/sale-by-bill-detail\.xlsx/u)).toBeNull();
  });

  it.each([
    ['ตัดสต๊อกจากการขายอเมริกาโน่', 'ตัดสต๊อกตามสูตรเมนู'],
    ['ตรวจนับสิ้นกะ', 'ตรวจนับสิ้นกะ'],
  ])('shows %s with its concise audit source label', (note, label) => {
    render(
      <StockHistoryPage
        movements={[
          {
            id: 2,
            inventoryItemName: 'เมล็ดกาแฟ',
            quantityBefore: 10,
            quantityAfter: 12,
            quantityDelta: 2,
            createdAt: '2026-09-15T03:12:41Z',
            note,
          },
        ]}
      />,
    );

    expect(screen.getByText(label)).toBeTruthy();
  });
});
