import { describe, expect, it } from 'vitest';
import { matchReceiptMenus } from './receiptOcr';

describe('matchReceiptMenus', () => {
  it('matches a Thai receipt item and its quantity', () => {
    expect(
      matchReceiptMenus('2    เอสเปรสโซ่ร้อน (Hot espresso)    120.00', [
        { id: 4, name: 'เอสเปรสโซ่ร้อน คั่วเข้ม และ คั่วกลาง' },
        { id: 9, name: 'ลาเต้เย็น' },
      ]),
    ).toEqual([
      {
        menuItemId: 4,
        menuName: 'เอสเปรสโซ่ร้อน คั่วเข้ม และ คั่วกลาง',
        quantity: 2,
      },
    ]);
  });

  it('does not match a shortened receipt name when it is ambiguous', () => {
    expect(
      matchReceiptMenus('1 เอสเปรสโซ่ร้อน 45.00', [
        { id: 1, name: 'เอสเปรสโซ่ร้อน คั่วเข้ม' },
        { id: 2, name: 'เอสเปรสโซ่ร้อน คั่วกลาง' },
      ]),
    ).toEqual([]);
  });

  it('does not create a deduction for an unrecognised receipt line', () => {
    expect(matchReceiptMenus('1 เมนูที่ไม่มีในระบบ 75.00', [])).toEqual([]);
  });
});
