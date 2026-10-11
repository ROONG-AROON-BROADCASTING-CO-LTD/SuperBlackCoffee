import { type MouseEvent, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClockIcon,
  DateField,
  DashboardMain,
  DashboardFormDrawer,
  DashboardDrawerHandle,
  DashboardDrawerHeader,
  DrawerActionBar,
  ItemActionButtons,
  PageIntro,
  selectionPillSx,
  useMinimumLoading,
} from '@stackbuild/ui';
import {
  generateStaffSchedules,
  listStaffSchedules,
  replaceStaffShift,
  updateStaffShift,
  exportStaffSchedulesXlsx,
  type StaffShift,
} from '../api/staff-schedules';
import { listPublicHolidays } from '../api/public-holidays';
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
  type Employee,
} from '../api/users';
import { listBranches } from '../api/branches';
import { EmployeesSkeleton } from '../components/skeletons/EmployeesSkeleton';
import {
  ActionSnackbar,
  type ActionNotice,
} from '../components/ActionSnackbar';
import { usePersistedScheduleBranch } from '../hooks/usePersistedScheduleBranch';

const thaiMonth = new Intl.DateTimeFormat('th-TH', {
  month: 'long',
  year: 'numeric',
});
const thaiWeekday = [
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
  'วันอาทิตย์',
];

type AdditionalShift = {
  startsAt: string;
  endsAt: string;
  weekdays: number[];
};

const postalWeekdaySchedule = {
  startsAt: '09:00',
  endsAt: '18:00',
};

const postalWeekendSchedule: AdditionalShift = {
  startsAt: '10:00',
  endsAt: '19:00',
  weekdays: [6, 7],
};

const shiftColors = [
  '#dceeff',
  '#eee1ff',
  '#dff4e7',
  '#fff0cd',
  '#ffe0e8',
  '#dff1f1',
];
const leaveLabels: Record<StaffShift['status'], string> = {
  scheduled: 'ทำงานตามกะ',
  compensatory_work: 'ทำงานชดเชย',
  day_off: 'วันหยุด',
  leave: 'ลางาน',
  sick_leave: 'ลาป่วย',
  personal_leave: 'ลาอื่น ๆ',
};

