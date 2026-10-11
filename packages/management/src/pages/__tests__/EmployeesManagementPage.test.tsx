import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployeesManagementPage } from '../EmployeesManagementPage';
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
} from '../../api/users';
import { listBranches } from '../../api/branches';
import {
  exportStaffSchedulesXlsx,
  generateStaffSchedules,
  listStaffSchedules,
  updateStaffShift,
} from '../../api/staff-schedules';

vi.mock('../../api/users', () => ({
  createEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
  listEmployees: vi.fn(),
  updateEmployee: vi.fn(),
}));
vi.mock('../../api/branches', () => ({ listBranches: vi.fn() }));
vi.mock('../../api/staff-schedules', () => ({
  exportStaffSchedulesXlsx: vi.fn(),
  generateStaffSchedules: vi.fn(),
  listStaffSchedules: vi.fn(),
  replaceStaffShift: vi.fn(),
  updateStaffShift: vi.fn(),
}));

const mockedListEmployees = vi.mocked(listEmployees);
const mockedCreateEmployee = vi.mocked(createEmployee);
const mockedDeleteEmployee = vi.mocked(deleteEmployee);
const mockedUpdateEmployee = vi.mocked(updateEmployee);
const mockedListBranches = vi.mocked(listBranches);
const mockedListStaffSchedules = vi.mocked(listStaffSchedules);
const mockedGenerateStaffSchedules = vi.mocked(generateStaffSchedules);
const exportXlsx = vi.mocked(exportStaffSchedulesXlsx);

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
}

