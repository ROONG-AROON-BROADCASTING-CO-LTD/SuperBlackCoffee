import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FranchiseMaintenancePage } from '../FranchiseMaintenancePage';
import {
  createFranchiseMaintenanceTicket,
  listFranchiseMaintenanceTickets,
} from '../../../api/maintenance';

vi.mock('../../../api/maintenance', () => ({
  createFranchiseMaintenanceTicket: vi.fn(),
  listFranchiseMaintenanceTickets: vi.fn(),
}));

const mockedCreateTicket = vi.mocked(createFranchiseMaintenanceTicket);
const mockedListTickets = vi.mocked(listFranchiseMaintenanceTickets);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FranchiseMaintenancePage />
    </QueryClientProvider>,
  );
}

describe('FranchiseMaintenancePage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows branch-scoped tickets with a useful technician status', async () => {
    mockedListTickets.mockResolvedValue([
      {
        id: 8,
        branchCode: 'SBC-AYT-001',
        branchName: 'อยุธยา',
        title: 'เครื่องชงกาแฟมีน้ำรั่ว',
        priority: 'urgent',
        status: 'assigned',
        technicianName: 'ช่างภพ',
        dueAt: '2026-09-15',
        createdAt: '2026-09-14T02:00:00Z',
      },
    ]);
    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText('งานแจ้งซ่อม #8 · เครื่องชงกาแฟมีน้ำรั่ว'),
      ).toBeTruthy(),
    );
    expect(screen.getByText('ช่างผู้รับงาน: ช่างภพ')).toBeTruthy();
    expect(screen.getByText('กำลังดำเนินการ')).toBeTruthy();
  });

  it('creates a repair ticket from the form and refreshes the list', async () => {
    mockedListTickets.mockResolvedValue([]);
    mockedCreateTicket.mockResolvedValue({ id: 9, status: 'open' });
    renderPage();

    fireEvent.change(
      screen.getByPlaceholderText('เช่น เครื่องชงกาแฟมีน้ำรั่ว'),
      {
        target: { value: 'ตู้เย็นไม่เย็น' },
      },
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        'อธิบายอาการ จุดที่พบ และสิ่งที่ได้ตรวจสอบเบื้องต้น',
      ),
      {
        target: { value: 'อุณหภูมิสูงกว่า 10 องศา' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'ส่งแจ้งซ่อม' }));

    await waitFor(() => expect(mockedCreateTicket).toHaveBeenCalledTimes(1));
    expect(mockedCreateTicket.mock.calls[0]?.[0]).toEqual({
      title: 'ตู้เย็นไม่เย็น',
      description: 'อุณหภูมิสูงกว่า 10 องศา',
      priority: 'normal',
      dueAt: '',
    });
    expect(
      screen.getByText(
        'ส่งแจ้งซ่อมเรียบร้อยแล้ว ทีมช่างจะรับงานตามระดับความเร่งด่วน',
      ),
    ).toBeTruthy();
  });

  it('blocks a whitespace-only repair subject before calling the franchise API', async () => {
    mockedListTickets.mockResolvedValue([]);
    renderPage();

    fireEvent.change(
      screen.getByPlaceholderText('เช่น เครื่องชงกาแฟมีน้ำรั่ว'),
      { target: { value: '   ' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'ส่งแจ้งซ่อม' }));

    expect(
      await screen.findByText('กรุณาระบุหัวข้อปัญหาที่ต้องการแจ้งซ่อม'),
    ).toBeTruthy();
    expect(mockedCreateTicket).not.toHaveBeenCalled();
  });

  it('keeps the report form visible and explains when sending a repair ticket fails', async () => {
    mockedListTickets.mockResolvedValue([]);
    mockedCreateTicket.mockRejectedValue(
      new Error('ไม่สามารถส่งแจ้งซ่อมได้ กรุณาลองใหม่'),
    );
    renderPage();

    fireEvent.change(
      screen.getByPlaceholderText('เช่น เครื่องชงกาแฟมีน้ำรั่ว'),
      { target: { value: 'เครื่องทำน้ำแข็งไม่ทำงาน' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'ส่งแจ้งซ่อม' }));

    expect(
      await screen.findByText('ไม่สามารถส่งแจ้งซ่อมได้ กรุณาลองใหม่'),
    ).toBeTruthy();
    expect(
      screen.getByPlaceholderText('เช่น เครื่องชงกาแฟมีน้ำรั่ว'),
    ).toBeTruthy();
  });

  it('keeps the repair form available when the branch ticket history fails to load', async () => {
    mockedListTickets.mockRejectedValue(new Error('network unavailable'));
    renderPage();

    expect(
      await screen.findByText('ไม่สามารถโหลดรายการแจ้งซ่อมได้'),
    ).toBeTruthy();
    expect(
      screen.getByPlaceholderText('เช่น เครื่องชงกาแฟมีน้ำรั่ว'),
    ).toBeTruthy();
  });

  it('submits the requested due date with the franchise repair ticket', async () => {
    mockedListTickets.mockResolvedValue([]);
    mockedCreateTicket.mockResolvedValue({ id: 10, status: 'open' });
    renderPage();

    fireEvent.change(
      screen.getByPlaceholderText('เช่น เครื่องชงกาแฟมีน้ำรั่ว'),
      { target: { value: 'เครื่องทำน้ำแข็งไม่ทำงาน' } },
    );
    fireEvent.change(screen.getByLabelText('วันที่ต้องการให้ดำเนินการ'), {
      target: { value: '2026-09-20' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ส่งแจ้งซ่อม' }));

    await waitFor(() => expect(mockedCreateTicket).toHaveBeenCalledOnce());
    expect(mockedCreateTicket.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        title: 'เครื่องทำน้ำแข็งไม่ทำงาน',
        dueAt: '2026-09-20',
      }),
    );
  });
});
