import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as promotionsApi from '../../api/promotions';
import { PromotionsSkeleton } from '../../components/skeletons/PromotionsSkeleton';
import { PromotionsManagementPage } from '../PromotionsManagementPage';

vi.mock('../../api/promotions', () => ({
  listPromotions: vi.fn(),
  listPromotionBranches: vi.fn(),
  listPromotionMenus: vi.fn(),
  createPromotion: vi.fn(),
  updatePromotion: vi.fn(),
  deletePromotion: vi.fn(),
}));

const promotion = {
  id: 7,
  name: 'กาแฟเช้า ลด 20%',
  type: 'ส่วนลดเฉพาะช่วงเช้า',
  benefit: 'ลดราคา 20% สำหรับอเมริกาโน่',
  status: 'active' as const,
  imageUrl: '',
  channels: ['หน้าร้าน'],
  eligibility: 'สมาชิกทุกระดับ',
  startsOn: '2026-10-01',
  endsOn: '2026-10-31',
  terms: ['ใช้ได้วันจันทร์ถึงศุกร์'],
  usage: 0,
  branches: [{ id: 1, name: 'สาขาทดสอบ', code: 'TEST' }],
  menuItems: [
    {
      id: 11,
      name: 'อเมริกาโน่เย็น',
      category: 'กาแฟ',
      price: 65,
      imageUrl: '',
    },
  ],
};

describe('PromotionsManagementPage', () => {
  beforeEach(() => {
    vi.mocked(promotionsApi.listPromotions).mockResolvedValue([promotion]);
    vi.mocked(promotionsApi.listPromotionBranches).mockResolvedValue([
      { id: 1, name: 'สาขาทดสอบ', code: 'TEST' },
    ]);
    vi.mocked(promotionsApi.listPromotionMenus).mockResolvedValue([
      promotion.menuItems[0],
    ]);
    vi.mocked(promotionsApi.createPromotion).mockResolvedValue({
      ...promotion,
      id: 8,
      name: 'ลดค่าขนส่งปลายเดือน',
      type: 'ส่งเสริมการขายออนไลน์',
      benefit: 'ลดค่าจัดส่ง 20 บาท',
      status: 'draft',
      startsOn: null,
      endsOn: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads promotions from the API rather than seeded client data', async () => {
    render(<PromotionsManagementPage mode="admin" />);

    expect(await screen.findByText('กาแฟเช้า ลด 20%')).toBeTruthy();
    expect(promotionsApi.listPromotions).toHaveBeenCalledOnce();
    expect(promotionsApi.listPromotionBranches).toHaveBeenCalledOnce();
  });

  it('keeps franchise promotions read-only while showing API data', async () => {
    render(<PromotionsManagementPage mode="franchise" branchName="อยุธยา" />);

    expect(await screen.findByText('สาขาอยุธยา')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'เพิ่มโปรโมชั่น' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'จัดการโปรโมชั่น' }));
    expect(await screen.findByText('รายละเอียดโปรโมชั่น')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'แก้ไข' })).toBeNull();
  });

  it('renders the promotion skeleton as a four-card grid', () => {
    render(<PromotionsSkeleton />);
    const skeleton = screen.getByLabelText('กำลังโหลดโปรโมชั่น');
    expect(skeleton.querySelectorAll('.MuiSkeleton-root')).toHaveLength(36);
  });
});
