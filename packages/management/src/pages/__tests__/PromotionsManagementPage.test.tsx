import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
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
    fireEvent.change(screen.getByLabelText('ช่วงเวลาแคมเปญ'), {
      target: { value: '1 ธ.ค. 2569 – 31 ธ.ค. 2569' },
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

  it('renders the promotion skeleton as a four-card grid', () => {
    render(<PromotionsSkeleton />);

    const skeleton = screen.getByLabelText('กำลังโหลดโปรโมชั่น');
    expect(skeleton).toBeTruthy();
    expect(skeleton.querySelectorAll('.MuiSkeleton-root')).toHaveLength(36);
  });
});
