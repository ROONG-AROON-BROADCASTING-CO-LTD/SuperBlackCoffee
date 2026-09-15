import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminAuditPage } from '../AdminAuditPage';
import { useAuditEvents } from '../../../hooks/useAuditEvents';

vi.mock('@stackbuild/ui', () => ({
  DashboardMain: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  formatDate: () => '15 กันยายน 2569',
}));
vi.mock('../../../hooks/useAuditEvents', () => ({ useAuditEvents: vi.fn() }));
vi.mock('../../../components/skeletons/AdminAuditSkeleton', () => ({
  AdminAuditSkeleton: () => <div>กำลังโหลดประวัติ</div>,
}));

const eventBase = {
  id: 1,
  branchId: 1,
  branchName: 'อยุธยา',
  actorId: 2,
  actorName: 'ผู้ดูแลระบบ',
  entityId: 9,
  createdAt: '2026-09-15T00:00:00Z',
};

describe('AdminAuditPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('turns an ingredient inspection audit event into a Thai work description', () => {
    vi.mocked(useAuditEvents).mockReturnValue({
      data: [
        {
          ...eventBase,
          entityType: 'inspection',
          action: 'scheduled',
          metadata: {
            inspectionType: 'ingredients',
            templateName: 'ใบงานสุ่มตรวจวัตถุดิบ',
          },
        },
      ],
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuditEvents>);

    render(<AdminAuditPage />);

    expect(screen.getByText('สร้างงานตรวจวัตถุดิบ')).toBeTruthy();
    expect(screen.getByText('แบบตรวจ: ใบงานสุ่มตรวจวัตถุดิบ')).toBeTruthy();
    expect(screen.queryByText('scheduled')).toBeNull();
  });

  it('shows the useful stock-consumption totals instead of a raw consumed event', () => {
    vi.mocked(useAuditEvents).mockReturnValue({
      data: [
        {
          ...eventBase,
          entityType: 'stock_consumption',
          action: 'consumed',
          metadata: { itemCount: 7, menuQuantity: 8 },
        },
      ],
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuditEvents>);

    render(<AdminAuditPage />);

    expect(screen.getByText('ตัดสต็อกจากการขายเมนู')).toBeTruthy();
    expect(screen.getByText('ตัดวัตถุดิบ 7 รายการ · เมนู 8 แก้ว')).toBeTruthy();
    expect(screen.getByText('ตัดสต็อก')).toBeTruthy();
    expect(screen.queryByText('consumed')).toBeNull();
  });

  it('keeps a clear error state when the audit endpoint is unavailable', () => {
    vi.mocked(useAuditEvents).mockReturnValue({
      data: [],
      error: new Error('offline'),
      isLoading: false,
    } as unknown as ReturnType<typeof useAuditEvents>);

    render(<AdminAuditPage />);

    expect(
      screen.getByText(
        'ไม่สามารถโหลดประวัติได้ · กำลังลองเชื่อมต่อใหม่อัตโนมัติ',
      ),
    ).toBeTruthy();
  });
});
