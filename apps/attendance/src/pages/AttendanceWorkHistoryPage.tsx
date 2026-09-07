import { Stack, Typography } from '@mui/material';
import { AttendanceHistoryList } from '../components/AttendanceHistoryList';
import type { AttendanceHistoryItem } from '../api/attendance';

export function AttendanceWorkHistoryPage({
  history,
}: {
  history: AttendanceHistoryItem[];
}) {
  return (
    <Stack spacing={{ xs: 0, md: 2.5 }}>
      <Typography
        sx={{
          display: { xs: 'none', md: 'block' },
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1.2,
        }}
      >
        ประวัติการทำงาน
      </Typography>
      <AttendanceHistoryList history={history} />
    </Stack>
  );
}
