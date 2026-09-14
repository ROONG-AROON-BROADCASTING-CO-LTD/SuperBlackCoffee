import { describe, expect, it } from 'vitest';
import { matchReceiptMenus } from './receiptOcr';

describe('matchReceiptMenus', () => {
  it('matches a Thai receipt item and its quantity', () => {
    expect(
      matchReceiptMenus('2    เอสเปรสโซ่ร้อน (Hot espresso)    120.00', [
        { id: 4, name: 'เอสเปรสโซ่ร้อน' },
        { id: 9, name: 'ลาเต้เย็น' },
      ]),
    ).toEqual([{ menuItemId: 4, menuName: 'เอสเปรสโซ่ร้อน', quantity: 2 }]);
  });

  it('does not create a deduction for an unrecognised receipt line', () => {
    expect(matchReceiptMenus('1 เมนูที่ไม่มีในระบบ 75.00', [])).toEqual([]);
  });
});
