import { Stack, Typography } from '@mui/material';
import { AttendanceHistoryList } from '../components/AttendanceHistoryList';
import { MyLeaveRequests } from '../components/MyLeaveRequests';
import type { AttendanceHistoryItem } from '../api/attendance';

export function AttendanceWorkHistoryPage({
  history,
}: {
  history: AttendanceHistoryItem[];
}) {
  return (
    <Stack spacing={{ xs: 1.5, md: 2.5 }}>
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
      <MyLeaveRequests />
    </Stack>
  );
}
