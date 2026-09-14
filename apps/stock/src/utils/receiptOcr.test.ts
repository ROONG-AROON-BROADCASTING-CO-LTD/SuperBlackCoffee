import { describe, expect, it } from 'vitest';
import { detectReceiptChannel, matchReceiptMenus } from './receiptOcr';

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

  it('does not create a deduction for an unrecognised receipt line', () => {
    expect(matchReceiptMenus('1 เมนูที่ไม่มีในระบบ 75.00', [])).toEqual([]);
  });

  it('does not choose between duplicate shortened menu names', () => {
    expect(
      matchReceiptMenus('1 อเมริกาโน่ 60.00', [
        { id: 1, name: 'อเมริกาโน่ร้อน คั่วเข้ม และ คั่วกลาง' },
        { id: 2, name: 'อเมริกาโน่เย็น คั่วเข้ม และ คั่วกลาง' },
      ]),
    ).toEqual([]);
  });

  it('matches the quantity prefix used on LINE MAN and storefront order screens', () => {
    expect(
      matchReceiptMenus(
        '1% ชาเขียว Ju (Green Tea Frappe) 55.00\n1% ชาไทย Ju (Blended Thai Tea) 55.00',
        [
          { id: 3, name: 'ชาเขียว' },
          { id: 8, name: 'ชาเขียวปั่น' },
          { id: 9, name: 'ชาไทยปั่น' },
        ],
      ),
    ).toEqual([
      { menuItemId: 8, menuName: 'ชาเขียวปั่น', quantity: 1 },
      { menuItemId: 9, menuName: 'ชาไทยปั่น', quantity: 1 },
    ]);
  });

  it('detects the order channel from LINE MAN and storefront screens', () => {
    expect(detectReceiptChannel('LMF-260912-018043975')).toBe('lineman');
    expect(detectReceiptChannel('กินที่ร้าน โต๊ะ: Counter')).toBe('storefront');
    expect(detectReceiptChannel('ภาพที่ไม่มีแหล่งออเดอร์')).toBeNull();
  });
});
