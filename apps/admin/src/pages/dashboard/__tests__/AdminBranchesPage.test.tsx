import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminBranchesPage } from '../AdminBranchesPage';
import {
  createCompanyBranch,
  listBranchSales,
  updateBranchSize,
} from '../../../api';

vi.mock('../../../api', () => ({
  createCompanyBranch: vi.fn(),
  listBranchSales: vi.fn(),
  updateBranchSize: vi.fn(),
}));

const mockedCreateCompanyBranch = vi.mocked(createCompanyBranch);
const mockedListBranchSales = vi.mocked(listBranchSales);
const mockedUpdateBranchSize = vi.mocked(updateBranchSize);

describe('AdminBranchesPage', () => {
  beforeEach(() => {
    mockedListBranchSales.mockResolvedValue([
      {
        id: 1,
        name: 'สาขาเดิม',
        code: 'SBC-OLD-001',
        size: 'L',
        status: 'active',
        sales: 0,
        orders: 0,
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
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('creates an SBC branch with the selected size and places it in the grid', async () => {
    render(<AdminBranchesPage />);
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
      expect(mockedCreateCompanyBranch).toHaveBeenCalledWith({
        name: 'สาขาเชียงใหม่',
        code: 'SBC-CNX-001',
        size: 'S',
      }),
    );
    expect(screen.getByText('สาขาเชียงใหม่')).toBeTruthy();
    expect(screen.getByText('SBC-CNX-001')).toBeTruthy();
  });

  it('sends the size selected for a new SBC branch instead of always using the default plan', async () => {
    render(<AdminBranchesPage />);
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
      expect(mockedCreateCompanyBranch).toHaveBeenCalledWith({
        name: 'สาขาขนาดกลาง',
        code: 'SBC-MEDIUM-001',
        size: 'M',
      }),
    );
  });

  it('keeps the creation form open and explains why branch creation failed', async () => {
    mockedCreateCompanyBranch.mockRejectedValueOnce(
      new Error('รหัสสาขานี้มีอยู่แล้ว'),
    );
    render(<AdminBranchesPage />);
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
});
