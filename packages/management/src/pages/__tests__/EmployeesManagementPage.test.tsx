import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployeesManagementPage } from '../EmployeesManagementPage';
import { listEmployees, updateEmployee } from '../../api/users';
import { listBranches } from '../../api/branches';
import { listStaffSchedules } from '../../api/staff-schedules';

vi.mock('../../api/users', () => ({
  createEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
  listEmployees: vi.fn(),
  updateEmployee: vi.fn(),
}));
vi.mock('../../api/branches', () => ({ listBranches: vi.fn() }));
vi.mock('../../api/staff-schedules', () => ({
  generateStaffSchedules: vi.fn(),
  listStaffSchedules: vi.fn(),
  replaceStaffShift: vi.fn(),
  updateStaffShift: vi.fn(),
}));

const mockedListEmployees = vi.mocked(listEmployees);
const mockedUpdateEmployee = vi.mocked(updateEmployee);
const mockedListBranches = vi.mocked(listBranches);
const mockedListStaffSchedules = vi.mocked(listStaffSchedules);

const employee = {
  id: 90,
  name: 'พนักงานทดสอบ',
  username: 'employee_test',
  email: 'employee_test@superblackcoffee.local',
  role: 'cashier' as const,
  franchiseeId: undefined,
  branchId: 51,
  defaultStartsAt: '08:00:00',
  defaultEndsAt: '17:00:00',
};

const renderPage = (franchiseMode = false) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <EmployeesManagementPage franchiseMode={franchiseMode} />
    </QueryClientProvider>,
  );
};

async function waitForPage() {
  await waitFor(
    () => expect(screen.getByRole('button', { name: 'แก้ไข' })).toBeTruthy(),
    { timeout: 2_000 },
  );
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 850));
  });
}

describe('EmployeesManagementPage', () => {
  beforeEach(() => {
    const month = new Date().toISOString().slice(0, 7);
    mockedListEmployees.mockResolvedValue([employee]);
    mockedListBranches.mockResolvedValue([
      {
        id: 51,
        name: 'สาขาทดสอบ',
        code: 'SBC-TEST',
        franchiseeId: undefined,
      },
    ]);
    mockedListStaffSchedules.mockResolvedValue([
      {
        id: 1,
        userId: employee.id,
        name: employee.name,
        branchId: employee.branchId,
        date: `${month}-01`,
        startsAt: '08:00:00',
        endsAt: '17:00:00',
        status: 'scheduled',
      },
    ]);
    mockedUpdateEmployee.mockResolvedValue({ id: employee.id });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows the employee and their scheduled shift', async () => {
    renderPage();
    await waitForPage();

    expect(screen.getAllByText(employee.name)).toHaveLength(2);
    expect(screen.getByText('08:00 น. - 17:00 น.')).toBeTruthy();
  });

  it('updates the name and working hours in the visible schedule immediately', async () => {
    renderPage();
    await waitForPage();

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
    expect(screen.getByRole('button', { name: 'แก้ไขพนักงาน' })).toBeTruthy();

    const nameInput = document.querySelector<HTMLInputElement>(
      `input[value="${employee.name}"]`,
    );
    const [startTimeInput, endTimeInput] =
      document.querySelectorAll<HTMLInputElement>('input[type="time"]');
    expect(nameInput).not.toBeNull();
    expect(startTimeInput).toBeDefined();
    expect(endTimeInput).toBeDefined();

    fireEvent.change(nameInput!, { target: { value: 'ชื่อใหม่' } });
    fireEvent.change(startTimeInput!, { target: { value: '09:00' } });
    fireEvent.change(endTimeInput!, { target: { value: '18:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขพนักงาน' }));

    await waitFor(() => {
      expect(mockedUpdateEmployee).toHaveBeenCalledWith(
        employee.id,
        expect.objectContaining({
          name: 'ชื่อใหม่',
          defaultStartsAt: '09:00',
          defaultEndsAt: '18:00',
        }),
      );
      expect(screen.getAllByText('ชื่อใหม่')).toHaveLength(2);
      expect(screen.getByText('09:00 น. - 18:00 น.')).toBeTruthy();
    });
  });

  it('uses the same edit action in the franchise workspace', async () => {
    renderPage(true);
    await waitForPage();

    expect(screen.getByText('รายชื่อพนักงาน')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
    expect(screen.getByRole('button', { name: 'แก้ไขพนักงาน' })).toBeTruthy();
  });

  it('shows load errors in each employee data area without a holiday error notice', async () => {
    mockedListEmployees.mockRejectedValueOnce(new Error('network down'));
    renderPage();

    await waitFor(
      () =>
        expect(
          screen.getAllByText('โหลดข้อมูลไม่สำเร็จ').length,
        ).toBeGreaterThanOrEqual(4),
      { timeout: 2_000 },
    );

    expect(screen.queryByText('โหลดวันหยุดไม่สำเร็จ')).toBeNull();
  });
});
