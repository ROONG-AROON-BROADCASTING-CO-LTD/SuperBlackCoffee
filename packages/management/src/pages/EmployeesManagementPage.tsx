import { type MouseEvent, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Divider,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClockIcon, DashboardMain, XIcon } from '@stackbuild/ui';
import {
  generateStaffSchedules,
  listStaffSchedules,
  replaceStaffShift,
  updateStaffShift,
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
  exportDailyReportAsPdf,
  type DailyPdfEntryTone,
  type DailyPdfSection,
} from '../utils/exportCalendarPdf';

const thaiMonth = new Intl.DateTimeFormat('th-TH', {
  month: 'long',
  year: 'numeric',
});
const thaiDate = new Intl.DateTimeFormat('th-TH', {
  weekday: 'long',
  day: 'numeric',
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

function usesFirstShift(date: string, employeeId: number) {
  return (Number(date.slice(-2)) + employeeId) % 2 === 0;
}

export function EmployeesManagementPage({
  franchiseMode = false,
}: {
  franchiseMode?: boolean;
} = {}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [selectedShift, setSelectedShift] = useState<StaffShift | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editBranchId, setEditBranchId] = useState('');
  const [editStatus, setEditStatus] =
    useState<StaffShift['status']>('scheduled');
  const [draggedShiftId, setDraggedShiftId] = useState<number | null>(null);
  const [isEmployeeDrawerOpen, setIsEmployeeDrawerOpen] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState<
    'branch_manager' | 'cashier'
  >('cashier');
  const [newEmployeeBranchId, setNewEmployeeBranchId] = useState('');
  const [defaultStartsAt, setDefaultStartsAt] = useState('08:00');
  const [defaultEndsAt, setDefaultEndsAt] = useState('17:00');
  const [defaultSecondStartsAt, setDefaultSecondStartsAt] = useState('');
  const [defaultSecondEndsAt, setDefaultSecondEndsAt] = useState('');
  const [hoveredTimeField, setHoveredTimeField] = useState<
    'start' | 'end' | 'secondStart' | 'secondEnd' | null
  >(null);
  const [confirmAutoSchedule, setConfirmAutoSchedule] = useState(false);
  const [pendingDeleteEmployeeId, setPendingDeleteEmployeeId] = useState<
    number | null
  >(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(
    null,
  );
  const {
    data: employees = [],
    error,
    isLoading,
    refetch,
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
  const branches = useQuery({ queryKey: ['branches'], queryFn: listBranches });
  const pageLoading =
    isLoading ||
    schedules.isLoading ||
    holidays.isLoading ||
    branches.isLoading;
  const loadError = error ?? schedules.error ?? branches.error;
  const workspaceBranches = franchiseMode
    ? (branches.data ?? [])
    : (branches.data ?? []).filter((branch) => !branch.franchiseeId);
  const activeBranchId = franchiseMode
    ? (workspaceBranches[0]?.id ?? null)
    : (selectedBranchId ?? workspaceBranches[0]?.id ?? null);
  const activeBranch = workspaceBranches.find(
    (branch) => branch.id === activeBranchId,
  );
  const generate = useMutation({
    mutationFn: () => generateStaffSchedules(monthKey, activeBranchId!),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['staff-schedules', monthKey],
      }),
  });
  const updateShift = useMutation({
    mutationFn: () =>
      updateStaffShift(selectedShift!.id, {
        shiftDate: editDate,
        branchId: Number(editBranchId),
        status: editStatus,
        leaveType: editStatus === 'scheduled' ? '' : leaveLabels[editStatus],
      }),
    onSuccess: () => {
      setSelectedShift(null);
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
      void queryClient.invalidateQueries({
        queryKey: ['staff-schedules', monthKey],
      });
    },
  });
  const createEmployeeMutation = useMutation({
    mutationFn: () =>
      createEmployee({
        name: newEmployeeName,
        username: `employee_${Date.now()}`,
        password: `Temp${Date.now()}!`,
        role: newEmployeeRole,
        branchId: Number(newEmployeeBranchId),
        defaultStartsAt,
        defaultEndsAt,
        defaultSecondStartsAt,
        defaultSecondEndsAt,
      }),
    onSuccess: () => {
      setIsEmployeeDrawerOpen(false);
      setNewEmployeeName('');
      void queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
  const shiftsByDate = useMemo(() => {
    const result = new Map<string, NonNullable<typeof schedules.data>>();
    for (const shift of schedules.data ?? []) {
      if (shift.branchId !== activeBranchId) continue;
      result.set(shift.date, [...(result.get(shift.date) ?? []), shift]);
    }
    return result;
  }, [activeBranchId, schedules.data]);
  const holidaysByDate = useMemo(
    () =>
      new Map((holidays.data ?? []).map((holiday) => [holiday.date, holiday])),
    [holidays.data],
  );
  const dailyScheduleReport = useMemo<DailyPdfSection[]>(
    () =>
      calendarDays
        .filter((day) => day.getMonth() === month.getMonth())
        .map((day) => {
          const key = dateKey(day);
          const holiday = holidaysByDate.get(key);
          return {
            date: thaiDate.format(day),
            holidayName: holiday?.name,
            entries: (shiftsByDate.get(key) ?? []).map((shift) => {
              const tone: DailyPdfEntryTone =
                shift.status === 'compensatory_work'
                  ? 'success'
                  : shift.status === 'scheduled'
                    ? 'neutral'
                    : 'warning';
              return {
                name: shift.name,
                detail: isWorkingShift(shift.status)
                  ? `${shift.startsAt.slice(0, 5)} น. - ${shift.endsAt.slice(0, 5)} น.`
                  : leaveLabels[shift.status],
                tone,
              };
            }),
          };
        })
        .filter((day) => day.entries.length > 0 || day.holidayName),
    [calendarDays, holidaysByDate, month, shiftsByDate],
  );
  const shiftColorsByUser = useMemo(() => {
    const userIds = [
      ...new Set(
        (schedules.data ?? [])
          .filter((shift) => shift.branchId === activeBranchId)
          .map((shift) => shift.userId),
      ),
    ].sort((first, second) => first - second);
    return new Map(
      userIds.map((userId, index) => [
        userId,
        shiftColors[index % shiftColors.length],
      ]),
    );
  }, [activeBranchId, schedules.data]);
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
  };
  const editEmployee = async (employee: (typeof employees)[number]) => {
    setEditingEmployeeId(employee.id);
    setNewEmployeeName(employee.name);
    setNewEmployeeRole(
      employee.role === 'branch_manager' ? 'branch_manager' : 'cashier',
    );
    setNewEmployeeBranchId(String(employee.branchId ?? activeBranchId ?? ''));
    setDefaultStartsAt(employee.defaultStartsAt?.slice(0, 5) || '08:00');
    setDefaultEndsAt(employee.defaultEndsAt?.slice(0, 5) || '17:00');
    setDefaultSecondStartsAt(employee.defaultSecondStartsAt?.slice(0, 5) || '');
    setDefaultSecondEndsAt(employee.defaultSecondEndsAt?.slice(0, 5) || '');
    setIsEmployeeDrawerOpen(true);
  };
  const removeEmployee = async (employee: (typeof employees)[number]) => {
    await deleteEmployee(employee.id);
    setPendingDeleteEmployeeId(null);
    void refetch();
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
        <Box>
          <Typography
            sx={{
              color: '#201914',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            ตารางงานพนักงาน
          </Typography>
          <Typography
            sx={{
              color: 'text.secondary',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 14,
            }}
          >
            ดูและวางแผนตารางกะของพนักงานในรูปแบบปฏิทิน
          </Typography>
        </Box>
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
              if (confirmAutoSchedule) {
                setConfirmAutoSchedule(false);
                generate.mutate();
              } else setConfirmAutoSchedule(true);
            }}
            disabled={
              pageLoading ||
              generate.isPending ||
              activeBranchId === null ||
              Boolean(loadError)
            }
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
            <Button
              variant="outlined"
              size="small"
              onClick={() => setConfirmAutoSchedule(false)}
            >
              ยกเลิก
            </Button>
          ) : null}
          <Button
            variant="contained"
            size="small"
            disabled={pageLoading || Boolean(loadError)}
            onClick={() => {
              setEditingEmployeeId(null);
              setNewEmployeeName('');
              setNewEmployeeRole('cashier');
              setNewEmployeeBranchId(String(activeBranchId ?? ''));
              setDefaultStartsAt('');
              setDefaultEndsAt('');
              setDefaultSecondStartsAt('');
              setDefaultSecondEndsAt('');
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
          minHeight: pageLoading ? { xs: 720, md: 760 } : undefined,
        }}
      >
        {pageLoading ? (
          <EmployeesSkeleton franchiseMode={franchiseMode} />
        ) : null}
        {!pageLoading ? (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'minmax(0, 2fr) minmax(0, 8fr)',
                },
                gap: 1.5,
                mb: 2,
                alignItems: 'stretch',
              }}
            >
              {!franchiseMode ? (
                <Card
                  variant="outlined"
                  sx={{ p: 2, borderRadius: '15px', borderColor: '#e8ddd5' }}
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
                  {franchiseMode ? 'พนักงานในแฟรนไชส์' : 'พนักงานประจำสาขา'}
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
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 1.5,
                            py: 1,
                            borderRadius: '10px',
                            bgcolor: '#fbf7f4',
                          }}
                        >
                          <Typography
                            sx={{ flex: 1, fontSize: 15, fontWeight: 600 }}
                          >
                            {employee.name}
                          </Typography>
                          <Typography
                            color="text.secondary"
                            sx={{ fontSize: 13 }}
                          >
                            {employee.role === 'branch_manager'
                              ? 'ผู้จัดการสาขา'
                              : 'แคชเชียร์'}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.75,
                              ml: 2,
                            }}
                          >
                            <Divider
                              orientation="vertical"
                              flexItem
                              sx={{ borderColor: '#d8cec7', mx: 0.5 }}
                            />
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => {
                                if (pendingDeleteEmployeeId === employee.id)
                                  setPendingDeleteEmployeeId(null);
                                else void editEmployee(employee);
                              }}
                              sx={{
                                minHeight: 34,
                                borderRadius: '10px',
                                bgcolor: '#5f4030',
                                color: '#fff',
                                boxShadow: 'none',
                                '&:hover': {
                                  bgcolor: '#3c2d24',
                                  boxShadow: 'none',
                                },
                              }}
                            >
                              {pendingDeleteEmployeeId === employee.id
                                ? 'ยกเลิก'
                                : 'แก้ไข'}
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              onClick={() => {
                                if (pendingDeleteEmployeeId === employee.id)
                                  void removeEmployee(employee);
                                else setPendingDeleteEmployeeId(employee.id);
                              }}
                              sx={{
                                minHeight: 34,
                                borderRadius: '10px',
                                boxShadow: 'none',
                                '&:hover': { boxShadow: 'none' },
                              }}
                            >
                              {pendingDeleteEmployeeId === employee.id
                                ? 'ยืนยัน'
                                : 'ลบ'}
                            </Button>
                          </Box>
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
                      fontFamily: 'Kanit, sans-serif',
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
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 1.5,
                            py: 1,
                            borderRadius: '10px',
                            bgcolor: '#fbf7f4',
                          }}
                        >
                          <Typography
                            sx={{ flex: 1, fontSize: 15, fontWeight: 600 }}
                          >
                            {employee.name}
                          </Typography>
                          <Typography
                            color="text.secondary"
                            sx={{ fontSize: 13 }}
                          >
                            {employee.role === 'branch_manager'
                              ? 'ผู้จัดการสาขา'
                              : 'แคชเชียร์'}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.75,
                              ml: 2,
                            }}
                          >
                            <Divider
                              orientation="vertical"
                              flexItem
                              sx={{ borderColor: '#d8cec7', mx: 0.5 }}
                            />
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => {
                                if (pendingDeleteEmployeeId === employee.id)
                                  setPendingDeleteEmployeeId(null);
                                else void editEmployee(employee);
                              }}
                              sx={{
                                minHeight: 34,
                                borderRadius: '10px',
                                bgcolor: '#5f4030',
                                color: '#fff',
                                boxShadow: 'none',
                                '&:hover': {
                                  bgcolor: '#3c2d24',
                                  boxShadow: 'none',
                                },
                              }}
                            >
                              {pendingDeleteEmployeeId === employee.id
                                ? 'ยกเลิก'
                                : 'แก้ไข'}
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              onClick={() => {
                                if (pendingDeleteEmployeeId === employee.id)
                                  void removeEmployee(employee);
                                else setPendingDeleteEmployeeId(employee.id);
                              }}
                              sx={{
                                minHeight: 34,
                                borderRadius: '10px',
                                boxShadow: 'none',
                                '&:hover': { boxShadow: 'none' },
                              }}
                            >
                              {pendingDeleteEmployeeId === employee.id
                                ? 'ยืนยัน'
                                : 'ลบ'}
                            </Button>
                          </Box>
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
                <Typography
                  color="text.secondary"
                  sx={{ fontSize: 14, mr: 0.5 }}
                >
                  แสดงตารางของสาขา
                </Typography>
                {workspaceBranches.map((branch) => (
                  <Button
                    key={branch.id}
                    size="small"
                    variant={
                      activeBranchId === branch.id ? 'contained' : 'outlined'
                    }
                    onClick={() => setSelectedBranchId(branch.id)}
                  >
                    {branch.name}
                  </Button>
                ))}
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
                    data-export-pdf-control
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      exportDailyReportAsPdf({
                        title: 'รายงานตารางงานพนักงาน',
                        period: thaiMonth.format(month),
                        branchName: activeBranch?.name,
                        days: dailyScheduleReport,
                      })
                    }
                  >
                    ส่งออก PDF
                  </Button>
                </Box>
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
                      const visibleShifts = holiday
                        ? shifts.filter((shift) => isWorkingShift(shift.status))
                        : shifts;
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
                          ) : isCurrentMonth &&
                            shifts.length === 0 &&
                            !holiday ? (
                            <Typography
                              sx={{
                                mt: 2.5,
                                color: '#a89285',
                                fontSize: 11,
                                lineHeight: 1.35,
                              }}
                            >
                              ยังไม่มีตารางกะ
                            </Typography>
                          ) : null}
                          {!loadError &&
                            visibleShifts.map((shift) => (
                              <Box
                                key={shift.id}
                                component="button"
                                type="button"
                                draggable={isWorkingShift(shift.status)}
                                onClick={() => openShiftEditor(shift)}
                                onDragStart={() => setDraggedShiftId(shift.id)}
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
                                  fontFamily: 'Kanit, sans-serif',
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
                                    : leaveLabels[shift.status]}
                                </Box>
                              </Box>
                            ))}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
            </Card>
          </>
        ) : null}
      </Box>
      <Drawer
        anchor="bottom"
        open={Boolean(selectedShift)}
        onClose={() => setSelectedShift(null)}
        transitionDuration={{ enter: 360, exit: 280 }}
        sx={{ zIndex: 1300 }}
        slotProps={{
          paper: {
            sx: {
              left: { md: '280px' },
              width: { md: 'calc(100% - 304px)' },
              height: { xs: '82vh', sm: 'min(82vh, 620px)' },
              overflow: 'hidden',
              borderRadius: '24px 24px 0 0',
              bgcolor: '#fffaf7',
              boxShadow: '0 -12px 32px rgba(50, 35, 25, .18)',
            },
          },
        }}
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
          <Box
            sx={{
              width: 44,
              height: 5,
              mx: 'auto',
              mb: 2.5,
              borderRadius: 99,
              bgcolor: '#d8c8bd',
            }}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography
                sx={{
                  color: '#201914',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                จัดการกะงาน
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                {selectedShift?.name}
              </Typography>
            </Box>
            <Button
              aria-label="ปิด"
              onClick={() => setSelectedShift(null)}
              sx={{
                minWidth: 40,
                width: 40,
                height: 40,
                p: 0,
                borderRadius: '12px',
                bgcolor: '#f7eee8',
                color: '#5f4b3d',
                '&:hover': { bgcolor: '#f1e4da' },
              }}
            >
              <XIcon size={20} />
            </Button>
          </Box>
          <Divider
            sx={{
              mt: 2.25,
              mb: 0,
              mx: { xs: -2.5, sm: -4 },
              borderColor: '#e8ddd5',
            }}
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
              <TextField
                label="ย้ายไปวันที่"
                type="date"
                value={editDate}
                onChange={(event) => setEditDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
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
              {updateShift.error ? (
                <Typography
                  color="error"
                  sx={{ fontSize: 13, gridColumn: '1 / -1' }}
                >
                  {updateShift.error.message}
                </Typography>
              ) : null}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 1.25,
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
              </Box>
            </Box>
          </Box>
        </Box>
      </Drawer>
      <Drawer
        anchor="bottom"
        open={isEmployeeDrawerOpen}
        onClose={() => setIsEmployeeDrawerOpen(false)}
        transitionDuration={{ enter: 360, exit: 280 }}
        sx={{ zIndex: 1300 }}
        slotProps={{
          paper: {
            sx: {
              left: { md: '280px' },
              width: { md: 'calc(100% - 304px)' },
              height: { xs: '82vh', sm: 'min(82vh, 720px)' },
              overflow: 'hidden',
              borderRadius: '24px 24px 0 0',
              bgcolor: '#fffaf7',
              boxShadow: '0 -12px 32px rgba(50, 35, 25, .18)',
            },
          },
        }}
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
          <Box
            sx={{
              width: 44,
              height: 5,
              mx: 'auto',
              mb: 2.5,
              borderRadius: 99,
              bgcolor: '#d8c8bd',
            }}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography
                sx={{
                  color: '#201914',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                {editingEmployeeId !== null ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน'}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                สร้างบัญชีเพื่อเข้าสู่ระบบและจัดตารางกะ
              </Typography>
            </Box>
            <Button
              aria-label="ปิด"
              onClick={() => setIsEmployeeDrawerOpen(false)}
              sx={{
                minWidth: 40,
                width: 40,
                height: 40,
                p: 0,
                borderRadius: '12px',
                bgcolor: '#f7eee8',
                color: '#5f4b3d',
              }}
            >
              <XIcon size={20} />
            </Button>
          </Box>
          <Divider
            sx={{
              mt: 2.25,
              mb: 0,
              mx: { xs: -2.5, sm: -4 },
              borderColor: '#e8ddd5',
            }}
          />
          <Box
            sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pt: 2.25, pr: 0.5 }}
          >
            <Box
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                if (
                  !defaultStartsAt ||
                  !defaultEndsAt ||
                  defaultStartsAt === '00:00' ||
                  defaultEndsAt === '00:00' ||
                  (editingEmployeeId === null &&
                    (!defaultSecondStartsAt ||
                      !defaultSecondEndsAt ||
                      defaultSecondStartsAt === '00:00' ||
                      defaultSecondEndsAt === '00:00'))
                ) {
                  window.alert(
                    'กรุณาระบุเวลาเข้างานและเวลาออกงานให้ครบทั้ง 2 กะก่อนบันทึก',
                  );
                  return;
                }
                if (editingEmployeeId !== null) {
                  const updatedEmployeeId = editingEmployeeId;
                  const updatedName = newEmployeeName.trim();
                  const updatedStartsAt = defaultStartsAt;
                  const updatedEndsAt = defaultEndsAt;
                  const updatedSecondStartsAt = defaultSecondStartsAt;
                  const updatedSecondEndsAt = defaultSecondEndsAt;
                  void updateEmployee(editingEmployeeId, {
                    name: updatedName,
                    role: newEmployeeRole,
                    branchId: Number(newEmployeeBranchId),
                    defaultStartsAt: updatedStartsAt,
                    defaultEndsAt: updatedEndsAt,
                    defaultSecondStartsAt: updatedSecondStartsAt,
                    defaultSecondEndsAt: updatedSecondEndsAt,
                  }).then(() => {
                    queryClient.setQueryData<Employee[]>(
                      ['employees'],
                      (current) =>
                        current?.map((employee) =>
                          employee.id === updatedEmployeeId
                            ? {
                                ...employee,
                                name: updatedName,
                                role: newEmployeeRole,
                                branchId: Number(newEmployeeBranchId),
                                defaultStartsAt: updatedStartsAt,
                                defaultEndsAt: updatedEndsAt,
                                defaultSecondStartsAt: updatedSecondStartsAt,
                                defaultSecondEndsAt: updatedSecondEndsAt,
                              }
                            : employee,
                        ),
                    );
                    queryClient.setQueryData<StaffShift[]>(
                      ['staff-schedules', monthKey],
                      (current) =>
                        current?.map((shift) =>
                          shift.userId !== updatedEmployeeId
                            ? shift
                            : {
                                ...shift,
                                name: updatedName,
                                startsAt: usesFirstShift(
                                  shift.date,
                                  shift.userId,
                                )
                                  ? updatedStartsAt
                                  : updatedSecondStartsAt || updatedStartsAt,
                                endsAt: usesFirstShift(shift.date, shift.userId)
                                  ? updatedEndsAt
                                  : updatedSecondEndsAt || updatedEndsAt,
                              },
                        ),
                    );
                    setEditingEmployeeId(null);
                    setIsEmployeeDrawerOpen(false);
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
              {!franchiseMode && (
                <FormControl required>
                  <InputLabel id="new-employee-branch-label">สาขา</InputLabel>
                  <Select
                    labelId="new-employee-branch-label"
                    label="สาขา"
                    value={newEmployeeBranchId}
                    onChange={(event) =>
                      setNewEmployeeBranchId(event.target.value)
                    }
                  >
                    {workspaceBranches.map((branch) => (
                      <MenuItem key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <FormControl required>
                <InputLabel id="new-employee-role-label">ตำแหน่ง</InputLabel>
                <Select
                  labelId="new-employee-role-label"
                  label="ตำแหน่ง"
                  value={newEmployeeRole}
                  onChange={(event) =>
                    setNewEmployeeRole(
                      event.target.value as 'branch_manager' | 'cashier',
                    )
                  }
                >
                  <MenuItem value="cashier">แคชเชียร์</MenuItem>
                  <MenuItem value="branch_manager">ผู้จัดการสาขา</MenuItem>
                </Select>
              </FormControl>
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
                  เวลาทำงานประจำ · กะที่ 1
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
                    onChange={(event) => setDefaultStartsAt(event.target.value)}
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
                    onChange={(event) => setDefaultEndsAt(event.target.value)}
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
                <Typography
                  sx={{
                    color: '#3c2d24',
                    fontSize: 13,
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  กะที่ 2 {editingEmployeeId !== null ? '(ถ้ามี)' : '*'}
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
                    required={editingEmployeeId === null}
                    fullWidth
                    label="เวลาเข้างาน กะที่ 2"
                    type="time"
                    value={defaultSecondStartsAt}
                    onChange={(event) =>
                      setDefaultSecondStartsAt(event.target.value)
                    }
                    onMouseEnter={() => setHoveredTimeField('secondStart')}
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
                      animated={hoveredTimeField === 'secondStart'}
                    />
                  </Box>
                </Box>
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <TextField
                    required={editingEmployeeId === null}
                    fullWidth
                    label="เวลาออกงาน กะที่ 2"
                    type="time"
                    value={defaultSecondEndsAt}
                    onChange={(event) =>
                      setDefaultSecondEndsAt(event.target.value)
                    }
                    onMouseEnter={() => setHoveredTimeField('secondEnd')}
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
                      animated={hoveredTimeField === 'secondEnd'}
                    />
                  </Box>
                </Box>
              </Box>
              {createEmployeeMutation.error ? (
                <Typography
                  color="error"
                  sx={{ fontSize: 13, gridColumn: '1 / -1' }}
                >
                  {createEmployeeMutation.error.message}
                </Typography>
              ) : null}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 1.25,
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
              </Box>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </DashboardMain>
  );
}
