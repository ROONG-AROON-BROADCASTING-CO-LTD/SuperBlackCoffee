import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  BadgeIcon,
  ClockIcon,
  CoffeeIcon,
  MapPinHouseIcon,
} from '@stackbuild/ui';
import { attendanceTodayLabel } from '../hooks/useAttendanceClock';

export function AttendanceAction({
  checkedIn,
  onAction,
}: {
  checkedIn: boolean;
  onAction: () => void;
}) {
  return (
    <Button
      variant="contained"
      onClick={onAction}
      startIcon={<CoffeeIcon size={20} />}
      sx={{
        minHeight: 62,
        fontSize: 18,
        bgcolor: '#805637',
        '&:hover': { bgcolor: '#664329' },
      }}
    >
      {checkedIn ? 'เช็กเอาต์เลิกงาน' : 'เช็กอินเข้างาน'}
    </Button>
  );
}

export function TimeCard({ clock }: { clock: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.75,
        textAlign: 'center',
        borderColor: '#e2d3c7',
        borderRadius: 2.25,
        bgcolor: '#fffdfb',
      }}
    >
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ justifyContent: 'center', alignItems: 'center' }}
      >
        <ClockIcon size={20} />
        <Typography sx={{ fontWeight: 600 }}>เวลาปัจจุบัน</Typography>
      </Stack>
      <Typography
        sx={{
          mt: 1,
          fontSize: 'clamp(40px, 5vw, 62px)',
          fontWeight: 700,
          color: '#805637',
          lineHeight: 1.1,
        }}
      >
        {clock}
      </Typography>
      <Typography color="text.secondary">{attendanceTodayLabel()}</Typography>
    </Paper>
  );
}

export function TodayCard({
  checkedIn,
  checkInAt,
  staff,
}: {
  checkedIn: boolean;
  checkInAt: string | null;
  staff: { role: string; branchName: string; startsAt: string; endsAt: string };
}) {
  const formatTime = (value: string) => value.slice(0, 5);
  const checkInLabel = checkInAt
    ? new Intl.DateTimeFormat('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(checkInAt))
    : null;
  return (
    <Paper
      variant="outlined"
      sx={{
        gridRow: { md: 'span 2' },
        p: 2.75,
        display: 'grid',
        alignContent: 'start',
        gap: 2,
        borderColor: '#e2d3c7',
        borderRadius: 2.25,
        bgcolor: '#fffdfb',
      }}
    >
      <Typography sx={{ fontWeight: 600 }}>สถานะวันนี้</Typography>
      <Chip
        icon={<BadgeIcon size={20} />}
        label={
          checkedIn && checkInLabel
            ? `เช็กอินแล้ว เวลา ${checkInLabel} น.`
            : 'ยังไม่ได้เช็กอิน'
        }
        color={checkedIn ? 'success' : 'default'}
        sx={{ height: 40, justifyContent: 'center', fontWeight: 600 }}
      />
      <Divider />
      <Stack
        spacing={0.75}
        sx={{
          '& .MuiTypography-root': {
            display: 'flex',
            alignItems: 'center',
            gap: 1.1,
          },
          '& svg': { color: '#805637', fontSize: 19 },
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
