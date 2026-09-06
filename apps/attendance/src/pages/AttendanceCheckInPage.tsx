import { Stack, Typography } from '@mui/material';
import {
  AttendanceAction,
  TimeCard,
  TodayCard,
} from '../components/AttendanceCards';

export function AttendanceCheckInPage({
  checkedIn,
  clock,
  onAction,
}: {
  checkedIn: boolean;
  clock: string;
  onAction: () => void;
}) {
  return (
    <Stack spacing={2.5}>
      <Typography variant="h4">เช็กอิน / เช็กเอาต์</Typography>
      <TimeCard clock={clock} />
      <AttendanceAction checkedIn={checkedIn} onAction={onAction} />
      <TodayCard checkedIn={checkedIn} />
    </Stack>
  );
}
