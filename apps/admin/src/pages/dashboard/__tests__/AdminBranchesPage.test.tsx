import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminBranchesPage } from '../AdminBranchesPage';
import {
  createCompanyBranch,
  listBranches,
  updateBranchSize,
  updateCompanyBranchDetails,
} from '../../../api';

vi.mock('../../../api', () => ({
  createCompanyBranch: vi.fn(),
  listBranches: vi.fn(),
  updateBranchSize: vi.fn(),
  updateCompanyBranchDetails: vi.fn(),
}));

const mockedCreateCompanyBranch = vi.mocked(createCompanyBranch);
const mockedListBranches = vi.mocked(listBranches);
const mockedUpdateBranchSize = vi.mocked(updateBranchSize);
const mockedUpdateCompanyBranchDetails = vi.mocked(updateCompanyBranchDetails);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminBranchesPage />
    </QueryClientProvider>,
  );
}

describe('AdminBranchesPage', () => {
  beforeEach(() => {
    mockedListBranches.mockResolvedValue([
      {
        id: 1,
        name: 'สาขาเดิม',
        code: 'SBC-OLD-001',
        size: 'L',
        status: 'active',
      },
    ]);
    mockedCreateCompanyBranch.mockResolvedValue({
      id: 2,
      name: 'สาขาเชียงใหม่',
      code: 'SBC-CNX-001',
      size: 'S',
      status: 'active',
    });
    mockedUpdateBranchSize.mockResolvedValue({ id: 1, size: 'M' });
    mockedUpdateCompanyBranchDetails.mockResolvedValue({ id: 1 });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('creates an SBC branch with the selected size and places it in the grid', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('สาขาเดิม')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มสาขา SBC' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'ชื่อสาขา' }), {
      target: { value: 'สาขาเชียงใหม่' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'รหัสสาขา' }), {
      target: { value: 'sbc-cnx-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มสาขา' }));

    await waitFor(() =>
      expect(mockedCreateCompanyBranch).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'สาขาเชียงใหม่',
          code: 'SBC-CNX-001',
          size: 'S',
        }),
      ),
    );
    expect(screen.getByText('สาขาเชียงใหม่')).toBeTruthy();
    expect(screen.getByText('SBC-CNX-001')).toBeTruthy();
  });

  it('shows only company branches on the SBC branches page', async () => {
    mockedListBranches.mockResolvedValueOnce([
      {
        id: 1,
        name: 'สาขา SBC',
        code: 'SBC-AYA-001',
        size: 'S',
        status: 'active',
      },
      {
        id: 2,
        name: 'สาขาแฟรนไชส์',
        code: 'FR-SUP-001',
        size: 'M',
        status: 'active',
        franchiseeId: 12,
      },
    ]);
    renderPage();

    expect(await screen.findByText('สาขา SBC')).toBeTruthy();
    expect(screen.queryByText('สาขาแฟรนไชส์')).toBeNull();
  });

  it('sends the size selected for a new SBC branch instead of always using the default plan', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('สาขาเดิม')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มสาขา SBC' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'ชื่อสาขา' }), {
      target: { value: 'สาขาขนาดกลาง' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'รหัสสาขา' }), {
      target: { value: 'sbc-medium-001' },
    });
    const sizeSelect = screen
      .getAllByRole('combobox', { name: 'ขนาดสาขา' })
      .at(-1)!;
    fireEvent.mouseDown(sizeSelect);
    fireEvent.click(
      await screen.findByRole('option', {
        name: 'M — น้ำ อาหาร เบเกอรี่ และสต๊อก',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มสาขา' }));

    await waitFor(() =>
      expect(mockedCreateCompanyBranch).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'สาขาขนาดกลาง',
          code: 'SBC-MEDIUM-001',
          size: 'M',
        }),
      ),
    );
  });

  it('keeps the creation form open and explains why branch creation failed', async () => {
    mockedCreateCompanyBranch.mockRejectedValueOnce(
      new Error('รหัสสาขานี้มีอยู่แล้ว'),
    );
    renderPage();
    await waitFor(() => expect(screen.getByText('สาขาเดิม')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มสาขา SBC' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'ชื่อสาขา' }), {
      target: { value: 'สาขาซ้ำ' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'รหัสสาขา' }), {
      target: { value: 'SBC-OLD-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มสาขา' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'รหัสสาขานี้มีอยู่แล้ว',
    );
    expect(screen.getByRole('button', { name: 'เพิ่มสาขา' })).toBeTruthy();
  });

  it('updates store coordinates and attendance radius without creating another branch', async () => {
    renderPage();
    await screen.findByText('สาขาเดิม');

    fireEvent.click(
      await screen.findByRole('button', { name: 'แก้ไขข้อมูลสาขา' }),
    );
    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'วางลิงก์ Google Maps เพื่อบันทึกพิกัด',
      }),
      {
        target: {
          value:
            'https://www.google.com/maps/place/SuperBlack+Coffee/@16.8209945,100.2691144,20.14z/data=!4m6!3m5!1s0x30df97e6a3a6f70d:0xbf38a3b13f12b83b!8m2!3d16.821085!4d100.2694448!16s%2Fg%2F11mz055fvc',
        },
      },
    );
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'รัศมีเช็กอิน (เมตร)' }),
      {
        target: { value: '150' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกข้อมูล' }));

    await waitFor(() =>
      expect(mockedUpdateCompanyBranchDetails).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          latitude: 16.821085,
          longitude: 100.2694448,
          attendanceRadiusM: 150,
        }),
      ),
    );
    expect(mockedCreateCompanyBranch).not.toHaveBeenCalled();
    expect(await screen.findByText(/16.821085, 100.2694448/)).toBeTruthy();
  });
});