describe('EmployeesManagementPage', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/employees');
    const month = new Date().toISOString().slice(0, 7);
    mockedListEmployees.mockResolvedValue([employee]);
    mockedListBranches.mockResolvedValue([
      {
        id: 1,
        name: 'สำนักงานใหญ่',
        code: 'SBC-HQ',
        franchiseeId: undefined,
        isHeadquarters: true,
      },
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
    mockedGenerateStaffSchedules.mockResolvedValue({
      created: 31,
      month,
    });
    exportXlsx.mockResolvedValue(
      new Blob(['schedule'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
    mockedUpdateEmployee.mockResolvedValue({ id: employee.id });
    mockedCreateEmployee.mockResolvedValue({ id: 91 });
    mockedDeleteEmployee.mockResolvedValue();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('separates postal schedules and preserves explicitly overridden daily times', async () => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const saturday = Array.from({ length: 7 }, (_, i) => i + 1).find(
      (day) => new Date(now.getFullYear(), now.getMonth(), day).getDay() === 6,
    )!;
    mockedListStaffSchedules.mockResolvedValue([
      {
        id: 10,
        userId: 100,
        name: 'ไปรษณีย์ปกติ',
        department: 'postal',
        branchId: 51,
        date: `${prefix}-${String(saturday).padStart(2, '0')}`,
        startsAt: '10:00:00',
        endsAt: '19:00:00',
        status: 'scheduled',
        isTimeOverride: false,
      },
      {
        id: 11,
        userId: 101,
        name: 'ไปรษณีย์เวลาพิเศษ',
        department: 'postal',
        branchId: 51,
        date: `${prefix}-${String(saturday).padStart(2, '0')}`,
        startsAt: '11:00:00',
        endsAt: '20:00:00',
        status: 'scheduled',
        isTimeOverride: true,
      },
    ]);
    renderPage();
    await waitForPage();
    expect(
      screen.queryByRole('button', { name: /ไปรษณีย์ปกติ/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ไปรษณีย์' }));
    expect(
      screen.getByRole('button', {
        name: /ไปรษณีย์ปกติ 10:00 น. - 19:00 น./,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /ไปรษณีย์เวลาพิเศษ 11:00 น. - 20:00 น./,
      }),
    ).toBeInTheDocument();
  });

  it('keeps a shift editor open with the entered times when the server rejects a mutation', async () => {
    vi.mocked(updateStaffShift).mockRejectedValueOnce(
      new Error('กะงานถูกแก้ไขโดยผู้ใช้อื่น'),
    );
    renderPage();
    await waitForPage();
    fireEvent.click(screen.getByRole('button', { name: /พนักงานทดสอบ 08:00/ }));
    fireEvent.change(screen.getByLabelText(/เวลาเข้างาน/), {
      target: { value: '09:00' },
    });
    fireEvent.change(screen.getByLabelText(/เวลาออกงาน/), {
      target: { value: '18:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกกะงาน' }));
    expect(
      await screen.findByText('กะงานถูกแก้ไขโดยผู้ใช้อื่น'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/เวลาเข้างาน/)).toHaveValue('09:00');
    expect(updateStaffShift).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ startsAt: '09:00', endsAt: '18:00' }),
    );
  });

  it('shows the employee and their scheduled shift', async () => {
    renderPage();
    await waitForPage();

    expect(screen.getAllByText(employee.name)).toHaveLength(2);
    expect(screen.getByText('08:00 น. - 17:00 น.')).toBeTruthy();
  });

  it('exports the selected branch schedule as an Excel file', async () => {
    let downloadedFilename = '';
    const downloadClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedFilename = this.download;
      });
    renderPage();
    await waitForPage();

    fireEvent.click(screen.getByRole('button', { name: 'ส่งออก Excel' }));

    await waitFor(() =>
      expect(exportXlsx).toHaveBeenCalledWith(
        new Date().toISOString().slice(0, 7),
        employee.branchId,
      ),
    );
    await waitFor(() => expect(downloadClick).toHaveBeenCalled());
    const monthLabel = new Intl.DateTimeFormat('th-TH', {
      month: 'long',
      year: 'numeric',
    })
      .format(new Date())
      .replace(' ', '-');
    expect(downloadedFilename).toBe(
      `ตารางงานพนักงาน-สาขาสาขาทดสอบ-${monthLabel}.xlsx`,
    );
    downloadClick.mockRestore();
  });

  it('explains the compensatory-holiday and rotation rules before generating schedules', async () => {
    renderPage();
    await waitForPage();

    fireEvent.click(screen.getByRole('button', { name: 'จัดตารางอัตโนมัติ' }));

    expect(
      screen.getByText(
        'ระบบจะไม่จัดวันหยุดรายเดือนในวันเสาร์–อาทิตย์ และพนักงานทุกคนที่ทำงานในวันนักขัตฤกษ์ จะได้รับวันหยุดชดเชยเพิ่มตามจำนวนวันที่ทำงาน โดยไม่นับรวมวันหยุดประจำเดือน ระบบจะกระจายวันชดเชยให้พนักงานหยุดคนละวัน เพื่อให้สาขายังเปิดบริการได้ สำหรับสาขาที่มีพนักงาน 2 คน ระบบจะสลับกะที่ 1 และกะที่ 2 ทุกสัปดาห์ (จันทร์–อาทิตย์) เมื่ออนุมัติลาของกะแรก ระบบจะย้ายพนักงานกะที่สองมาแทนกะแรกในวันนั้น',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ยืนยันจัดตาราง' })).toBeTruthy();
    expect(mockedGenerateStaffSchedules).not.toHaveBeenCalled();
  });

  it('generates the selected branch schedule only after confirmation', async () => {
    const month = new Date().toISOString().slice(0, 7);
    renderPage();
    await waitForPage();

    fireEvent.click(screen.getByRole('button', { name: 'จัดตารางอัตโนมัติ' }));
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันจัดตาราง' }));

    await waitFor(() =>
      expect(mockedGenerateStaffSchedules).toHaveBeenCalledWith(month, 51),
    );
  });

  it('uses headquarters-specific schedule and employee controls', async () => {
    const month = new Date().toISOString().slice(0, 7);
    window.history.replaceState({}, '', '/employees?scheduleBranch=SBC-HQ');
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('ยังไม่มีพนักงานในสาขานี้')).toBeTruthy(),
    );

    expect(
      screen.getByText('ดูและวางแผนตารางกะของพนักงานในรูปแบบปฏิทิน'),
    ).toBeTruthy();
    expect(screen.queryByText('เวลาทำงานมาตรฐาน')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'ไปรษณีย์' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('ยังไม่มีตารางกะ ไปรษณีย์'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('ทำงานวันจันทร์–เสาร์ · หยุดวันอาทิตย์และวันนักขัตฤกษ์'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มพนักงาน' }));
    expect(screen.getByText('กฎวันหยุดสำนักงานใหญ่')).toBeInTheDocument();
    expect(
      screen.getByText(
        'หยุดวันอาทิตย์และวันนักขัตฤกษ์ ไม่มีวันหยุดประจำเดือนหรือวันหยุดชดเชยอัตโนมัติ',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('แผนก')).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('สาขาที่ปฏิบัติงาน'),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('รูปแบบวันหยุด')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ปิด' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'จัดตารางอัตโนมัติ' }));
    expect(
      screen.getByText(
        'สำนักงานใหญ่: พนักงานที่ใช้กฎอัตโนมัติจะหยุดวันอาทิตย์และวันนักขัตฤกษ์ ไม่มีวันหยุดประจำเดือนหรือวันหยุดชดเชยอัตโนมัติ หากแผนกใดมีตารางต่างกัน ให้กำหนดวันหยุดเฉพาะในหน้าพนักงานก่อนจัดตาราง',
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันจัดตาราง' }));

    await waitFor(() =>
      expect(mockedGenerateStaffSchedules).toHaveBeenCalledWith(month, 1),
    );
  });

  it('shows a scheduling error instead of failing silently', async () => {
    mockedGenerateStaffSchedules.mockRejectedValueOnce(
      new Error('จำนวนพนักงานมากเกินกว่าจะจัดวันหยุดได้'),
    );
    renderPage();
    await waitForPage();

    fireEvent.click(screen.getByRole('button', { name: 'จัดตารางอัตโนมัติ' }));
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันจัดตาราง' }));

    expect(
      await screen.findByText('จำนวนพนักงานมากเกินกว่าจะจัดวันหยุดได้'),
    ).toBeInTheDocument();
  });

  it('updates the employee name and primary shift', async () => {
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
    });
  });

  it('allows an employee to be saved without an optional second shift', async () => {
    renderPage();
    await waitForPage();

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขพนักงาน' }));

    await waitFor(() => {
      expect(mockedUpdateEmployee).toHaveBeenCalledWith(
        employee.id,
        expect.objectContaining({
          defaultStartsAt: '08:00',
          defaultEndsAt: '17:00',
          defaultShifts: [{ startsAt: '08:00', endsAt: '17:00', weekdays: [] }],
        }),
      );
    });
  });

  it('saves selected weekdays for an added shift', async () => {
    renderPage();
    await waitForPage();

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
    fireEvent.click(screen.getByRole('button', { name: '+ เพิ่มกะ' }));
    fireEvent.change(screen.getByLabelText('เวลาเข้างาน กะที่ 2'), {
      target: { value: '13:00' },
    });
    fireEvent.change(screen.getByLabelText('เวลาออกงาน กะที่ 2'), {
      target: { value: '22:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'วันจันทร์' }));
    fireEvent.click(screen.getByRole('button', { name: 'วันพุธ' }));
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขพนักงาน' }));

    await waitFor(() => {
      expect(mockedUpdateEmployee).toHaveBeenCalledWith(
        employee.id,
        expect.objectContaining({
          defaultShifts: [
            { startsAt: '08:00', endsAt: '17:00', weekdays: [] },
            { startsAt: '13:00', endsAt: '22:00', weekdays: [1, 3] },
          ],
        }),
      );
    });
  });

  it('saves an employee day-off policy independently from their work branch', async () => {
    renderPage();
    await waitForPage();

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
    fireEvent.mouseDown(screen.getAllByRole('combobox').at(-1)!);
    fireEvent.click(
      await screen.findByRole('option', {
        name: 'อ้างอิงวันทำงานของสาขาที่เลือก',
      }),
    );
    fireEvent.mouseDown(screen.getAllByRole('combobox').at(-1)!);
    fireEvent.click(
      await screen.findByRole('option', {
        name: 'สำนักงานใหญ่ (สำนักงานใหญ่)',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขพนักงาน' }));

    await waitFor(() =>
      expect(mockedUpdateEmployee).toHaveBeenCalledWith(
        employee.id,
        expect.objectContaining({
          dayOffPolicy: 'home_branch',
          dayOffSourceBranchId: 1,
          weeklyDaysOff: [],
          customDaysOff: [],
        }),
      ),
    );
  });

  it('requires a custom day-off rule before saving a custom policy', async () => {
    renderPage();
    await waitForPage();

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
    fireEvent.mouseDown(screen.getAllByRole('combobox').at(-1)!);
    fireEvent.click(
      await screen.findByRole('option', { name: 'กำหนดวันหยุดเอง' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขพนักงาน' }));

    expect(
      screen.getByText(
        'กำหนดวันหยุดประจำหรือวันหยุดเฉพาะวันที่อย่างน้อย 1 วัน',
      ),
    ).toBeTruthy();
    expect(mockedUpdateEmployee).not.toHaveBeenCalled();
  });

  it('removes an employee from the schedule immediately and confirms the deletion', async () => {
    renderPage();
    await waitForPage();

    fireEvent.click(screen.getAllByRole('button', { name: 'ลบ' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'ยืนยัน' })[0]);

    await waitFor(() => {
      expect(mockedDeleteEmployee).toHaveBeenCalledWith(employee.id);
      expect(screen.queryByText(employee.name)).toBeNull();
      expect(screen.getByText(`ลบพนักงาน ${employee.name} แล้ว`)).toBeTruthy();
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
