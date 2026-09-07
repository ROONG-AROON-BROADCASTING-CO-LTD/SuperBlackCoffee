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
  attendanceActionDisabledLabel,
}: {
  checkedIn: boolean;
  checkInAt: string | null;
  staff: AttendanceSession['user'];
  clock: string;
  onAction: () => void;
  attendanceActionDisabled: boolean;
  attendanceActionHint: string;
  attendanceActionDisabledLabel: string;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
        gridTemplateRows: {
          xs: 'minmax(360px, 7fr) minmax(244px, 3fr)',
          md: 'auto',
        },
        height: {
          xs: 'calc(100dvh - 72px - var(--attendance-mobile-nav-height, 82px) - env(safe-area-inset-bottom) - 48px)',
          md: 'auto',
        },
        gap: { xs: 1.5, md: 2.5 },
        overflow: 'visible',
        '@media (max-width:899.95px) and (max-height:760px)': {
          gridTemplateRows: 'minmax(230px, 7fr) minmax(150px, 3fr)',
        },
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
        actionDisabledLabel={attendanceActionDisabledLabel}
      />
      <TodayCard checkedIn={checkedIn} checkInAt={checkInAt} staff={staff} />
    </Box>
  );
}
