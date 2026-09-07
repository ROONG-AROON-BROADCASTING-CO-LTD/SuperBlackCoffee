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
  attendanceActionDisabled,
  attendanceActionHint,
}: {
  checkedIn: boolean;
  checkInAt: string | null;
  staff: AttendanceSession['user'];
  clock: string;
  onAction: () => void;
  attendanceActionDisabled: boolean;
  attendanceActionHint: string;
}) {
  return (
    <Stack spacing={2.5}>
      <Typography
        sx={{
          display: { xs: 'none', md: 'block' },
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1.2,
        }}
      >
        เช็กอิน / เช็กเอาต์
      </Typography>
      <TimeCard clock={clock} />
      <AttendanceAction
        checkedIn={checkedIn}
        onAction={onAction}
        disabled={attendanceActionDisabled}
      />
      {attendanceActionDisabled ? (
        <Typography color="error.main">{attendanceActionHint}</Typography>
      ) : null}
      <TodayCard checkedIn={checkedIn} checkInAt={checkInAt} staff={staff} />
    </Stack>
  );
}
