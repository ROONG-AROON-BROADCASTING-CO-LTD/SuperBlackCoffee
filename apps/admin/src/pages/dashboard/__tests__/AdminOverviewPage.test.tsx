import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminOverviewPage } from '../AdminOverviewPage';
import { useDashboardSummary } from '../../../hooks/useDashboardSummary';
import { useStockRequests } from '../../../hooks/useStockRequests';
import {
  getDashboardTrend,
  getSalesTrend,
  getTopSellingMenus,
  listInventory,
} from '../../../api';

vi.mock('@stackbuild/ui', () => ({
  DashboardMain: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  formatCurrency: (value: number) => `${value.toLocaleString('th-TH')} บาท`,
}));
vi.mock('@stackbuild/management', () => ({
  branches: ['ทุกสาขา', 'อยุธยา', 'พิษณุโลก'],
  branchCodeByBranch: {
    อยุธยา: 'SBC-AYA-001',
    พิษณุโลก: 'SBC-PLK-001',
  },
}));
vi.mock('../../../hooks/useDashboardSummary', () => ({
  useDashboardSummary: vi.fn(),
}));
vi.mock('../../../hooks/useStockRequests', () => ({
  useStockRequests: vi.fn(),
}));
vi.mock('../../../components/skeletons/AdminOverviewSkeleton', () => ({
  AdminOverviewSkeleton: () => <div>กำลังโหลดภาพรวม</div>,
}));
vi.mock('../../../api', () => ({
  getDashboardTrend: vi.fn(),
  getSalesTrend: vi.fn(),
  getTopSellingMenus: vi.fn(),
  listInventory: vi.fn(),
}));

const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AdminOverviewPage onNavigate={vi.fn()} />
    </QueryClientProvider>,
  );

const dailyTrendPoints = [
  '2026-09-14',
  '2026-09-15',
  '2026-09-16',
  '2026-09-17',
  '2026-09-18',
  '2026-09-19',
  '2026-09-20',
].map((label, index) => ({ label, quantity: index + 1 }));

const monthlyTrendPoints = Array.from({ length: 12 }, (_, index) => ({
  label: `2026-${String(index + 1).padStart(2, '0')}-01`,
  quantity: index + 1,
}));

const salesTrendPoints = dailyTrendPoints.map((point) => ({
  label: point.label,
  sales: point.quantity * 100,
}));

const renderedTrendAxisLabels = () =>
  Array.from(document.querySelectorAll('svg text')).map(
    (element) => element.textContent,
  );

