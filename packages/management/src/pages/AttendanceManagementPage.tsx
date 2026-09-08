import { useMemo, useState } from 'react';
import { Box, Button, Card, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { DashboardMain } from '@stackbuild/ui';
import { listManagedAttendance } from '../api/attendance';
import { listBranches } from '../api/branches';
import { listPublicHolidays } from '../api/public-holidays';
import { listStaffSchedules } from '../api/staff-schedules';
import { DataLoadNotice } from '../components/DataLoadNotice';
import { AttendanceSkeleton } from '../components/skeletons/AttendanceSkeleton';
import {
  exportDailyReportAsPdf,
  type DailyPdfEntryTone,
  type DailyPdfSection,
} from '../utils/exportCalendarPdf';

const timeFormatter = new Intl.DateTimeFormat('th-TH', {
  hour: '2-digit',
  minute: '2-digit',
});
const currentMonth = () => new Date().toISOString().slice(0, 7);
const displayTime = (value: string | null) =>
  value ? timeFormatter.format(new Date(value)) : '-';
const thaiWeekday = [
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
  'วันอาทิตย์',
];
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

function getCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
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

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const bangkokTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function checkInIsLate(checkInAt: string, startsAt: string) {
  return (
    toMinutes(bangkokTime.format(new Date(checkInAt))) >
    toMinutes(startsAt) + 10
  );
}

export function AttendanceManagementPage({
  franchiseMode = false,
}: { franchiseMode?: boolean } = {}) {
  const [month, setMonth] = useState(currentMonth);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const calendarMonth = useMemo(
    () => new Date(`${month}-01T00:00:00`),
    [month],
  );
  const calendarDays = useMemo(
    () => getCalendarDays(calendarMonth),
    [calendarMonth],
  );
  const attendance = useQuery({
    queryKey: ['attendance-management', month],
    queryFn: () => listManagedAttendance(month),
  });
  const schedules = useQuery({
    queryKey: ['staff-schedules', month],
    queryFn: () => listStaffSchedules(month),
  });
  const holidays = useQuery({
    queryKey: ['public-holidays', month],
    queryFn: () => listPublicHolidays(month),
  });
  const branches = useQuery({ queryKey: ['branches'], queryFn: listBranches });
  const rows = attendance.data ?? [];
  const workspaceBranches = franchiseMode
    ? (branches.data ?? [])
    : (branches.data ?? []).filter((branch) => !branch.franchiseeId);
  const activeBranchId = franchiseMode
    ? (workspaceBranches[0]?.id ?? null)
    : (selectedBranchId ?? workspaceBranches[0]?.id ?? null);
  const activeBranch = workspaceBranches.find(
    (branch) => branch.id === activeBranchId,
  );
  const workingSchedulesByDate = useMemo(() => {
    const result = new Map<string, NonNullable<typeof schedules.data>>();
    for (const schedule of schedules.data ?? []) {
      if (schedule.branchId !== activeBranchId) continue;
      if (
        schedule.status !== 'scheduled' &&
        schedule.status !== 'compensatory_work'
      )
        continue;
      result.set(schedule.date, [
        ...(result.get(schedule.date) ?? []),
        schedule,
      ]);
    }
    return result;
  }, [activeBranchId, schedules.data]);
  const attendanceByShift = useMemo(() => {
    const result = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      result.set(`${row.date}:${row.userId}`, row);
    }
    return result;
  }, [rows]);
  const holidaysByDate = useMemo(
    () =>
      new Map((holidays.data ?? []).map((holiday) => [holiday.date, holiday])),
    [holidays.data],
  );
  const dailyAttendanceReport = useMemo<DailyPdfSection[]>(
    () =>
      calendarDays
        .filter((day) => day.getMonth() === calendarMonth.getMonth())
        .map((day) => {
          const key = dateKey(day);
          const holiday = holidaysByDate.get(key);
          return {
            date: thaiDate.format(day),
            holidayName: holiday?.name,
            entries: (workingSchedulesByDate.get(key) ?? []).map((shift) => {
              const record = attendanceByShift.get(
                `${shift.date}:${shift.userId}`,
              );
              const status = !record?.checkInAt
                ? 'pending'
                : checkInIsLate(record.checkInAt, shift.startsAt)
                  ? 'late'
                  : 'on-time';
              const tone: DailyPdfEntryTone =
                status === 'on-time'
                  ? 'success'
                  : status === 'late'
                    ? 'danger'
                    : 'neutral';
              return {
                name: shift.name,
                detail: record?.checkInAt
                  ? `เข้า ${displayTime(record.checkInAt)} · ออก ${displayTime(record.checkOutAt)}`
                  : `ยังไม่เช็กอิน · กะ ${shift.startsAt.slice(0, 5)} - ${shift.endsAt.slice(0, 5)}`,
                tone,
              };
            }),
          };
        })
        .filter((day) => day.entries.length > 0 || day.holidayName),
    [
      attendanceByShift,
      calendarDays,
      calendarMonth,
      holidaysByDate,
      workingSchedulesByDate,
    ],
  );
  const pageLoading =
    attendance.isLoading ||
    schedules.isLoading ||
    holidays.isLoading ||
    branches.isLoading;
  const today = new Date();
  const changeMonth = (offset: number) => {
    setMonth((current) => {
      const date = new Date(`${current}-01T00:00:00`);
      date.setMonth(date.getMonth() + offset);
      return monthKey(date);
    });
  };

  if (pageLoading) {
    return (
      <DashboardMain>
        <AttendanceSkeleton
          franchiseMode={franchiseMode}
          calendarWeeks={calendarDays.length / 7}
          onPreviousMonth={() => changeMonth(-1)}
          onCurrentMonth={() => setMonth(currentMonth())}
          onNextMonth={() => changeMonth(1)}
        />
      </DashboardMain>
    );
  }

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
            ลงเวลาพนักงาน
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ fontFamily: 'Kanit, sans-serif', fontSize: 14 }}
          >
            {franchiseMode
              ? 'ข้อมูลพนักงานในแฟรนไชส์ของคุณเท่านั้น'
              : 'ข้อมูลพนักงานบริษัท Super Black Coffee เท่านั้น'}
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
            onClick={() => setMonth(currentMonth())}
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
        </Box>
      </Box>
      {!franchiseMode ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            mb: 2,
          }}
        >
          <Typography color="text.secondary" sx={{ fontSize: 14, mr: 0.5 }}>
            แสดงตารางของสาขา
          </Typography>
          {workspaceBranches.map((branch) => (
            <Button
              key={branch.id}
              size="small"
              variant={activeBranchId === branch.id ? 'contained' : 'outlined'}
              onClick={() => setSelectedBranchId(branch.id)}
            >
              {branch.name}
            </Button>
          ))}
        </Box>
      ) : null}
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
              {!franchiseMode ? (
                <Box>
                  <Typography
                    sx={{ color: '#8b7161', fontSize: 12, fontWeight: 700 }}
                  >
                    สาขา
                  </Typography>
                  <Typography
                    sx={{ color: '#201914', fontSize: 21, fontWeight: 800 }}
                  >
                    {activeBranch?.name ?? 'ยังไม่พบสาขา'}
                  </Typography>
                </Box>
              ) : null}
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
                  {thaiMonth.format(calendarMonth)}
                </Typography>
              </Box>
            </Box>
            <Button
              data-export-pdf-control
              size="small"
              variant="outlined"
              onClick={() =>
                exportDailyReportAsPdf({
                  title: 'รายงานลงเวลาพนักงาน',
                  period: thaiMonth.format(calendarMonth),
                  branchName: activeBranch?.name,
                  days: dailyAttendanceReport,
                })
              }
            >
              ส่งออก PDF
            </Button>
          </Box>
        </Box>
        {attendance.error ||
        schedules.error ||
        holidays.error ||
        branches.error ? (
          <Box sx={{ p: 2.5 }}>
            <DataLoadNotice />
          </Box>
        ) : (
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
                  const currentMonth =
                    day.getMonth() === calendarMonth.getMonth();
                  const shifts = workingSchedulesByDate.get(dateKey(day)) ?? [];
                  const holiday = holidaysByDate.get(dateKey(day));
                  return (
                    <Box
                      key={day.toISOString()}
                      sx={{
                        minHeight: 122,
                        p: 1.25,
                        borderRight: '1px solid #eee4dd',
                        borderBottom: '1px solid #eee4dd',
                        bgcolor: !currentMonth
                          ? '#fbf8f6'
                          : holiday
                            ? '#fff8eb'
                            : '#fff',
                        opacity: currentMonth ? 1 : 0.5,
                        '&:nth-of-type(7n)': { borderRight: 0 },
                        '&:nth-last-of-type(-n + 7)': {
                          borderBottom: 0,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 26,
                          height: 26,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: '50%',
                          bgcolor: isSameDay(day, today)
                            ? '#3c2d24'
                            : 'transparent',
                          color: isSameDay(day, today) ? '#fff' : '#45342b',
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {day.getDate()}
                      </Box>
                      {holiday ? (
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
                      {currentMonth && shifts.length === 0 && !holiday ? (
                        <Typography
                          sx={{
                            mt: 2.5,
                            color: '#a89285',
                            fontSize: 11,
                            lineHeight: 1.35,
                          }}
                        >
                          ไม่มีพนักงานเข้ากะ
                        </Typography>
                      ) : null}
                      {shifts.map((shift) => {
                        const record = attendanceByShift.get(
                          `${shift.date}:${shift.userId}`,
                        );
                        const status = !record?.checkInAt
                          ? 'pending'
                          : checkInIsLate(record.checkInAt, shift.startsAt)
                            ? 'late'
                            : 'on-time';
                        const colors =
                          status === 'pending'
                            ? { background: '#ebe8e5', text: '#766f6a' }
                            : status === 'late'
                              ? { background: '#ffe4e4', text: '#b94136' }
                              : { background: '#dff4e7', text: '#256c45' };
                        return (
                          <Box
                            key={shift.id}
                            aria-label={`${shift.name} ${status === 'pending' ? 'ยังไม่เช็กอิน' : status === 'late' ? 'มาสาย' : 'ตรงเวลา'}`}
                            sx={{
                              mt: 0.75,
                              px: 0.65,
                              py: 0.5,
                              borderRadius: '6px',
                              bgcolor: colors.background,
                              color: colors.text,
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 11,
                              lineHeight: 1.25,
                            }}
                          >
                            <Typography
                              component="span"
                              sx={{
                                display: 'block',
                                mb: 0.75,
                                fontSize: 'inherit',
                                fontWeight: 700,
                              }}
                            >
                              {shift.name}
                            </Typography>
                            <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
                              {record?.checkInAt
                                ? `เข้า ${displayTime(record.checkInAt)} · ออก ${displayTime(record.checkOutAt)}`
                                : `กะ ${shift.startsAt.slice(0, 5)} - ${shift.endsAt.slice(0, 5)}`}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        )}
      </Card>
    </DashboardMain>
  );
}
