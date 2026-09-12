import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminOperationsPage } from '../AdminOperationsPage';
import {
  createMaintenanceTicket,
  listAssets,
  listInspections,
  listMaintenanceTickets,
  listServiceInvoices,
  updateMaintenanceStatus,
} from '../../../api/operations';

vi.mock('../../../api/operations', () => ({
  listAssets: vi.fn(),
  listInspections: vi.fn(),
  listMaintenanceTickets: vi.fn(),
  listServiceInvoices: vi.fn(),
  createMaintenanceTicket: vi.fn(),
  updateMaintenanceStatus: vi.fn(),
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
    vi.clearAllMocks();
  });
  it('creates a maintenance ticket for the selected branch', async () => {
    vi.mocked(listMaintenanceTickets).mockResolvedValue([]);
    vi.mocked(listInspections).mockResolvedValue([]);
    vi.mocked(listAssets).mockResolvedValue([]);
    vi.mocked(listServiceInvoices).mockResolvedValue([]);
    vi.mocked(createMaintenanceTicket).mockResolvedValue({ id: 4 });
    renderPage();
    await screen.findByText('แจ้งงานซ่อมบำรุง');
    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
    fireEvent.click(await screen.findByText('อยุธยา'));
    fireEvent.change(document.querySelector('input[name="title"]')!, {
      target: { value: 'เครื่องบดกาแฟไม่ทำงาน' },
    });
    fireEvent.change(document.querySelector('input[name="description"]')!, {
      target: { value: 'มีเสียงดัง' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'สร้างใบงาน' }));
    await waitFor(() =>
      expect(createMaintenanceTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'เครื่องบดกาแฟไม่ทำงาน',
          description: 'มีเสียงดัง',
        }),
      ),
    );
    expect(screen.getByText('สร้างใบงานช่างแล้ว')).toBeTruthy();
  });
  it('switches to inspections without showing the maintenance creation form', async () => {
    vi.mocked(listMaintenanceTickets).mockResolvedValue([]);
    vi.mocked(listInspections).mockResolvedValue([
      {
        id: 8,
        branchCode: 'SBC-AYA-001',
        branchName: 'อยุธยา',
        inspectorName: 'QA',
        status: 'needs_action',
        score: 72,
        findings: 'ต้องทำความสะอาด',
      },
    ]);
    vi.mocked(listAssets).mockResolvedValue([]);
    vi.mocked(listServiceInvoices).mockResolvedValue([]);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'สุ่มตรวจ' }));
    expect(screen.queryByText('แจ้งงานซ่อมบำรุง')).toBeNull();
    expect(await screen.findByText('ต้องทำความสะอาด')).toBeTruthy();
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
  it('shows the API error when a maintenance ticket cannot be created', async () => {
    vi.mocked(listMaintenanceTickets).mockResolvedValue([]);
    vi.mocked(listInspections).mockResolvedValue([]);
    vi.mocked(listAssets).mockResolvedValue([]);
    vi.mocked(listServiceInvoices).mockResolvedValue([]);
    vi.mocked(createMaintenanceTicket).mockRejectedValue(
      new Error('ไม่สามารถบันทึกใบงานได้'),
    );
    renderPage();
    await screen.findByText('แจ้งงานซ่อมบำรุง');
    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
    fireEvent.click(await screen.findByText('อยุธยา'));
    fireEvent.change(document.querySelector('input[name="title"]')!, {
      target: { value: 'เครื่องบดกาแฟไม่ทำงาน' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'สร้างใบงาน' }));
    expect(await screen.findByText('ไม่สามารถบันทึกใบงานได้')).toBeTruthy();
  });
});
