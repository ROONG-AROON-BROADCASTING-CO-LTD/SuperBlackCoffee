import { Stack, Typography } from '@mui/material';
import {
  AttendanceAction,
  TimeCard,
  TodayCard,
} from '../components/AttendanceCards';
import type { AttendanceSession } from '../api/attendance';

export function AttendanceCheckInPage({
  checkedIn,
  checkInAt,
  staff,
  clock,
  onAction,
}: {
  checkedIn: boolean;
  checkInAt: string | null;
  staff: AttendanceSession['user'];
  clock: string;
  onAction: () => void;
}) {
  return (
    <Stack spacing={2.5}>
      <Typography variant="h4">เช็กอิน / เช็กเอาต์</Typography>
      <TimeCard clock={clock} />
      <AttendanceAction checkedIn={checkedIn} onAction={onAction} />
      <TodayCard checkedIn={checkedIn} checkInAt={checkInAt} staff={staff} />
    </Stack>
  );
}