function isWorkingShift(status: StaffShift['status']) {
  return status === 'scheduled' || status === 'compensatory_work';
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const rowCount = Math.ceil((mondayOffset + daysInMonth) / 7);
  const firstVisibleDay = new Date(firstDay);
  firstVisibleDay.setDate(firstDay.getDate() - mondayOffset);
  return Array.from({ length: rowCount * 7 }, (_, index) => {
    const date = new Date(firstVisibleDay);
    date.setDate(firstVisibleDay.getDate() + index);
    return date;
  });
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function normalizedPostalShift(shift: StaffShift): StaffShift {
  if (shift.department !== 'postal' || shift.isTimeOverride) return shift;
  const weekday = new Date(`${shift.date}T12:00:00Z`).getUTCDay();
  const isWeekend = weekday === 0 || weekday === 6;
  return {
    ...shift,
    startsAt: isWeekend ? '10:00' : '09:00',
    endsAt: isWeekend ? '19:00' : '18:00',
  };
}

function employeeUsernamePrefix(branchCode?: string) {
  const parts = (branchCode || '').trim().split('-').filter(Boolean);
  if (/^\d+$/.test(parts[parts.length - 1] || '')) parts.pop();
  if (parts[0]?.toUpperCase() === 'SBC') parts.shift();
  return (parts.join('-') || 'sbc').toLocaleLowerCase();
}

export function EmployeesManagementPage({
  franchiseMode = false,
}: {
  franchiseMode?: boolean;
} = {}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const { selectedBranchCode, selectBranch } = usePersistedScheduleBranch();
  const [selectedShift, setSelectedShift] = useState<StaffShift | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editBranchId, setEditBranchId] = useState('');
  const [editStatus, setEditStatus] =
    useState<StaffShift['status']>('scheduled');
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editEndsAt, setEditEndsAt] = useState('');
  const [draggedShiftId, setDraggedShiftId] = useState<number | null>(null);
  const [isEmployeeDrawerOpen, setIsEmployeeDrawerOpen] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState<
    'branch_manager' | 'cashier'
  >('cashier');
  const [newEmployeeJobTitle, setNewEmployeeJobTitle] = useState('');
  const [newEmployeeDepartment, setNewEmployeeDepartment] = useState<
    'cafe' | 'postal'
  >('cafe');
  const [newEmployeeBranchId, setNewEmployeeBranchId] = useState('');
  const [newEmployeeUsername, setNewEmployeeUsername] = useState('');
  const [calendarDepartment, setCalendarDepartment] = useState<
    'cafe' | 'postal'
  >('cafe');
  const [defaultStartsAt, setDefaultStartsAt] = useState('08:00');
  const [defaultEndsAt, setDefaultEndsAt] = useState('17:00');
  const [additionalShifts, setAdditionalShifts] = useState<AdditionalShift[]>(
    [],
  );
  const [dayOffPolicy, setDayOffPolicy] = useState<
    'automatic' | 'home_branch' | 'work_branch' | 'custom'
  >('automatic');
  const [dayOffSourceBranchId, setDayOffSourceBranchId] = useState('');
  const [weeklyDaysOff, setWeeklyDaysOff] = useState<number[]>([]);
  const [customDaysOff, setCustomDaysOff] = useState<string[]>([]);
  const [customDayOffDate, setCustomDayOffDate] = useState('');
  const [hoveredTimeField, setHoveredTimeField] = useState<string | null>(null);
  const [confirmAutoSchedule, setConfirmAutoSchedule] = useState(false);
  const [pendingDeleteEmployeeId, setPendingDeleteEmployeeId] = useState<
    number | null
  >(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(
    null,
  );
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const {
    data: employees = [],
    error,
    isLoading,
  } = useQuery({ queryKey: ['employees'], queryFn: listEmployees });
  const calendarDays = useMemo(() => getCalendarDays(month), [month]);
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const queryClient = useQueryClient();
  const schedules = useQuery({
    queryKey: ['staff-schedules', monthKey],
    queryFn: () => listStaffSchedules(monthKey),
  });
  const holidays = useQuery({
    queryKey: ['public-holidays', monthKey],
    queryFn: () => listPublicHolidays(monthKey),
  });
  const branches = useQuery({
    queryKey: ['branches'],
    queryFn: listBranches,
    refetchOnMount: 'always',
  });
  const pageLoading =
    isLoading ||
    schedules.isLoading ||
    holidays.isLoading ||
    branches.isLoading;
  const showEmployeesSkeleton = useMinimumLoading(pageLoading);
  const loadError = error ?? schedules.error ?? branches.error;
  const workspaceBranches = franchiseMode
    ? (branches.data ?? [])
    : (branches.data ?? []).filter((branch) => !branch.franchiseeId);
  const headquartersBranches = workspaceBranches.filter(
    (branch) => branch.isHeadquarters,
  );
  const sbcBranches = workspaceBranches.filter(
    (branch) => !branch.isHeadquarters,
  );
  const savedBranchIsAvailable = workspaceBranches.some(
    (branch) => branch.code === selectedBranchCode,
  );
  const activeBranchId = franchiseMode
    ? (workspaceBranches[0]?.id ?? null)
    : savedBranchIsAvailable
      ? (workspaceBranches.find((branch) => branch.code === selectedBranchCode)
          ?.id ?? null)
      : (sbcBranches[0]?.id ?? headquartersBranches[0]?.id ?? null);
  const activeBranch = workspaceBranches.find(
    (branch) => branch.id === activeBranchId,
  );
  const isHeadquarters = activeBranch?.isHeadquarters === true;
  const suggestedUsername = (branchId: string) => {
    const branch = workspaceBranches.find(
      (item) => String(item.id) === branchId,
    );
    const prefix = employeeUsernamePrefix(branch?.code);
    const used = new Set(employees.map((employee) => employee.username));
    let sequence = 1;
    let suggestion = `${prefix}-${String(sequence).padStart(3, '0')}`;
    while (used.has(suggestion)) {
      sequence += 1;
      suggestion = `${prefix}-${String(sequence).padStart(3, '0')}`;
    }
    return suggestion;
  };
  const generate = useMutation({
    mutationFn: () => generateStaffSchedules(monthKey, activeBranchId!),
    onSuccess: () => {
      setActionNotice({ message: 'จัดตารางงานอัตโนมัติแล้ว' });
      void queryClient.invalidateQueries({
        queryKey: ['staff-schedules', monthKey],
      });
    },
    onError: (generateError) => {
      setActionNotice({
        message:
          generateError instanceof Error
            ? generateError.message
            : 'ไม่สามารถจัดตารางงานอัตโนมัติได้',
        severity: 'error',
      });
    },
  });
  const updateShift = useMutation({
    mutationFn: () =>
      updateStaffShift(selectedShift!.id, {
        shiftDate: editDate,
        branchId: Number(editBranchId),
        status: editStatus,
        leaveType: editStatus === 'scheduled' ? '' : leaveLabels[editStatus],
        ...(editStartsAt !== selectedShift!.startsAt.slice(0, 5) ||
        editEndsAt !== selectedShift!.endsAt.slice(0, 5)
          ? { startsAt: editStartsAt, endsAt: editEndsAt }
          : {}),
      }),
    onSuccess: () => {
      setSelectedShift(null);
      setActionNotice({ message: 'แก้ไขกะงานแล้ว' });
      void queryClient.invalidateQueries({
        queryKey: ['staff-schedules', monthKey],
      });
    },
  });
  const replaceShift = useMutation({
    mutationFn: ({
      targetShiftId,
      sourceShiftId,
    }: {
      targetShiftId: number;
      sourceShiftId: number;
    }) => replaceStaffShift(targetShiftId, sourceShiftId),
    onSuccess: () => {
      setDraggedShiftId(null);
      setActionNotice({ message: 'แทนกะงานแล้ว' });
      void queryClient.invalidateQueries({
        queryKey: ['staff-schedules', monthKey],
      });
    },
  });
  const createEmployeeMutation = useMutation({
    mutationFn: () =>
      createEmployee({
        name: newEmployeeName,
        username: newEmployeeUsername,
        password: `Temp${Date.now()}!`,
        role: newEmployeeRole,
        jobTitle: newEmployeeJobTitle,
        department: newEmployeeDepartment,
        branchId: Number(newEmployeeBranchId),
        defaultStartsAt,
        defaultEndsAt,
        defaultShifts: [
          { startsAt: defaultStartsAt, endsAt: defaultEndsAt, weekdays: [] },
          ...additionalShifts,
        ],
        dayOffPolicy,
        dayOffSourceBranchId: Number(
          dayOffSourceBranchId || newEmployeeBranchId,
        ),
        weeklyDaysOff,
        customDaysOff,
      }),
    onSuccess: () => {
      setIsEmployeeDrawerOpen(false);
      setNewEmployeeName('');
      setNewEmployeeJobTitle('');
      setNewEmployeeDepartment('cafe');
      setNewEmployeeUsername('');
      setDayOffPolicy('automatic');
      setDayOffSourceBranchId('');
      setWeeklyDaysOff([]);
      setCustomDaysOff([]);
      setCustomDayOffDate('');
      setActionNotice({ message: 'เพิ่มพนักงานแล้ว' });
      void queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
  const shiftsByDate = useMemo(() => {
    const result = new Map<string, NonNullable<typeof schedules.data>>();
    for (const sourceShift of schedules.data ?? []) {
      const shift = normalizedPostalShift(sourceShift);
      if (
        shift.branchId !== activeBranchId ||
        (shift.department ?? 'cafe') !== calendarDepartment
      )
        continue;
      result.set(shift.date, [...(result.get(shift.date) ?? []), shift]);
    }
    for (const shifts of result.values()) {
      shifts.sort(
        (first, second) =>
          first.startsAt.localeCompare(second.startsAt) ||
          first.endsAt.localeCompare(second.endsAt) ||
          first.name.localeCompare(second.name, 'th') ||
          first.id - second.id,
      );
    }
    return result;
  }, [activeBranchId, calendarDepartment, schedules.data]);
  const holidaysByDate = useMemo(
    () =>
      new Map((holidays.data ?? []).map((holiday) => [holiday.date, holiday])),
    [holidays.data],
  );
  const shiftColorsByUser = useMemo(() => {
    const userIds = [
      ...new Set(
        (schedules.data ?? [])
          .filter(
            (shift) =>
              shift.branchId === activeBranchId &&
              (shift.department ?? 'cafe') === calendarDepartment,
          )
          .map((shift) => shift.userId),
      ),
    ].sort((first, second) => first - second);
    return new Map(
      userIds.map((userId, index) => [
        userId,
        shiftColors[index % shiftColors.length],
      ]),
    );
  }, [activeBranchId, calendarDepartment, schedules.data]);
  const staffCount = employees.filter(
    (employee) =>
      employee.role === 'cashier' || employee.role === 'branch_manager',
  ).length;
  const branchEmployees = franchiseMode
    ? employees
    : employees.filter((employee) => employee.branchId === activeBranchId);
  const today = new Date();

  const changeMonth = (offset: number) => {
    setMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  const openShiftEditor = (shift: StaffShift) => {
    setSelectedShift(shift);
    setEditDate(shift.date);
    setEditBranchId(String(shift.branchId));
    setEditStatus(shift.status);
    setEditStartsAt(shift.startsAt.slice(0, 5));
    setEditEndsAt(shift.endsAt.slice(0, 5));
  };
  const editEmployee = async (employee: (typeof employees)[number]) => {
    setEditingEmployeeId(employee.id);
    setNewEmployeeName(employee.name);
    setNewEmployeeRole(
      employee.role === 'branch_manager' ? 'branch_manager' : 'cashier',
    );
    setNewEmployeeJobTitle(
      employee.jobTitle ||
        (employee.role === 'branch_manager' ? 'ผู้จัดการสาขา' : 'แคชเชียร์'),
    );
    setNewEmployeeDepartment(
      isHeadquarters ? 'cafe' : (employee.department ?? 'cafe'),
    );
    setNewEmployeeBranchId(String(employee.branchId ?? activeBranchId ?? ''));
    setNewEmployeeUsername(employee.username);
    if (!isHeadquarters && employee.department === 'postal') {
      setDefaultStartsAt(postalWeekdaySchedule.startsAt);
      setDefaultEndsAt(postalWeekdaySchedule.endsAt);
      setAdditionalShifts([postalWeekendSchedule]);
    } else {
      setDefaultStartsAt(employee.defaultStartsAt?.slice(0, 5) || '08:00');
      setDefaultEndsAt(employee.defaultEndsAt?.slice(0, 5) || '17:00');
      setAdditionalShifts(
        employee.defaultShifts?.slice(1) ??
          (employee.defaultSecondStartsAt && employee.defaultSecondEndsAt
            ? [
                {
                  startsAt: employee.defaultSecondStartsAt.slice(0, 5),
                  endsAt: employee.defaultSecondEndsAt.slice(0, 5),
                  weekdays: employee.defaultSecondShiftDays ?? [],
                },
              ]
            : []),
      );
    }
    setDayOffPolicy(employee.dayOffPolicy ?? 'automatic');
    setDayOffSourceBranchId(
      String(employee.dayOffSourceBranchId ?? employee.branchId ?? ''),
    );
    setWeeklyDaysOff(employee.weeklyDaysOff ?? []);
    setCustomDaysOff(employee.customDaysOff ?? []);
    setCustomDayOffDate('');
    setIsEmployeeDrawerOpen(true);
  };
  const removeEmployee = async (employee: (typeof employees)[number]) => {
    try {
      await deleteEmployee(employee.id);
      queryClient.setQueryData<Employee[]>(['employees'], (current) =>
        current?.filter((item) => item.id !== employee.id),
      );
      queryClient.setQueryData<StaffShift[]>(
        ['staff-schedules', monthKey],
        (current) => current?.filter((shift) => shift.userId !== employee.id),
      );
      setPendingDeleteEmployeeId(null);
      setActionNotice({ message: `ลบพนักงาน ${employee.name} แล้ว` });
    } catch (deleteError) {
      setActionNotice({
        message:
          deleteError instanceof Error
            ? deleteError.message
            : 'ลบพนักงานไม่สำเร็จ',
        severity: 'error',
      });
    }
  };

  return (
    <DashboardMain>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2,
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          mb: 2.5,
        }}
      >
        <PageIntro
          title="ตารางงานพนักงาน"
          description="ดูและวางแผนตารางกะของพนักงานในรูปแบบปฏิทิน"
        />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => changeMonth(-1)}
          >
            เดือนก่อน
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            เดือนนี้
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => changeMonth(1)}
          >
            เดือนถัดไป
          </Button>
          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 0.5, borderColor: '#d8cec7' }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              if (showEmployeesSkeleton || activeBranchId === null) return;
              if (confirmAutoSchedule) {
                setConfirmAutoSchedule(false);
                generate.mutate();
              } else setConfirmAutoSchedule(true);
            }}
            disabled={generate.isPending || Boolean(loadError)}
            sx={
              confirmAutoSchedule
                ? { bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }
                : undefined
            }
          >
            {generate.isPending
              ? 'กำลังจัดตาราง...'
              : confirmAutoSchedule
                ? 'ยืนยันจัดตาราง'
                : 'จัดตารางอัตโนมัติ'}
          </Button>
          {confirmAutoSchedule ? (
            <>
              <Typography
                color="text.secondary"
                sx={{ alignSelf: 'center', fontSize: 12 }}
              >
                {isHeadquarters
                  ? 'สำนักงานใหญ่: พนักงานที่ใช้กฎอัตโนมัติจะหยุดวันอาทิตย์และวันนักขัตฤกษ์ ไม่มีวันหยุดประจำเดือนหรือวันหยุดชดเชยอัตโนมัติ หากแผนกใดมีตารางต่างกัน ให้กำหนดวันหยุดเฉพาะในหน้าพนักงานก่อนจัดตาราง'
                  : 'ระบบจะไม่จัดวันหยุดรายเดือนในวันเสาร์–อาทิตย์ และพนักงานทุกคนที่ทำงานในวันนักขัตฤกษ์ จะได้รับวันหยุดชดเชยเพิ่มตามจำนวนวันที่ทำงาน โดยไม่นับรวมวันหยุดประจำเดือน ระบบจะกระจายวันชดเชยให้พนักงานหยุดคนละวัน เพื่อให้สาขายังเปิดบริการได้ สำหรับสาขาที่มีพนักงาน 2 คน ระบบจะสลับกะที่ 1 และกะที่ 2 ทุกสัปดาห์ (จันทร์–อาทิตย์) เมื่ออนุมัติลาของกะแรก ระบบจะย้ายพนักงานกะที่สองมาแทนกะแรกในวันนั้น'}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setConfirmAutoSchedule(false)}
              >
                ยกเลิก
              </Button>
            </>
          ) : null}
          <Button
            variant="contained"
            size="small"
            disabled={Boolean(loadError)}
            onClick={() => {
              if (showEmployeesSkeleton) return;
              setEditingEmployeeId(null);
              setNewEmployeeName('');
              setNewEmployeeRole('cashier');
              setNewEmployeeJobTitle('');
              setNewEmployeeDepartment('cafe');
              const branchId = String(activeBranchId ?? '');
              setNewEmployeeBranchId(branchId);
              setNewEmployeeUsername(suggestedUsername(branchId));
              setDefaultStartsAt(isHeadquarters ? '09:00' : '');
              setDefaultEndsAt(isHeadquarters ? '18:00' : '');
              setAdditionalShifts([]);
              setDayOffPolicy('automatic');
              setDayOffSourceBranchId(branchId);
              setWeeklyDaysOff([]);
              setCustomDaysOff([]);
              setCustomDayOffDate('');
              setIsEmployeeDrawerOpen(true);
            }}
            sx={{ bgcolor: '#805637', '&:hover': { bgcolor: '#60412a' } }}
          >
            เพิ่มพนักงาน
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          minHeight: showEmployeesSkeleton ? { xs: 720, md: 760 } : undefined,
        }}
      >
        {showEmployeesSkeleton ? (
          <EmployeesSkeleton
            franchiseMode={franchiseMode}
            calendarWeeks={calendarDays.length / 7}
          />
        ) : null}
        {!showEmployeesSkeleton ? (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'max-content minmax(0, 1fr)',
                },
                gap: 1.5,
                mb: 2,
                alignItems: 'stretch',
              }}
            >
              {!franchiseMode ? (
                <Card
                  variant="outlined"
                  sx={{
                    width: { xs: '100%', sm: 'fit-content' },
                    minWidth: 'max-content',
                    p: 2,
                    borderRadius: '15px',
                    borderColor: '#e8ddd5',
                  }}
                >
                  <Typography
                    color="text.secondary"
                    sx={{ fontSize: 14, fontWeight: 700 }}
                  >
                    พนักงานทั้งหมด
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.25,
                      color: loadError ? 'error.main' : '#201914',
                      fontWeight: 700,
                      fontSize: 26,
                    }}
                  >
                    {loadError ? 'โหลดข้อมูลไม่สำเร็จ' : employees.length}
                  </Typography>
                </Card>
              ) : null}
              <Card
                variant="outlined"
                sx={{ p: 2, borderRadius: '15px', borderColor: '#e8ddd5' }}
              >
                <Typography
                  color="text.secondary"
                  sx={{ fontSize: 14, fontWeight: 700 }}
                >
                  {franchiseMode
                    ? 'พนักงานในแฟรนไชส์'
                    : isHeadquarters
                      ? 'พนักงานสำนักงานใหญ่'
                      : 'พนักงานประจำสาขา'}
                </Typography>
                {franchiseMode ? (
                  <Typography
                    sx={{
                      mt: 0.25,
                      color: loadError ? 'error.main' : '#201914',
                      fontWeight: 700,
                      fontSize: 26,
                    }}
                  >
                    {loadError ? 'โหลดข้อมูลไม่สำเร็จ' : staffCount}
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, minmax(0, 1fr))',
                      },
                      gap: 1,
                      mt: 1.5,
                    }}
                  >
                    {loadError ? (
                      <Typography color="error" sx={{ fontSize: 14 }}>
                        โหลดข้อมูลไม่สำเร็จ
                      </Typography>
                    ) : branchEmployees.length === 0 ? (
                      <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                        ยังไม่มีพนักงานในสาขานี้
                      </Typography>
                    ) : (
                      branchEmployees.map((employee) => (
                        <Box
                          key={employee.id}
                          sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            alignItems: { xs: 'stretch', md: 'center' },
                            justifyContent: 'space-between',
                            gap: { xs: 0.75, md: 0 },
                            px: 1.5,
                            py: 1,
                            borderRadius: '10px',
                            bgcolor: '#fbf7f4',
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 15, fontWeight: 600 }}>
                              {employee.name}
                            </Typography>
                            <Typography
                              color="text.secondary"
                              sx={{ fontSize: 12 }}
                            >
                              {employee.username}
                            </Typography>
                          </Box>
                          <Typography
                            color="text.secondary"
                            sx={{ fontSize: 13 }}
                          >
                            {employee.jobTitle ||
                              (employee.role === 'branch_manager'
                                ? 'ผู้จัดการสาขา'
                                : 'แคชเชียร์')}
                            {' · '}
                            {isHeadquarters
                              ? 'สำนักงานใหญ่'
                              : employee.department === 'postal'
                                ? 'ไปรษณีย์'
                                : 'SuperBlackCoffee'}
                          </Typography>
                          <ItemActionButtons
                            editLabel={
                              pendingDeleteEmployeeId === employee.id
                                ? 'ยกเลิก'
                                : 'แก้ไข'
                            }
                            deleteLabel={
                              pendingDeleteEmployeeId === employee.id
                                ? 'ยืนยัน'
                                : 'ลบ'
                            }
                            onEdit={() => {
                              if (pendingDeleteEmployeeId === employee.id)
                                setPendingDeleteEmployeeId(null);
                              else void editEmployee(employee);
                            }}
                            onDelete={() => {
                              if (pendingDeleteEmployeeId === employee.id)
                                void removeEmployee(employee);
                              else setPendingDeleteEmployeeId(employee.id);
                            }}
                            sx={{
                              ml: { xs: 0, md: 2 },
                              width: { xs: '100%', md: 176 },
                              flexShrink: 0,
                            }}
                          />
                        </Box>
                      ))
                    )}
                  </Box>
                )}
              </Card>

              {franchiseMode ? (
                <Card
                  variant="outlined"
                  sx={{
                    gridColumn: { xs: 'auto', sm: '2' },
                    p: 2,
                    borderRadius: '16px',
                    borderColor: '#e8ddd5',
                  }}
                >
                  <Typography
                    color="text.secondary"
                    sx={{
                      fontFamily: 'IBM Plex Sans Thai, sans-serif',
                      fontSize: 14,
                      fontWeight: 700,
                      mb: 1.5,
                    }}
                  >
                    รายชื่อพนักงาน
                  </Typography>
                  {loadError ? (
                    <Typography
                      sx={{
                        color: 'error.main',
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      โหลดข้อมูลไม่สำเร็จ
                    </Typography>
                  ) : employees.length === 0 ? (
                    <Typography
                      sx={{ color: '#b8aaa1', fontSize: 14, fontWeight: 500 }}
                    >
                      ยังไม่มีพนักงานในแฟรนไชส์
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: 'repeat(2, minmax(0, 1fr))',
                        },
                        gap: 1,
                      }}
                    >
                      {employees.map((employee) => (
                        <Box
                          key={employee.id}
                          sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            alignItems: { xs: 'stretch', md: 'center' },
                            justifyContent: 'space-between',
                            gap: { xs: 0.75, md: 0 },
                            px: 1.5,
                            py: 1,
                            borderRadius: '10px',
                            bgcolor: '#fbf7f4',
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 15, fontWeight: 600 }}>
                              {employee.name}
                            </Typography>
                            <Typography
                              color="text.secondary"
                              sx={{ fontSize: 12 }}
                            >
                              {employee.username}
                            </Typography>
                          </Box>
                          <Typography
                            color="text.secondary"
                            sx={{ fontSize: 13 }}
                          >
                            {employee.jobTitle ||
                              (employee.role === 'branch_manager'
                                ? 'ผู้จัดการสาขา'
                                : 'แคชเชียร์')}
                            {' · '}
                            {isHeadquarters
                              ? 'สำนักงานใหญ่'
                              : employee.department === 'postal'
                                ? 'ไปรษณีย์'
                                : 'SuperBlackCoffee'}
                          </Typography>
                          <ItemActionButtons
                            editLabel={
                              pendingDeleteEmployeeId === employee.id
                                ? 'ยกเลิก'
                                : 'แก้ไข'
                            }
                            deleteLabel={
                              pendingDeleteEmployeeId === employee.id
                                ? 'ยืนยัน'
                                : 'ลบ'
                            }
                            onEdit={() => {
                              if (pendingDeleteEmployeeId === employee.id)
                                setPendingDeleteEmployeeId(null);
                              else void editEmployee(employee);
                            }}
                            onDelete={() => {
                              if (pendingDeleteEmployeeId === employee.id)
                                void removeEmployee(employee);
                              else setPendingDeleteEmployeeId(employee.id);
                            }}
                            sx={{
                              ml: { xs: 0, md: 2 },
                              width: { xs: '100%', md: 176 },
                              flexShrink: 0,
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  )}
                </Card>
              ) : null}
            </Box>

            {!franchiseMode && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap',
                  mb: 2,
                }}
              >
                {headquartersBranches.length > 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                      สำนักงานใหญ่
                    </Typography>
                    {headquartersBranches.map((branch) => (
                      <Button
                        key={branch.id}
                        size="small"
                        variant={
                          activeBranchId === branch.id
                            ? 'contained'
                            : 'outlined'
                        }
                        onClick={() => selectBranch(branch.code)}
                        sx={{
                          ...(activeBranchId === branch.id
                            ? {}
                            : { borderColor: '#9b765b' }),
                        }}
                      >
                        {branch.name}
                      </Button>
                    ))}
                  </Box>
                ) : null}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                    สาขา SBC
                  </Typography>
                  {sbcBranches.map((branch) => (
                    <Button
                      key={branch.id}
                      size="small"
                      variant={
                        activeBranchId === branch.id ? 'contained' : 'outlined'
                      }
                      onClick={() => selectBranch(branch.code)}
                    >
                      {branch.name}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}

            <Card
              variant="outlined"
              sx={{
                borderRadius: '16px',
                borderColor: '#e8ddd5',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.75,
                  borderBottom: '1px solid #eee4dd',
                  bgcolor: '#fbf7f4',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {!franchiseMode && (
                      <Box>
                        <Typography
                          sx={{
                            color: '#8b7161',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          สาขา
                        </Typography>
                        <Typography
                          sx={{
                            color: loadError ? 'error.main' : '#201914',
                            fontSize: 21,
                            fontWeight: 800,
                          }}
                        >
                          {loadError
                            ? 'โหลดข้อมูลไม่สำเร็จ'
                            : (activeBranch?.name ?? 'ยังไม่พบสาขา')}
                        </Typography>
                      </Box>
                    )}
                    <Box
                      sx={{
                        pl: franchiseMode ? 0 : 3,
                        borderLeft: franchiseMode ? 0 : '1px solid #dfd1c8',
                      }}
                    >
                      <Typography
                        sx={{ color: '#8b7161', fontSize: 12, fontWeight: 700 }}
                      >
                        เดือน
                      </Typography>
                      <Typography
                        sx={{ color: '#201914', fontSize: 21, fontWeight: 800 }}
                      >
                        {thaiMonth.format(month)}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    data-export-excel-control
                    size="small"
                    variant="outlined"
                    disabled={activeBranchId === null || Boolean(loadError)}
                    onClick={() => {
                      if (activeBranchId === null) return;
                      void exportStaffSchedulesXlsx(monthKey, activeBranchId)
                        .then((file) => {
                          const url = URL.createObjectURL(file);
                          const link = document.createElement('a');
                          const safeBranchName = (
                            activeBranch?.name ?? 'ไม่ระบุสาขา'
                          )
                            .trim()
                            .replace(/[\\/]/g, '-');
                          const monthLabel = thaiMonth
                            .format(month)
                            .replace(' ', '-');
                          link.href = url;
                          link.download = `ตารางงานพนักงาน-สาขา${safeBranchName}-${monthLabel}.xlsx`;
                          link.style.display = 'none';
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          window.setTimeout(
                            () => URL.revokeObjectURL(url),
                            1_000,
                          );
                          setActionNotice({
                            message: 'ดาวน์โหลดไฟล์ Excel แล้ว',
                          });
                        })
                        .catch((exportError: unknown) =>
                          setActionNotice({
                            message:
                              exportError instanceof Error
                                ? exportError.message
                                : 'ไม่สามารถส่งออกไฟล์ Excel ได้',
                            severity: 'error',
                          }),
                        );
                    }}
                  >
                    ส่งออก Excel
                  </Button>
                </Box>
              </Box>
              <>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: { xs: 2, md: 2.5 },
                    pt: 1.5,
                    pb: 1,
                  }}
                >
                  <Typography
                    sx={{
                      mr: 0.5,
                      color: '#6e5b4d',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    ปฏิทิน
                  </Typography>
                  <Button
                    size="small"
                    variant={
                      calendarDepartment === 'cafe' ? 'contained' : 'outlined'
                    }
                    onClick={() => setCalendarDepartment('cafe')}
                    sx={
                      calendarDepartment === 'cafe'
                        ? {
                            bgcolor: '#805637',
                            '&:hover': { bgcolor: '#60412a' },
                          }
                        : undefined
                    }
                  >
                    {isHeadquarters ? 'สำนักงานใหญ่' : 'SuperBlackCoffee'}
                  </Button>
                  {!isHeadquarters ? (
                    <Button
                      size="small"
                      variant={
                        calendarDepartment === 'postal'
                          ? 'contained'
                          : 'outlined'
                      }
                      onClick={() => setCalendarDepartment('postal')}
                      sx={
                        calendarDepartment === 'postal'
                          ? {
                              bgcolor: '#805637',
                              '&:hover': { bgcolor: '#60412a' },
                            }
                          : undefined
                      }
                    >
                      ไปรษณีย์
                    </Button>
                  ) : null}
                  {isHeadquarters ? (
                    <Typography sx={{ color: '#6e5b4d', fontSize: 12.5 }}>
                      ทำงานวันจันทร์–เสาร์ · หยุดวันอาทิตย์และวันนักขัตฤกษ์
                    </Typography>
                  ) : null}
                </Box>
                <Box sx={{ overflowX: 'auto' }}>
                  <Box sx={{ minWidth: 780 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                        borderBottom: '1px solid #eee4dd',
                      }}
                    >
                      {thaiWeekday.map((day, index) => (
                        <Box
                          key={day}
                          sx={{
                            py: 1,
                            textAlign: 'center',
                            color: index > 4 ? '#9a6d5c' : '#60493b',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {day}
                        </Box>
                      ))}
                    </Box>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                      }}
                    >
                      {calendarDays.map((day) => {
                        const isCurrentMonth =
                          day.getMonth() === month.getMonth();
                        const isToday = isSameDay(day, today);
                        const shifts = shiftsByDate.get(dateKey(day)) ?? [];
                        const holiday = loadError
                          ? undefined
                          : holidaysByDate.get(dateKey(day));
                        return (
                          <Box
                            key={day.toISOString()}
                            sx={{
                              minHeight: 122,
                              p: 1.25,
                              borderRight: '1px solid #eee4dd',
                              borderBottom: '1px solid #eee4dd',
                              bgcolor: !isCurrentMonth
                                ? '#fbf8f6'
                                : holiday
                                  ? '#fff8eb'
                                  : '#fff',
                              opacity: isCurrentMonth ? 1 : 0.5,
                              '&:nth-of-type(7n)': { borderRight: 0 },
                              '&:nth-last-child(-n + 7)': { borderBottom: 0 },
                            }}
                          >
                            <Box
                              sx={{
                                width: 26,
                                height: 26,
                                display: 'grid',
                                placeItems: 'center',
                                borderRadius: '50%',
                                bgcolor: isToday ? '#3c2d24' : 'transparent',
                                color: isToday ? '#fff' : '#45342b',
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            >
                              {day.getDate()}
                            </Box>
                            {!loadError && holiday ? (
                              <Typography
                                title={holiday.name}
                                sx={{
                                  mt: 0.35,
                                  color: '#b94136',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  lineHeight: 1.25,
                                }}
                              >
                                {holiday.name}
                              </Typography>
                            ) : null}
                            {loadError ? (
                              <Typography
                                sx={{
                                  mt: 2.5,
                                  color: 'error.main',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  lineHeight: 1.35,
                                }}
                              >
                                โหลดข้อมูลไม่สำเร็จ
                              </Typography>
                            ) : isCurrentMonth && shifts.length === 0 ? (
                              <Typography
                                sx={{
                                  mt: 2.5,
                                  color: '#a89285',
                                  fontSize: 11,
                                  lineHeight: 1.35,
                                }}
                              >
                                ยังไม่มีตารางกะ{' '}
                                {isHeadquarters
                                  ? 'สำนักงานใหญ่'
                                  : calendarDepartment === 'cafe'
                                    ? 'SuperBlackCoffee'
                                    : 'ไปรษณีย์'}
                              </Typography>
                            ) : null}
                            {!loadError &&
                              shifts.map((shift) => (
                                <Box
                                  key={shift.id}
                                  component="button"
                                  type="button"
                                  draggable={isWorkingShift(shift.status)}
                                  onClick={() => openShiftEditor(shift)}
                                  onDragStart={() =>
                                    setDraggedShiftId(shift.id)
                                  }
                                  onDragEnd={() => setDraggedShiftId(null)}
                                  onDragOver={(event) => {
                                    if (!isWorkingShift(shift.status))
                                      event.preventDefault();
                                  }}
                                  onDrop={() => {
                                    if (
                                      draggedShiftId !== null &&
                                      draggedShiftId !== shift.id &&
                                      !isWorkingShift(shift.status)
                                    )
                                      replaceShift.mutate({
                                        targetShiftId: shift.id,
                                        sourceShiftId: draggedShiftId,
                                      });
                                  }}
                                  sx={{
                                    width: '100%',
                                    border: 0,
                                    cursor: 'pointer',
                                    opacity:
                                      draggedShiftId === shift.id
                                        ? 0.55
                                        : undefined,
                                    outline:
                                      draggedShiftId !== null &&
                                      !isWorkingShift(shift.status)
                                        ? '2px dashed #b94136'
                                        : 'none',
                                    outlineOffset: 2,
                                    textAlign: 'left',
                                    mt: 0.75,
                                    px: 0.65,
                                    py: 0.35,
                                    borderRadius: '6px',
                                    bgcolor:
                                      shift.status === 'scheduled'
                                        ? shiftColorsByUser.get(shift.userId)
                                        : shift.status === 'compensatory_work'
                                          ? '#dff4e7'
                                          : shift.status === 'day_off'
                                            ? '#ebe8e5'
                                            : '#ffe4e4',
                                    color: '#60493b',
                                    fontFamily:
                                      'IBM Plex Sans Thai, sans-serif',
                                    fontSize: 11,
                                    lineHeight: 1.25,
                                  }}
                                >
                                  <Box
                                    component="span"
                                    sx={{
                                      display: 'block',
                                      mb: 0.75,
                                      overflow: 'hidden',
                                      color: '#45342b',
                                      fontWeight: 700,
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {shift.name}
                                  </Box>
                                  <Box
                                    component="span"
                                    sx={{
                                      display: 'block',
                                      color: '#60493b',
                                      fontSize: 11,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {isWorkingShift(shift.status)
                                      ? `${shift.startsAt.slice(0, 5)} น. - ${shift.endsAt.slice(0, 5)} น.`
                                      : shift.leaveType ||
                                        leaveLabels[shift.status]}
                                  </Box>
                                </Box>
                              ))}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              </>
            </Card>
          </>
        ) : null}
      </Box>
      <DashboardFormDrawer
        open={Boolean(selectedShift)}
        onClose={() => setSelectedShift(null)}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 2.5, sm: 4 },
            pt: 1.5,
            pb: 3.5,
          }}
        >
          <DashboardDrawerHandle />
          <DashboardDrawerHeader
            title="จัดการกะงาน"
            description={selectedShift?.name}
            onClose={() => setSelectedShift(null)}
          />
          <Box
            sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pt: 2.25, pr: 0.5 }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(3, minmax(0, 1fr))',
                },
                gap: 2,
                mt: 0,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: '#fff',
                },
              }}
            >
              <DateField
                label="ย้ายไปวันที่"
                value={editDate}
                onChange={(event) => setEditDate(event.target.value)}
              />
              {!franchiseMode && (
                <FormControl>
                  <InputLabel id="schedule-branch-label">สาขา</InputLabel>
                  <Select
                    labelId="schedule-branch-label"
                    label="สาขา"
                    value={editBranchId}
                    onChange={(event) => setEditBranchId(event.target.value)}
                  >
                    {workspaceBranches.map((branch) => (
                      <MenuItem key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <FormControl>
                <InputLabel id="schedule-status-label">สถานะ</InputLabel>
                <Select
                  labelId="schedule-status-label"
                  label="สถานะ"
                  value={editStatus}
                  onChange={(event) =>
                    setEditStatus(event.target.value as StaffShift['status'])
                  }
                >
                  {(Object.keys(leaveLabels) as StaffShift['status'][]).map(
                    (status) => (
                      <MenuItem key={status} value={status}>
                        {leaveLabels[status]}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>
              <TextField
                required
                label="เวลาเข้างาน"
                type="time"
                value={editStartsAt}
                onChange={(event) => setEditStartsAt(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                required
                label="เวลาออกงาน"
                type="time"
                value={editEndsAt}
                onChange={(event) => setEditEndsAt(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Typography
                sx={{ color: '#6e5b4d', fontSize: 12.5, gridColumn: '1 / -1' }}
              >
                เวลาที่แก้ไขจะเป็นข้อยกเว้นเฉพาะวันนี้
                และจะไม่ถูกทับเมื่อจัดตารางอัตโนมัติอีกครั้ง
              </Typography>
              {updateShift.error ? (
                <Typography
                  color="error"
                  sx={{ fontSize: 13, gridColumn: '1 / -1' }}
                >
                  {updateShift.error.message}
                </Typography>
              ) : null}
              <DrawerActionBar
                sx={{
                  gridColumn: '1 / -1',
                }}
              >
                <Button onClick={() => setSelectedShift(null)}>ยกเลิก</Button>
                <Button
                  variant="contained"
                  onClick={() => updateShift.mutate()}
                  disabled={updateShift.isPending}
                  sx={{ bgcolor: '#201914', '&:hover': { bgcolor: '#3c2d24' } }}
                >
                  {updateShift.isPending ? 'กำลังบันทึก...' : 'บันทึกกะงาน'}
                </Button>
              </DrawerActionBar>
            </Box>
          </Box>
        </Box>
      </DashboardFormDrawer>
      <DashboardFormDrawer
        open={isEmployeeDrawerOpen}
        onClose={() => setIsEmployeeDrawerOpen(false)}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 2.5, sm: 4 },
            pt: 1.5,
            pb: 3.5,
          }}
        >
          <DashboardDrawerHandle />
          <DashboardDrawerHeader
            title={editingEmployeeId !== null ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน'}
            description={
              isHeadquarters
                ? 'สร้างบัญชีสำหรับพนักงานสำนักงานใหญ่ และกำหนดเวลาทำงานประจำ'
                : 'สร้างบัญชีเพื่อเข้าสู่ระบบและจัดตารางกะ'
            }
            onClose={() => setIsEmployeeDrawerOpen(false)}
          />
          <Box
            sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pt: 2.25, pr: 0.5 }}
          >
            <Box
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                const assignedWeekdays = new Set<number>();
                const hasInvalidAdditionalShift = additionalShifts.some(
                  (shift) => {
                    const invalid =
                      !shift.startsAt ||
                      !shift.endsAt ||
                      shift.startsAt === '00:00' ||
                      shift.endsAt === '00:00' ||
                      shift.weekdays.some((weekday) => {
                        if (assignedWeekdays.has(weekday)) return true;
                        assignedWeekdays.add(weekday);
                        return false;
                      });
                    return invalid;
                  },
                );
                if (
                  !defaultStartsAt ||
                  !defaultEndsAt ||
                  defaultStartsAt === '00:00' ||
                  defaultEndsAt === '00:00' ||
                  hasInvalidAdditionalShift
                ) {
                  setActionNotice({
                    message:
                      'กรุณาระบุเวลาให้ครบทุกกะ และหากเลือกวันทำงาน ต้องไม่ซ้ำกันระหว่างกะ',
                    severity: 'warning',
                  });
                  return;
                }
                if (dayOffPolicy === 'home_branch' && !dayOffSourceBranchId) {
                  setActionNotice({
                    message: 'กรุณาเลือกสาขาที่ใช้อ้างอิงวันหยุด',
                    severity: 'warning',
                  });
                  return;
                }
                if (
                  dayOffPolicy === 'custom' &&
                  weeklyDaysOff.length === 0 &&
                  customDaysOff.length === 0
                ) {
                  setActionNotice({
                    message:
                      'กำหนดวันหยุดประจำหรือวันหยุดเฉพาะวันที่อย่างน้อย 1 วัน',
                    severity: 'warning',
                  });
                  return;
                }
                if (editingEmployeeId !== null) {
                  const updatedEmployeeId = editingEmployeeId;
                  const updatedName = newEmployeeName.trim();
                  const updatedJobTitle = newEmployeeJobTitle.trim();
                  const updatedStartsAt = defaultStartsAt;
                  const updatedEndsAt = defaultEndsAt;
                  const updatedDefaultShifts = [
                    {
                      startsAt: updatedStartsAt,
                      endsAt: updatedEndsAt,
                      weekdays: [],
                    },
                    ...additionalShifts,
                  ];
                  const updatedDayOffPolicy = dayOffPolicy;
                  const updatedDayOffSourceBranchId = Number(
                    dayOffSourceBranchId || newEmployeeBranchId,
                  );
                  const updatedWeeklyDaysOff = weeklyDaysOff;
                  const updatedCustomDaysOff = customDaysOff;
                  void updateEmployee(editingEmployeeId, {
                    name: updatedName,
                    role: newEmployeeRole,
                    jobTitle: updatedJobTitle,
                    department: newEmployeeDepartment,
                    branchId: Number(newEmployeeBranchId),
                    defaultStartsAt: updatedStartsAt,
                    defaultEndsAt: updatedEndsAt,
                    defaultShifts: updatedDefaultShifts,
                    dayOffPolicy: updatedDayOffPolicy,
                    dayOffSourceBranchId: updatedDayOffSourceBranchId,
                    weeklyDaysOff: updatedWeeklyDaysOff,
                    customDaysOff: updatedCustomDaysOff,
                  })
                    .then(() => {
                      queryClient.setQueryData<Employee[]>(
                        ['employees'],
                        (current) =>
                          current?.map((employee) =>
                            employee.id === updatedEmployeeId
                              ? {
                                  ...employee,
                                  name: updatedName,
                                  role: newEmployeeRole,
                                  jobTitle: updatedJobTitle,
                                  department: newEmployeeDepartment,
                                  branchId: Number(newEmployeeBranchId),
                                  defaultStartsAt: updatedStartsAt,
                                  defaultEndsAt: updatedEndsAt,
                                  defaultShifts: updatedDefaultShifts,
                                  dayOffPolicy: updatedDayOffPolicy,
                                  dayOffSourceBranchId:
                                    updatedDayOffSourceBranchId,
                                  weeklyDaysOff: updatedWeeklyDaysOff,
                                  customDaysOff: updatedCustomDaysOff,
                                }
                              : employee,
                          ),
                      );
                      void queryClient.invalidateQueries({
                        queryKey: ['staff-schedules', monthKey],
                      });
                      setEditingEmployeeId(null);
                      setIsEmployeeDrawerOpen(false);
                      setActionNotice({
                        message:
                          'แก้ไขข้อมูลพนักงานแล้ว กดจัดตารางอัตโนมัติเพื่อใช้วันหยุดใหม่',
                      });
                    })
                    .catch((updateError: unknown) => {
                      setActionNotice({
                        message:
                          updateError instanceof Error
                            ? updateError.message
                            : 'แก้ไขข้อมูลพนักงานไม่สำเร็จ',
                        severity: 'error',
                      });
                    });
                } else createEmployeeMutation.mutate();
              }}
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 2,
                mt: 0,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: '#fff',
                },
              }}
            >
              <TextField
                required
                label="ชื่อ"
                value={newEmployeeName}
                onChange={(event) => setNewEmployeeName(event.target.value)}
              />
              <TextField
                required
                label="Username"
                value={newEmployeeUsername}
                slotProps={{ input: { readOnly: true } }}
                helperText="ระบบสร้างจากรหัสสาขาและลำดับพนักงาน"
              />
              {isHeadquarters ? (
                <Box
                  sx={{
                    gridColumn: { xs: '1', sm: '1 / -1' },
                    border: '1px solid #d9e8db',
                    borderRadius: 2,
                    bgcolor: '#f4fbf5',
                    px: 1.5,
                    py: 1.25,
                  }}
                >
                  <Typography
                    sx={{ color: '#285b36', fontSize: 14, fontWeight: 700 }}
                  >
                    สำนักงานใหญ่
                  </Typography>
                  <Typography
                    sx={{ mt: 0.25, color: '#477052', fontSize: 12.5 }}
                  >
                    พนักงานนี้อยู่สำนักงานใหญ่
                    ระบบจัดวันหยุดวันอาทิตย์และวันนักขัตฤกษ์ให้โดยอัตโนมัติ
                  </Typography>
                </Box>
              ) : !franchiseMode ? (
                <FormControl required>
                  <InputLabel id="new-employee-branch-label">
                    สาขาที่ปฏิบัติงาน
                  </InputLabel>
                  <Select
                    labelId="new-employee-branch-label"
                    label="สาขาที่ปฏิบัติงาน"
                    value={newEmployeeBranchId}
                    onChange={(event) => {
                      setNewEmployeeBranchId(event.target.value);
                      if (editingEmployeeId === null) {
                        setNewEmployeeUsername(
                          suggestedUsername(event.target.value),
                        );
                      }
                    }}
                  >
                    {workspaceBranches.map((branch) => (
                      <MenuItem key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : null}
              {!isHeadquarters ? (
                <FormControl required>
                  <InputLabel id="new-employee-department-label">
                    แผนก
                  </InputLabel>
                  <Select
                    labelId="new-employee-department-label"
                    label="แผนก"
                    value={newEmployeeDepartment}
                    onChange={(event) => {
                      const department = event.target.value as
                        'cafe' | 'postal';
                      setNewEmployeeDepartment(department);
                      if (department === 'postal') {
                        setDefaultStartsAt(postalWeekdaySchedule.startsAt);
                        setDefaultEndsAt(postalWeekdaySchedule.endsAt);
                        setAdditionalShifts([postalWeekendSchedule]);
                      }
                    }}
                  >
                    <MenuItem value="cafe">SuperBlackCoffee</MenuItem>
                    <MenuItem value="postal">ไปรษณีย์</MenuItem>
                  </Select>
                </FormControl>
              ) : null}
              <TextField
                required
                label="ตำแหน่ง"
                placeholder="เช่น บาริสต้า"
                value={newEmployeeJobTitle}
                onChange={(event) => setNewEmployeeJobTitle(event.target.value)}
              />
              {!isHeadquarters && newEmployeeDepartment === 'postal' ? (
                <Box
                  sx={{
                    gridColumn: '1 / -1',
                    mt: 0.5,
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid #dfd1c8',
                    bgcolor: '#fbf7f4',
                  }}
                >
                  <Typography
                    sx={{ color: '#3c2d24', fontSize: 14, fontWeight: 700 }}
                  >
                    เวลางานมาตรฐานไปรษณีย์
                  </Typography>
                  <Typography sx={{ mt: 0.5, color: '#6e5b4d', fontSize: 13 }}>
                    จันทร์–ศุกร์ 09:00–18:00 น. · เสาร์–อาทิตย์ 10:00–19:00 น.
                    แก้เฉพาะวันได้จากปฏิทินหลังบันทึกพนักงาน
                  </Typography>
                </Box>
              ) : (
                <>
                  {isHeadquarters ? (
                    <Box sx={{ gridColumn: '1 / -1', mt: 0.5 }}>
                      <Divider sx={{ borderColor: '#d8cec7', mb: 1.5 }} />
                      <Typography
                        sx={{ color: '#3c2d24', fontSize: 14, fontWeight: 600 }}
                      >
                        กฎวันหยุดสำนักงานใหญ่
                      </Typography>
                      <Typography
                        sx={{ mt: 0.5, color: '#6e5b4d', fontSize: 12.5 }}
                      >
                        หยุดวันอาทิตย์และวันนักขัตฤกษ์
                        ไม่มีวันหยุดประจำเดือนหรือวันหยุดชดเชยอัตโนมัติ
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ gridColumn: '1 / -1', mt: 0.5 }}>
                        <Divider sx={{ borderColor: '#d8cec7', mb: 1.5 }} />
                        <Typography
                          sx={{
                            color: '#3c2d24',
                            fontSize: 14,
                            fontWeight: 600,
                            mb: 0.5,
                          }}
                        >
                          วันหยุดของพนักงาน
                        </Typography>
                        <Typography sx={{ color: '#6e5b4d', fontSize: 12.5 }}>
                          ตั้งค่าแยกจากสาขาที่ปฏิบัติงาน
                          เพื่อให้พนักงานที่ไปช่วยสาขาอื่นยังใช้วันหยุดเดิมได้
                        </Typography>
                      </Box>
                      <FormControl
                        required
                        sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
                      >
                        <InputLabel id="day-off-policy-label">
                          รูปแบบวันหยุด
                        </InputLabel>
                        <Select
                          labelId="day-off-policy-label"
                          label="รูปแบบวันหยุด"
                          value={dayOffPolicy}
                          onChange={(event) =>
                            setDayOffPolicy(
                              event.target.value as
                                | 'automatic'
                                | 'home_branch'
                                | 'work_branch'
                                | 'custom',
                            )
                          }
                        >
                          <MenuItem value="automatic">
                            ให้ระบบจัดวันหยุดรายเดือน
                          </MenuItem>
                          <MenuItem value="home_branch">
                            อ้างอิงวันทำงานของสาขาที่เลือก
                          </MenuItem>
                          <MenuItem value="work_branch">
                            อ้างอิงวันทำงานของสาขาที่ปฏิบัติงาน
                          </MenuItem>
                          <MenuItem value="custom">กำหนดวันหยุดเอง</MenuItem>
                        </Select>
                      </FormControl>
                      {dayOffPolicy === 'home_branch' ? (
                        <FormControl required sx={{ gridColumn: '1 / -1' }}>
                          <InputLabel id="day-off-source-branch-label">
                            สาขาอ้างอิงวันหยุด
                          </InputLabel>
                          <Select
                            labelId="day-off-source-branch-label"
                            label="สาขาอ้างอิงวันหยุด"
                            value={dayOffSourceBranchId}
                            onChange={(event) =>
                              setDayOffSourceBranchId(event.target.value)
                            }
                          >
                            {workspaceBranches.map((branch) => (
                              <MenuItem
                                key={branch.id}
                                value={String(branch.id)}
                              >
                                {branch.name}
                                {branch.isHeadquarters ? ' (สำนักงานใหญ่)' : ''}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : null}
                      {dayOffPolicy === 'custom' ? (
                        <Box sx={{ gridColumn: '1 / -1' }}>
                          <Typography
                            sx={{ color: '#5f4b3d', fontSize: 12.5, mb: 1 }}
                          >
                            วันหยุดประจำสัปดาห์
                          </Typography>
                          <Box
                            aria-label="วันหยุดประจำสัปดาห์"
                            sx={{
                              display: 'flex',
                              gap: 0.75,
                              overflowX: 'auto',
                              pb: 1.25,
                            }}
                          >
                            {thaiWeekday.map((day, index) => {
                              const weekday = index + 1;
                              const selected = weeklyDaysOff.includes(weekday);
                              return (
                                <Button
                                  key={day}
                                  size="small"
                                  variant={selected ? 'contained' : 'outlined'}
                                  aria-pressed={selected}
                                  onClick={() =>
                                    setWeeklyDaysOff((current) =>
                                      current.includes(weekday)
                                        ? current.filter(
                                            (value) => value !== weekday,
                                          )
                                        : [...current, weekday],
                                    )
                                  }
                                  sx={{
                                    ...selectionPillSx(selected),
                                    minWidth: 80,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {day}
                                </Button>
                              );
                            })}
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 1,
                              alignItems: 'center',
                              flexWrap: 'wrap',
                            }}
                          >
                            <TextField
                              label="วันหยุดเฉพาะวันที่"
                              type="date"
                              value={customDayOffDate}
                              onChange={(event) =>
                                setCustomDayOffDate(event.target.value)
                              }
                              slotProps={{ inputLabel: { shrink: true } }}
                              sx={{ minWidth: 210 }}
                            />
                            <Button
                              type="button"
                              variant="outlined"
                              disabled={
                                !customDayOffDate ||
                                customDaysOff.includes(customDayOffDate)
                              }
                              onClick={() => {
                                if (
                                  !customDayOffDate ||
                                  customDaysOff.includes(customDayOffDate)
                                )
                                  return;
                                setCustomDaysOff((current) =>
                                  [...current, customDayOffDate].sort(),
                                );
                                setCustomDayOffDate('');
                              }}
                            >
                              เพิ่มวันหยุด
                            </Button>
                          </Box>
                          {customDaysOff.length > 0 ? (
                            <Box
                              sx={{
                                display: 'flex',
                                gap: 0.75,
                                flexWrap: 'wrap',
                                mt: 1,
                              }}
                            >
                              {customDaysOff.map((date) => (
                                <Button
                                  key={date}
                                  type="button"
                                  size="small"
                                  variant="outlined"
                                  onClick={() =>
                                    setCustomDaysOff((current) =>
                                      current.filter((value) => value !== date),
                                    )
                                  }
                                >
                                  {date} ×
                                </Button>
                              ))}
                            </Box>
                          ) : null}
                        </Box>
                      ) : null}
                    </>
                  )}
                  <Box sx={{ gridColumn: '1 / -1', mt: 0.5 }}>
                    <Divider sx={{ borderColor: '#d8cec7', mb: 1.5 }} />
                    <Typography
                      sx={{
                        color: '#3c2d24',
                        fontSize: 14,
                        fontWeight: 600,
                        mb: 1,
                      }}
                    >
                      {isHeadquarters
                        ? 'เวลาทำงานประจำสำนักงานใหญ่'
                        : 'เวลาทำงานประจำ'}
                    </Typography>
                    <Typography
                      sx={{
                        color: '#3c2d24',
                        fontSize: 13,
                        fontWeight: 600,
                        mb: 1,
                      }}
                    >
                      กะที่ 1 *
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      gridColumn: { xs: '1', sm: '1 / -1' },
                    }}
                  >
                    <Box sx={{ flex: 1, position: 'relative' }}>
                      <TextField
                        required
                        fullWidth
                        label="เวลาเข้างาน"
                        type="time"
                        value={defaultStartsAt}
                        onChange={(event) =>
                          setDefaultStartsAt(event.target.value)
                        }
                        onMouseEnter={() => setHoveredTimeField('start')}
                        onMouseLeave={() => setHoveredTimeField(null)}
                        sx={{
                          '& input::-webkit-calendar-picker-indicator': {
                            opacity: 0,
                          },
                        }}
                        slotProps={{
                          inputLabel: { shrink: true },
                          htmlInput: {
                            onClick: (event: MouseEvent<HTMLInputElement>) =>
                              event.currentTarget.showPicker?.(),
                          },
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: '0 16px 0 auto',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#3c2d24',
                          pointerEvents: 'none',
                          zIndex: 2,
                        }}
                      >
                        <ClockIcon
                          size={20}
                          animated={hoveredTimeField === 'start'}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ flex: 1, position: 'relative' }}>
                      <TextField
                        required
                        fullWidth
                        label="เวลาออกงาน"
                        type="time"
                        value={defaultEndsAt}
                        onChange={(event) =>
                          setDefaultEndsAt(event.target.value)
                        }
                        onMouseEnter={() => setHoveredTimeField('end')}
                        onMouseLeave={() => setHoveredTimeField(null)}
                        sx={{
                          '& input::-webkit-calendar-picker-indicator': {
                            opacity: 0,
                          },
                        }}
                        slotProps={{
                          inputLabel: { shrink: true },
                          htmlInput: {
                            onClick: (event: MouseEvent<HTMLInputElement>) =>
                              event.currentTarget.showPicker?.(),
                          },
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: '0 16px 0 auto',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#3c2d24',
                          pointerEvents: 'none',
                          zIndex: 2,
                        }}
                      >
                        <ClockIcon
                          size={20}
                          animated={hoveredTimeField === 'end'}
                        />
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ gridColumn: '1 / -1', mt: 0.5 }}>
                    <Divider sx={{ borderColor: '#e4dad4', mb: 1.5 }} />
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            color: '#3c2d24',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          กะเพิ่มเติม
                        </Typography>
                        <Typography sx={{ color: '#5f4b3d', fontSize: 12.5 }}>
                          เพิ่มกะที่ 2 ขึ้นไปเพื่อกำหนดพนักงานสำรอง
                          ระบบจะให้แทนกะที่ขาดก่อน แล้วจึงทำกะแรกของตนเอง
                        </Typography>
                      </Box>
                      <Button
                        type="button"
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          setAdditionalShifts((current) => [
                            ...current,
                            { startsAt: '', endsAt: '', weekdays: [] },
                          ])
                        }
                      >
                        + เพิ่มกะ
                      </Button>
                    </Box>
                  </Box>
                  {additionalShifts.map((shift, shiftIndex) => {
                    const usedByOtherShifts = new Set(
                      additionalShifts.flatMap((item, index) =>
                        index === shiftIndex ? [] : item.weekdays,
                      ),
                    );
                    const updateShift = (changes: Partial<AdditionalShift>) =>
                      setAdditionalShifts((current) =>
                        current.map((item, index) =>
                          index === shiftIndex ? { ...item, ...changes } : item,
                        ),
                      );
                    return (
                      <Box
                        key={shiftIndex}
                        sx={{
                          gridColumn: '1 / -1',
                          border: '1px solid #e4dad4',
                          borderRadius: 2,
                          p: 1.5,
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, minmax(0, 1fr))',
                          },
                          gap: 1.25,
                        }}
                      >
                        <Box
                          sx={{
                            gridColumn: '1 / -1',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Typography
                            sx={{
                              color: '#3c2d24',
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            กะที่ {shiftIndex + 2}
                          </Typography>
                          <Button
                            type="button"
                            size="small"
                            color="inherit"
                            onClick={() =>
                              setAdditionalShifts((current) =>
                                current.filter(
                                  (_, index) => index !== shiftIndex,
                                ),
                              )
                            }
                          >
                            ลบกะ
                          </Button>
                        </Box>
                        <TextField
                          fullWidth
                          label={`เวลาเข้างาน กะที่ ${shiftIndex + 2}`}
                          type="time"
                          value={shift.startsAt}
                          onChange={(event) =>
                            updateShift({ startsAt: event.target.value })
                          }
                          slotProps={{
                            inputLabel: { shrink: true },
                            htmlInput: {
                              onClick: (event: MouseEvent<HTMLInputElement>) =>
                                event.currentTarget.showPicker?.(),
                            },
                          }}
                        />
                        <TextField
                          fullWidth
                          label={`เวลาออกงาน กะที่ ${shiftIndex + 2}`}
                          type="time"
                          value={shift.endsAt}
                          onChange={(event) =>
                            updateShift({ endsAt: event.target.value })
                          }
                          slotProps={{
                            inputLabel: { shrink: true },
                            htmlInput: {
                              onClick: (event: MouseEvent<HTMLInputElement>) =>
                                event.currentTarget.showPicker?.(),
                            },
                          }}
                        />
                        <Box sx={{ gridColumn: '1 / -1' }}>
                          <Typography
                            sx={{ color: '#5f4b3d', fontSize: 12.5, mb: 0.75 }}
                          >
                            เลือกวันที่ทำกะที่ {shiftIndex + 2} (ไม่บังคับ)
                          </Typography>
                          <Box
                            aria-label={`วันทำงานกะที่ ${shiftIndex + 2}`}
                            sx={{
                              display: 'flex',
                              gap: 0.75,
                              overflowX: 'auto',
                              pb: 0.5,
                            }}
                          >
                            {thaiWeekday.map((day, index) => {
                              const weekday = index + 1;
                              const selected = shift.weekdays.includes(weekday);
                              const unavailable =
                                !selected && usedByOtherShifts.has(weekday);
                              return (
                                <Button
                                  key={day}
                                  type="button"
                                  size="small"
                                  variant={selected ? 'contained' : 'outlined'}
                                  aria-pressed={selected}
                                  disabled={unavailable}
                                  onClick={() =>
                                    updateShift({
                                      weekdays: selected
                                        ? shift.weekdays.filter(
                                            (value) => value !== weekday,
                                          )
                                        : [...shift.weekdays, weekday],
                                    })
                                  }
                                  sx={{
                                    ...selectionPillSx(selected),
                                    minWidth: 80,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {day}
                                </Button>
                              );
                            })}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </>
              )}
              {createEmployeeMutation.error ? (
                <Typography
                  color="error"
                  sx={{ fontSize: 13, gridColumn: '1 / -1' }}
                >
                  {createEmployeeMutation.error.message}
                </Typography>
              ) : null}
              <DrawerActionBar
                sx={{
                  gridColumn: '1 / -1',
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => setIsEmployeeDrawerOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={createEmployeeMutation.isPending}
                  sx={{ bgcolor: '#201914', '&:hover': { bgcolor: '#3c2d24' } }}
                >
                  {editingEmployeeId !== null
                    ? 'แก้ไขพนักงาน'
                    : createEmployeeMutation.isPending
                      ? 'กำลังเพิ่ม...'
                      : 'เพิ่มพนักงาน'}
                </Button>
              </DrawerActionBar>
            </Box>
          </Box>
        </Box>
      </DashboardFormDrawer>
      <ActionSnackbar
        notice={actionNotice}
        onClose={() => setActionNotice(null)}
      />
    </DashboardMain>
  );
}
