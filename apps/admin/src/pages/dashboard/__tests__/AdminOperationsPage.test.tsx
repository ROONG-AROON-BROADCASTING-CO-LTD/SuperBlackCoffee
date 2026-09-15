import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminOperationsPage } from '../AdminOperationsPage';
import {
  downloadMaintenancePDF,
  listAssets,
  listInspections,
  listMaintenanceTickets,
  listServiceInvoices,
  updateMaintenanceStatus,
  randomizeIngredientInspection,
  randomizeInspection,
} from '../../../api/operations';

vi.mock('../../../api/operations', () => ({
  listAssets: vi.fn(),
  listInspections: vi.fn(),
  listMaintenanceTickets: vi.fn(),
  listServiceInvoices: vi.fn(),
  downloadMaintenancePDF: vi.fn(),
  createAsset: vi.fn(),
  createServiceInvoice: vi.fn(),
  updateMaintenanceStatus: vi.fn(),
  updateAsset: vi.fn(),
  updateServiceInvoiceStatus: vi.fn(),
  randomizeInspection: vi.fn(),
  randomizeIngredientInspection: vi.fn(),
}));
const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AdminOperationsPage />
    </QueryClientProvider>,
  );

describe('AdminOperationsPage', () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.removeItem('admin.operations.active-tab');
    vi.clearAllMocks();
  });
  it('shows repair reports without a create form', async () => {
    vi.mocked(listMaintenanceTickets).mockResolvedValue([]);
    vi.mocked(listInspections).mockResolvedValue([]);
    vi.mocked(listAssets).mockResolvedValue([]);
    vi.mocked(listServiceInvoices).mockResolvedValue([]);
    renderPage();

    expect(
      await screen.findByText(
        'รายการแจ้งซ่อมจากทุกแฟรนไชส์ กด “ใบงาน PDF” เพื่อส่งรายละเอียดให้ช่างดำเนินการ',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('แจ้งงานซ่อมบำรุง')).toBeNull();
    expect(screen.queryByRole('button', { name: 'บันทึกรายการ' })).toBeNull();
  });
  it('shows only scheduled technician reports in random inspection', async () => {
    vi.mocked(listMaintenanceTickets).mockResolvedValue([]);
    vi.mocked(listInspections).mockResolvedValue([
      {
        id: 8,
        branchCode: 'SBC-AYA-001',
        branchName: 'อยุธยา',
        inspectorName: 'ช่างเอก',
        status: 'scheduled',
      },
    ]);
    vi.mocked(listAssets).mockResolvedValue([]);
    vi.mocked(listServiceInvoices).mockResolvedValue([]);
    renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: 'สุ่มตรวจช่าง' }),
    );
    expect(screen.queryByText('แจ้งงานซ่อมบำรุง')).toBeNull();
    expect(await screen.findByText('ช่างเอก')).toBeTruthy();
    expect(screen.queryByText('บันทึกผลตรวจ')).toBeNull();
  });
  it('closes an open maintenance ticket', async () => {
    vi.mocked(listMaintenanceTickets).mockResolvedValue([
      {
        id: 2,
        branchCode: 'SBC-AYA-001',
        title: 'ตู้เย็นเสีย',
        branchName: 'อยุธยา',
        priority: 'urgent',
        status: 'open',
        technicianName: 'ช่างเอก',
        cost: 0,
        dueAt: null,
      },
    ]);
    vi.mocked(listInspections).mockResolvedValue([]);
    vi.mocked(listAssets).mockResolvedValue([]);
    vi.mocked(listServiceInvoices).mockResolvedValue([]);
    vi.mocked(updateMaintenanceStatus).mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'ปิดงาน' }));
    await waitFor(() =>
      expect(updateMaintenanceStatus).toHaveBeenCalledWith(2, 'completed'),
    );
  });
  it('downloads the selected franchise repair work order as a PDF', async () => {
    vi.mocked(listMaintenanceTickets).mockResolvedValue([
      {
        id: 23,
        branchCode: 'SBC-AYA-001',
        branchName: 'อยุธยา',
        title: 'เครื่องชงกาแฟมีน้ำรั่ว',
        priority: 'urgent',
        status: 'assigned',
      },
    ]);
    vi.mocked(listInspections).mockResolvedValue([]);
    vi.mocked(listAssets).mockResolvedValue([]);
    vi.mocked(listServiceInvoices).mockResolvedValue([]);
    vi.mocked(downloadMaintenancePDF).mockResolvedValue(undefined);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'ใบงาน PDF' }));

    await waitFor(() =>
      expect(downloadMaintenancePDF).toHaveBeenCalledWith(
        23,
        'อยุธยา',
        'SBC-AYA-001',
      ),
    );
  });
  it('renders understandable Thai table headings and values', async () => {
    vi.mocked(listMaintenanceTickets).mockResolvedValue([
      {
        id: 11,
        branchCode: 'SBC-AYA-001',
        title: 'เครื่องชงกาแฟมีน้ำรั่ว',
        branchName: 'อยุธยา',
        priority: 'urgent',
        status: 'assigned',
        technicianName: 'ช่างเอก',
        cost: 1250,
        dueAt: '2026-09-16T00:00:00Z',
      },
    ]);
    vi.mocked(listInspections).mockResolvedValue([]);
    vi.mocked(listAssets).mockResolvedValue([]);
    vi.mocked(listServiceInvoices).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('หัวข้องาน')).toBeTruthy();
    expect(screen.queryByText('ช่างผู้รับผิดชอบ')).toBeNull();
    expect(screen.queryByText('ค่าใช้จ่ายรวม')).toBeNull();
    expect(
      screen.getByRole('columnheader', { name: 'ความเร่งด่วน' }),
    ).toBeTruthy();
    expect(await screen.findByText('เร่งด่วน')).toBeTruthy();
    expect(screen.queryByText('branchName')).toBeNull();
  });

  it('creates a technician report with its checklist and no result form', async () => {
    vi.mocked(listMaintenanceTickets).mockResolvedValue([]);
    vi.mocked(listInspections).mockResolvedValue([]);
    vi.mocked(listAssets).mockResolvedValue([]);
    vi.mocked(listServiceInvoices).mockResolvedValue([]);
    vi.mocked(randomizeInspection).mockResolvedValue({
      id: 12,
      branchCode: 'SBC-AYA-001',
      branchName: 'อยุธยา',
      branchSize: 'S',
      inspectorName: 'QA Team',
      templateId: 4,
      templateName: 'ใบงานตรวจช่างมาตรฐาน',
      checklist: ['ร้านคาเฟ่: เครื่องชงกาแฟ', 'ตู้ชาร์จรถ EV: หัวชาร์จ'],
      dueAt: '',
    });
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'สุ่มตรวจช่าง' }),
    );
    fireEvent.change(document.querySelector('input[name="inspectorName"]')!, {
      target: { value: 'QA Team' },
    });
    fireEvent.change(document.querySelector('input[name="dueAt"]')!, {
      target: { value: '2026-09-20' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'สร้างใบงานให้ช่าง' }));

    await waitFor(() =>
      expect(randomizeInspection).toHaveBeenCalledWith(
        expect.objectContaining({ inspectorName: 'QA Team', excludeDays: 30 }),
      ),
    );
    expect(await screen.findByText('ใบงานช่าง: อยุธยา')).toBeTruthy();
    expect(document.querySelector('ol li')?.textContent).toBe(
      'ร้านคาเฟ่: เครื่องชงกาแฟ',
    );
    expect(screen.queryByText('บันทึกผลตรวจ')).toBeNull();
  });

  it('keeps ingredient random checks separate from technician work orders', async () => {
    vi.mocked(listMaintenanceTickets).mockResolvedValue([]);
    vi.mocked(listInspections).mockResolvedValue([]);
    vi.mocked(listAssets).mockResolvedValue([]);
    vi.mocked(listServiceInvoices).mockResolvedValue([]);
    vi.mocked(randomizeIngredientInspection).mockResolvedValue({
      id: 14,
      branchCode: 'SBC-AYA-001',
      branchName: 'อยุธยา',
      branchSize: 'S',
      inspectorName: 'ฝ่ายควบคุมคุณภาพ',
      templateId: 0,
      templateName: 'ใบงานสุ่มตรวจวัตถุดิบ',
      inspectionType: 'ingredients',
      checklist: ['วัตถุดิบ: ตรวจวันหมดอายุ'],
      dueAt: '',
    });
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'สุ่มตรวจวัตถุดิบ' }),
    );
    fireEvent.change(document.querySelector('input[name="inspectorName"]')!, {
      target: { value: 'ฝ่ายควบคุมคุณภาพ' },
    });
    fireEvent.change(document.querySelector('input[name="dueAt"]')!, {
      target: { value: '2026-09-20' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'สร้างใบงานตรวจวัตถุดิบ' }),
    );

    await waitFor(() =>
      expect(randomizeIngredientInspection).toHaveBeenCalledWith(
        expect.objectContaining({ inspectorName: 'ฝ่ายควบคุมคุณภาพ' }),
      ),
    );
    expect(await screen.findByText('ใบงานตรวจวัตถุดิบ: อยุธยา')).toBeTruthy();
    expect(screen.getByText('วัตถุดิบ: ตรวจวันหมดอายุ')).toBeTruthy();
  });

  it('requires a due date before creating either inspection work order', async () => {
    vi.mocked(listMaintenanceTickets).mockResolvedValue([]);
    vi.mocked(listInspections).mockResolvedValue([]);
    vi.mocked(listAssets).mockResolvedValue([]);
    vi.mocked(listServiceInvoices).mockResolvedValue([]);
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'สุ่มตรวจช่าง' }),
    );
    fireEvent.change(document.querySelector('input[name="inspectorName"]')!, {
      target: { value: 'QA Team' },
    });
    const dueDateInput = document.querySelector('input[name="dueAt"]')!;
    expect(dueDateInput.hasAttribute('required')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'สร้างใบงานให้ช่าง' }));
    expect(randomizeInspection).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'สุ่มตรวจวัตถุดิบ' }));
    fireEvent.change(document.querySelector('input[name="inspectorName"]')!, {
      target: { value: 'ฝ่ายควบคุมคุณภาพ' },
    });
    expect(
      document.querySelector('input[name="dueAt"]')?.hasAttribute('required'),
    ).toBe(true);
    fireEvent.click(
      screen.getByRole('button', { name: 'สร้างใบงานตรวจวัตถุดิบ' }),
    );
    expect(randomizeIngredientInspection).not.toHaveBeenCalled();
  });
});
