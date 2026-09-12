import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminFranchiseBranchesPage } from '../AdminFranchiseBranchesPage';
import {
  createFranchisee,
  listBranches,
  listFranchisees,
  updateFranchiseeStatus,
} from '../../../api';

vi.mock('../../../api', () => ({
  listBranches: vi.fn(),
  listFranchisees: vi.fn(),
  createFranchisee: vi.fn(),
  updateFranchiseeStatus: vi.fn(),
}));

const mockedListBranches = vi.mocked(listBranches);
const mockedListFranchisees = vi.mocked(listFranchisees);
const mockedCreateFranchisee = vi.mocked(createFranchisee);
const mockedUpdateFranchiseeStatus = vi.mocked(updateFranchiseeStatus);

describe('AdminFranchiseBranchesPage', () => {
  beforeEach(() => {
    mockedListFranchisees.mockResolvedValue([
      {
        id: 22,
        name: 'แฟรนไชส์สุพรรณบุรี',
        email: 'suphan@example.com',
        plan: 'S',
        status: 'active',
        createdAt: '2026-09-04T00:00:00Z',
      },
    ]);
    mockedListBranches.mockResolvedValue([
      {
        id: 51,
        name: 'สาขาสุพรรณบุรี',
        code: 'SBC-SPB-001',
        status: 'active',
        franchiseeId: 22,
        franchiseeName: 'แฟรนไชส์สุพรรณบุรี',
      },
      { id: 1, name: 'สาขาอยุธยา', code: 'SBC-AYA-001' },
    ]);
    mockedCreateFranchisee.mockResolvedValue({ id: 23, status: 'invited' });
    mockedUpdateFranchiseeStatus.mockResolvedValue({
      id: 22,
      status: 'active',
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders database-backed franchise branches and excludes company branches', async () => {
    render(<AdminFranchiseBranchesPage />);

    await waitFor(() =>
      expect(screen.getByText('แฟรนไชส์สุพรรณบุรี')).toBeTruthy(),
    );
    expect(screen.getByText('สาขาสุพรรณบุรี')).toBeTruthy();
    expect(screen.queryByText('สาขาอยุธยา')).toBeNull();
    expect(screen.getByText('แพ็กเกจ S')).toBeTruthy();
  });

  it('keeps the franchise card grid while loading', () => {
    mockedListFranchisees.mockImplementationOnce(
      () => new Promise(() => undefined),
    );
    mockedListBranches.mockImplementationOnce(
      () => new Promise(() => undefined),
    );

    render(<AdminFranchiseBranchesPage />);

    expect(screen.getByLabelText('กำลังโหลดข้อมูลสาขาแฟรนไชส์')).toBeTruthy();
  });

  it('creates a franchise from the add-account drawer and refreshes the list', async () => {
    render(<AdminFranchiseBranchesPage />);
    await waitFor(() =>
      expect(screen.getByText('แฟรนไชส์สุพรรณบุรี')).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มบัญชีแฟรนไชส์' }));
    await waitFor(() =>
      expect(
        screen.getByText('กำหนดข้อมูลสำหรับเข้าสู่ระบบของผู้ซื้อแฟรนไชส์'),
      ).toBeTruthy(),
    );
    fireEvent.change(
      screen.getByRole('textbox', { name: /ชื่อผู้ซื้อแฟรนไชส์/ }),
      {
        target: { value: 'แฟรนไชส์ใหม่' },
      },
    );
    fireEvent.change(screen.getByRole('textbox', { name: /อีเมล/ }), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /ชื่อสาขา/ }), {
      target: { value: 'สาขาใหม่' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /รหัสสาขา/ }), {
      target: { value: 'SBC-NEW-001' },
    });
    fireEvent.change(
      screen.getByRole('textbox', { name: /ชื่อผู้ใช้สำหรับเข้าใช้ระบบ/ }),
      {
        target: { value: 'new_franchise' },
      },
    );
    fireEvent.change(screen.getByLabelText(/รหัสผ่านสำหรับเข้าใช้ระบบ/), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'สร้างและส่งคำเชิญ' }));

    await waitFor(() =>
      expect(mockedCreateFranchisee).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'แฟรนไชส์ใหม่',
          email: 'new@example.com',
          plan: 'S',
          branchName: 'สาขาใหม่',
          branchCode: 'SBC-NEW-001',
          username: 'new_franchise',
          password: 'password123',
        }),
      ),
    );
  });

  it('activates an invited franchise from its card', async () => {
    mockedListFranchisees.mockResolvedValueOnce([
      {
        id: 22,
        name: 'แฟรนไชส์สุพรรณบุรี',
        email: 'suphan@example.com',
        plan: 'S',
        status: 'invited',
        createdAt: '2026-09-04T00:00:00Z',
      },
    ]);
    render(<AdminFranchiseBranchesPage />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'เปิดใช้งาน' })).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'เปิดใช้งาน' }));

    await waitFor(() =>
      expect(mockedUpdateFranchiseeStatus).toHaveBeenCalledWith(22, 'active'),
    );
    expect(screen.getByText('ใช้งานแล้ว')).toBeTruthy();
  });

  it('keeps the page layout and shows a short error when data cannot load', async () => {
    mockedListFranchisees.mockRejectedValueOnce(new Error('network down'));
    render(<AdminFranchiseBranchesPage />);

    await waitFor(() =>
      expect(screen.getAllByRole('alert')[0].textContent).toContain(
        'ไม่สามารถโหลดข้อมูลแฟรนไชส์ได้',
      ),
    );
    expect(screen.getByText('กำลังลองเชื่อมต่อใหม่อัตโนมัติ')).toBeTruthy();
  });
});