describe('AdminOverviewPage', () => {
  beforeEach(() => {
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: {
        todaySales: 400,
        todayOrders: 2,
        todayMenuStockCuts: 5,
        todayStockEntries: 1,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDashboardSummary>);
    vi.mocked(useStockRequests).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useStockRequests>);
    vi.mocked(getSalesTrend).mockResolvedValue(salesTrendPoints);
    vi.mocked(getTopSellingMenus).mockResolvedValue([
      { id: 1, name: 'อเมริกาโน่เย็น', quantity: 4, sales: 240 },
    ]);
    vi.mocked(listInventory).mockResolvedValue([]);
    vi.mocked(getDashboardTrend).mockImplementation((period) =>
      Promise.resolve(
        period === 'month' ? monthlyTrendPoints : dailyTrendPoints,
      ),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('defaults the branch filter to all branches and reloads the trend for a selected branch', async () => {
    renderPage();

    const branchFilter = await screen.findByRole('combobox', {
      name: 'เลือกสาขา',
    });
    expect(branchFilter.textContent).toContain('ทุกสาขา');

    const salesChart = await screen.findByRole('img', {
      name: 'กราฟแท่งยอดขายรวมทุกสาขาแบบรายวัน',
    });
    expect(salesChart.querySelectorAll('rect')).toHaveLength(7);
    expect(salesChart.querySelectorAll('circle')).toHaveLength(0);

    fireEvent.mouseDown(branchFilter);
    fireEvent.click(await screen.findByRole('option', { name: 'อยุธยา' }));

    await waitFor(() =>
      expect(getDashboardTrend).toHaveBeenLastCalledWith('day', 'SBC-AYA-001'),
    );
    expect(screen.getByText('ยอดขายรวมทุกสาขาแบบรายวัน')).toBeTruthy();
    expect(screen.getByText('เมนูที่ขายดี')).toBeTruthy();
    expect(screen.getByText('อเมริกาโน่เย็น')).toBeTruthy();
    expect(screen.getByText('สต๊อกแยกตามสาขา')).toBeTruthy();
    expect(screen.queryByText('ยอดเฉลี่ยต่อบิล')).toBeNull();
  });

  it('changes the branch-sales comparison period without changing its chart layout', async () => {
    renderPage();

    const salesPeriodControls = await screen.findByRole('group', {
      name: 'เลือกช่วงเวลาแสดงยอดขาย',
    });
    expect(
      within(salesPeriodControls).getByRole('button', {
        name: 'รายวัน (จันทร์–อาทิตย์)',
      }),
    ).toBeTruthy();

    fireEvent.click(
      within(salesPeriodControls).getByRole('button', {
        name: 'รายเดือน (12 เดือนล่าสุด)',
      }),
    );

    await waitFor(() =>
      expect(getSalesTrend).toHaveBeenLastCalledWith('month'),
    );
    expect(await screen.findByText('ยอดขายรวมทุกสาขาแบบรายเดือน')).toBeTruthy();
    expect(
      await screen.findByRole('img', {
        name: 'กราฟแท่งยอดขายรวมทุกสาขาแบบรายเดือน',
      }),
    ).toBeTruthy();
  });

  it('labels each trend period in clear Thai and changes the data period', async () => {
    renderPage();

    const trendPeriodControls = await screen.findByRole('group', {
      name: 'เลือกช่วงเวลาแสดงแนวโน้ม',
    });
    expect(
      within(trendPeriodControls).getByRole('button', {
        name: 'รายวัน (จันทร์–อาทิตย์)',
      }),
    ).toBeTruthy();
    expect(
      within(trendPeriodControls).getByRole('button', {
        name: 'รายปี (5 ปีล่าสุด)',
      }),
    ).toBeTruthy();
    await waitFor(() => {
      expect(renderedTrendAxisLabels()).toContain('วันจันทร์');
      expect(renderedTrendAxisLabels()).toContain('วันอาทิตย์');
    });

    fireEvent.click(
      within(trendPeriodControls).getByRole('button', {
        name: 'รายเดือน (12 เดือนล่าสุด)',
      }),
    );

    await waitFor(() =>
      expect(getDashboardTrend).toHaveBeenLastCalledWith('month', undefined),
    );
    expect(
      screen.getByText('แนวโน้มการตัดสต็อกย้อนหลังแบบรายเดือน'),
    ).toBeTruthy();
    expect(
      screen.getByText('จำนวนเมนูที่ตัดตามสูตรในช่วง 12 เดือนล่าสุด'),
    ).toBeTruthy();
    await waitFor(() => {
      const labels = renderedTrendAxisLabels();
      expect(labels).toContain('ม.ค.');
      expect(labels).toContain('ธ.ค.');
      expect(labels.indexOf('ม.ค.')).toBeLessThan(labels.indexOf('ธ.ค.'));
    });
  });

  it('prioritizes soon-to-expire ingredients and excludes expired items from follow-up', async () => {
    vi.mocked(listInventory).mockImplementation((kind) =>
      Promise.resolve(
        kind === 'ingredient'
          ? [
              {
                id: 1,
                name: 'นมสด',
                category: 'นม',
                kind: 'ingredient',
                quantity: 1,
                unit: 'กล่อง',
                reorderLevel: 0,
                unitCost: 1,
                status: 'ready',
                imageUrl: '',
                expiryStatus: 'expired',
              },
              {
                id: 2,
                name: 'ไซรัป',
                category: 'ไซรัป',
                kind: 'ingredient',
                quantity: 1,
                unit: 'ขวด',
                reorderLevel: 0,
                unitCost: 1,
                status: 'ready',
                imageUrl: '',
                expiryStatus: 'expiring_soon',
              },
            ]
          : [],
      ),
    );

    renderPage();

    expect(await screen.findByText('วัตถุดิบใกล้หมดอายุ')).toBeTruthy();
    expect(screen.queryByText('วัตถุดิบหมดอายุ')).toBeNull();
    expect(screen.queryByText('วัตถุดิบหมด')).toBeNull();
  });
});
