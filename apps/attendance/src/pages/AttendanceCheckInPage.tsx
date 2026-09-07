import { Box, Typography } from '@mui/material';
import { TimeCard, TodayCard } from '../components/AttendanceCards';
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
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
        gap: 2.5,
      }}
    >
      <Typography
        sx={{
          display: { xs: 'none', md: 'block' },
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1.2,
          gridColumn: { md: '1 / -1' },
        }}
      >
        เช็กอิน / เช็กเอาต์
      </Typography>
      <TimeCard
        clock={clock}
        checkedIn={checkedIn}
        onAction={onAction}
        disabled={attendanceActionDisabled}
        actionHint={attendanceActionHint}
      />
      <TodayCard checkedIn={checkedIn} checkInAt={checkInAt} staff={staff} />
    </Box>
  );
}
