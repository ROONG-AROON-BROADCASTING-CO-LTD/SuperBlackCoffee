import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PromotionsSkeleton } from '../../components/skeletons/PromotionsSkeleton';
import { PromotionsManagementPage } from '../PromotionsManagementPage';

describe('PromotionsManagementPage', () => {
  afterEach(cleanup);

  it('lets an admin create an upcoming promotion in the current workspace', async () => {
    render(<PromotionsManagementPage mode="admin" />);

    expect(
      screen.getByRole('button', { name: 'กำลังใช้งาน 3 รายการ' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'สิ้นสุดแล้ว' })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'สิ้นสุดแล้ว 1 รายการ' }),
    ).toBeNull();
    expect(screen.getAllByText('ใช้วัตถุดิบตามสูตร 3 รายการ')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มโปรโมชั่น' }));
    fireEvent.change(screen.getByLabelText('ชื่อโปรโมชั่น'), {
      target: { value: 'ลดค่าขนส่งปลายเดือน' },
    });
    fireEvent.change(screen.getByLabelText('สิทธิพิเศษ / รายละเอียด'), {
      target: { value: 'ลดค่าจัดส่ง 20 บาท' },
    });
    fireEvent.change(screen.getByLabelText('เริ่มแคมเปญ'), {
      target: { value: '2026-12-01' },
    });
    fireEvent.change(screen.getByLabelText('สิ้นสุดแคมเปญ'), {
      target: { value: '2026-12-31' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกโปรโมชั่น' }));

    expect(await screen.findAllByText('ลดค่าขนส่งปลายเดือน')).toHaveLength(2);
    expect(screen.getAllByText('ลดค่าจัดส่ง 20 บาท')).toHaveLength(2);
    expect(
      screen.getByRole('button', {
        name: 'กำลังจะเริ่ม 2 รายการ',
        hidden: true,
      }),
    ).toBeTruthy();
  });

  it('requires an ordered campaign date range before saving', async () => {
    render(<PromotionsManagementPage mode="stock" />);
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มโปรโมชั่น' }));
    fireEvent.change(screen.getByLabelText('ชื่อโปรโมชั่น'), {
      target: { value: 'โปรโมชั่นทดสอบ' },
    });
    fireEvent.change(screen.getByLabelText('สิทธิพิเศษ / รายละเอียด'), {
      target: { value: 'ลด 10 บาท' },
    });

    const save = screen.getByRole('button', { name: 'บันทึกโปรโมชั่น' });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByLabelText('สิ้นสุดแคมเปญ') as HTMLInputElement).disabled,
    ).toBe(true);

    fireEvent.change(screen.getByLabelText('เริ่มแคมเปญ'), {
      target: { value: '2026-12-31' },
    });
    const end = screen.getByLabelText('สิ้นสุดแคมเปญ') as HTMLInputElement;
    expect(end.disabled).toBe(false);
    expect(end.min).toBe('2026-12-31');
    expect((save as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows an uploaded promotion image in the saved promotion', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:promotion-photo');
    vi.stubGlobal('URL', { ...URL, createObjectURL });
    try {
      render(<PromotionsManagementPage mode="stock" />);
      fireEvent.click(screen.getByRole('button', { name: 'เพิ่มโปรโมชั่น' }));
      fireEvent.change(screen.getByLabelText('อัปโหลดรูปโปรโมชั่น'), {
        target: {
          files: [new File(['image'], 'promotion.png', { type: 'image/png' })],
        },
      });
      expect(createObjectURL).toHaveBeenCalledOnce();
      fireEvent.change(screen.getByLabelText('ชื่อโปรโมชั่น'), {
        target: { value: 'โปรโมชั่นมีรูป' },
      });
      fireEvent.change(screen.getByLabelText('สิทธิพิเศษ / รายละเอียด'), {
        target: { value: 'ลด 10 บาท' },
      });
      fireEvent.change(screen.getByLabelText('เริ่มแคมเปญ'), {
        target: { value: '2026-12-01' },
      });
      fireEvent.change(screen.getByLabelText('สิ้นสุดแคมเปญ'), {
        target: { value: '2026-12-31' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'บันทึกโปรโมชั่น' }));

      expect(await screen.findAllByText('โปรโมชั่นมีรูป')).toHaveLength(2);
      expect(
        screen
          .getAllByRole('img', { name: /รูปอเมริกาโน่เย็น/u })
          .some(
            (image) => image.getAttribute('src') === 'blob:promotion-photo',
          ),
      ).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('uses the shared menu-style close control for the promotion drawer', async () => {
    render(<PromotionsManagementPage mode="admin" />);

    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มโปรโมชั่น' }));
    fireEvent.click(screen.getByRole('button', { name: 'ปิด' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('ชื่อโปรโมชั่น')).toBeNull();
    });
  });

  it('keeps franchise promotions read-only while allowing staff to view terms', async () => {
    render(<PromotionsManagementPage mode="franchise" branchName="อยุธยา" />);

    expect(screen.getByText('สาขาอยุธยา')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'เพิ่มโปรโมชั่น' })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'ดูรายละเอียด' })[0]);

    expect(
      await screen.findByText('เมนูและสูตรวัตถุดิบที่ใช้ตัดสต๊อก'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'โปรโมชั่นนี้อ้างอิงสูตรของเมนูเดิม จึงไม่มีการกำหนดวัตถุดิบซ้ำ',
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }),
    ).toBeNull();
    expect(screen.getByRole('button', { name: 'ปิดรายละเอียด' })).toBeTruthy();
  });

  it('prefills a Stock promotion from an expiring-inventory suggestion', async () => {
    render(
      <PromotionsManagementPage
        mode="stock"
        branchName="อยุธยา"
        expiryPromotionSuggestions={[
          {
            menuId: 88,
            menuName: 'ลาเต้เย็น',
            category: 'เมนูกาแฟเย็น',
            storePrice: 70,
            lotId: 19,
            inventoryItemId: 56,
            ingredientName: 'นมสด',
            lotNumber: 'LOT-88',
            expiryDate: '2026-10-06',
            quantityRemaining: 12,
            unit: 'กล่อง',
            daysUntilExpiry: 7,
            suggestedDiscountPercent: 25,
            reason: 'ใกล้หมดอายุ',
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('region', {
        name: 'คำแนะนำโปรโมชั่นจากวันหมดอายุ',
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'สร้างโปรโมชั่น' }));

    expect(
      (screen.getByLabelText('ชื่อโปรโมชั่น') as HTMLInputElement).value,
    ).toBe('ลาเต้เย็น ลด 25%');
    expect(
      (screen.getByLabelText('สิทธิพิเศษ / รายละเอียด') as HTMLInputElement)
        .value,
    ).toBe('ลด 25% เพื่อใช้ นมสด ล็อตใกล้หมดอายุ');
    expect(
      screen.getByText('สร้างโปรโมชั่นจากวัตถุดิบใกล้หมดอายุ'),
    ).toBeTruthy();
  });

  it('renders the promotion skeleton as a four-card grid', () => {
    render(<PromotionsSkeleton />);

    const skeleton = screen.getByLabelText('กำลังโหลดโปรโมชั่น');
    expect(skeleton).toBeTruthy();
    expect(skeleton.querySelectorAll('.MuiSkeleton-root')).toHaveLength(36);
  });
});
