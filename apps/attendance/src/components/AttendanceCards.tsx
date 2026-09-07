import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import {
  ClockIcon,
  CoffeeIcon,
  MapPinHouseIcon,
  TimerIcon,
  type TimerIconHandle,
} from '@stackbuild/ui';
import { useRef } from 'react';
import { attendanceTodayLabel } from '../hooks/useAttendanceClock';

export function AttendanceAction({
  checkedIn,
  onAction,
  disabled = false,
  disabledLabel,
}: {
  checkedIn: boolean;
  onAction: () => void;
  disabled?: boolean;
  disabledLabel: string;
}) {
  const timerIconRef = useRef<TimerIconHandle>(null);
  const handleAction = () => {
    timerIconRef.current?.startAnimation();
    window.setTimeout(() => timerIconRef.current?.stopAnimation(), 750);
    onAction();
  };

  return (
    <Button
      variant="contained"
      onClick={handleAction}
      disabled={disabled}
      onMouseEnter={() => timerIconRef.current?.startAnimation()}
      onMouseLeave={() => timerIconRef.current?.stopAnimation()}
      startIcon={
        <TimerIcon ref={timerIconRef} size={24} style={{ display: 'flex' }} />
      }
      sx={{
        width: '100%',
        mt: 0,
        height: 64,
        minHeight: 64,
        justifyContent: 'center',
        fontSize: '18px !important',
        fontWeight: '500 !important',
        bgcolor: checkedIn ? '#d92d2d' : '#805637',
        '&:hover': { bgcolor: checkedIn ? '#b42318' : '#664329' },
        '& .MuiButton-startIcon': { mr: 1.25 },
        '&.Mui-disabled': { bgcolor: '#e6e2df', color: '#a6a09d' },
      }}
    >
      {disabled
        ? disabledLabel
        : checkedIn
          ? 'เช็กเอาต์เลิกงาน'
          : 'เช็กอินเข้างาน'}
    </Button>
  );
}

export function TimeCard({
  clock,
  checkedIn,
  onAction,
  disabled,
  actionHint,
  actionDisabledLabel,
}: {
  clock: string;
  checkedIn: boolean;
  onAction: () => void;
  disabled: boolean;
  actionHint: string;
  actionDisabledLabel: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2.5, sm: 3.5 },
        height: '100%',
        minHeight: 0,
        textAlign: 'center',
        borderColor: '#e8ddd5',
        borderRadius: '15px',
        bgcolor: '#fffdfb',
        display: 'flex',
        '@media (max-width:899.95px) and (max-height:760px)': {
          p: 1.5,
        },
      }}
    >
      <Stack sx={{ width: '100%', height: '100%' }}>
        <Stack spacing={1.25} sx={{ flex: 1, justifyContent: 'center' }}>
          <Typography
            sx={{
              fontSize: {
                xs: 'clamp(52px, 14vw, 68px)',
                md: 'clamp(48px, 5vw, 62px)',
              },
              fontWeight: 700,
              color: '#805637',
              lineHeight: 1.1,
              '@media (max-width:899.95px) and (max-height:760px)': {
                fontSize: 'clamp(42px, 12vw, 52px)',
              },
            }}
          >
            {clock}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: { xs: 1.5, md: 0.5 } }}>
            {attendanceTodayLabel()}
          </Typography>
        </Stack>
        <Stack spacing={1}>
          <AttendanceAction
            checkedIn={checkedIn}
            onAction={onAction}
            disabled={disabled}
            disabledLabel={actionDisabledLabel}
          />
          {disabled && actionHint ? (
            <Typography color="error.main">{actionHint}</Typography>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}

export function TodayCard({
  checkedIn,
  checkInAt,
  checkOutAt,
  staff,
}: {
  checkedIn: boolean;
  checkInAt: string | null;
  checkOutAt: string | null;
  staff: { role: string; branchName: string; startsAt: string; endsAt: string };
}) {
  const formatTime = (value: string) => value.slice(0, 5);
  const checkInLabel = checkInAt
    ? new Intl.DateTimeFormat('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(checkInAt))
    : null;
  const attendanceCompleted = Boolean(checkInAt && checkOutAt);
  const hasPositiveStatus = checkedIn || attendanceCompleted;
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2.5, sm: 3.5 },
        height: '100%',
        minHeight: 0,
        display: 'grid',
        alignContent: 'start',
        gap: { xs: 1.75, md: 2.5 },
        overflow: 'hidden',
        borderColor: '#e8ddd5',
        borderRadius: '15px',
        bgcolor: '#fffdfb',
        '@media (max-width:899.95px) and (max-height:760px)': {
          p: 1.5,
          gap: 1,
        },
      }}
    >
      <Typography sx={{ fontWeight: 600 }}>สถานะวันนี้</Typography>
      <Chip
        component="div"
        label={
          attendanceCompleted
            ? 'วันนี้เช็กอินและเช็กเอาต์ครบแล้ว'
            : checkedIn && checkInLabel
              ? `เช็กอินแล้ว เวลา ${checkInLabel} น.`
              : 'ยังไม่ได้เช็กอิน'
        }
        color={hasPositiveStatus ? 'success' : 'default'}
        variant="outlined"
        sx={{
          height: { xs: 64, md: 40 },
          justifyContent: 'center',
          fontSize: { xs: '24px', md: '14px' },
          fontWeight: { xs: 500, md: 600 },
          cursor: 'default',
          pointerEvents: 'none',
          boxShadow: 'none',
          borderWidth: 1.5,
          borderStyle: 'dashed',
          bgcolor: hasPositiveStatus ? '#eaf6ec' : '#f2f0ee',
          color: hasPositiveStatus ? '#1f6f31' : 'text.secondary',
          '@media (max-width:899.95px) and (max-height:760px)': {
            height: 44,
            fontSize: 20,
          },
        }}
      />
      <Stack
        spacing={{ xs: 0.75, md: 0.75 }}
        sx={{
          '& .MuiTypography-root': {
            display: 'flex',
            alignItems: 'center',
            gap: 1.1,
            fontSize: { xs: 14, md: 16 },
            lineHeight: { xs: 1.35, md: 1.5 },
          },
          '& svg': {
            color: '#805637',
            width: { xs: 22, md: 19 },
            height: { xs: 22, md: 19 },
          },
          '@media (max-width:899.95px) and (max-height:760px)': {
            '& .MuiTypography-root': {
              gap: 0.75,
              fontSize: 12,
              lineHeight: 1.25,
            },
            '& svg': {
              width: 18,
              height: 18,
            },
          },
        }}
      >
        <Typography>
          <ClockIcon size={19} /> กะงาน {formatTime(staff.startsAt)} -{' '}
          {formatTime(staff.endsAt)} น.
        </Typography>
        <Typography>
          <CoffeeIcon size={19} /> ตำแหน่ง{' '}
          {staff.role === 'branch_manager' ? 'ผู้จัดการสาขา' : 'บาริสต้า'}
        </Typography>
        <Typography>
          <MapPinHouseIcon size={19} /> สาขา{staff.branchName}
        </Typography>
      </Stack>
    </Paper>
  );
}
