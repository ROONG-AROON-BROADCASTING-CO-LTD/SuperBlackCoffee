import { Stack, Typography } from '@mui/material';
import { AttendanceHistoryList } from '../components/AttendanceHistoryList';
import type { AttendanceHistoryItem } from '../api/attendance';

export function AttendanceWorkHistoryPage({
  history,
}: {
  history: AttendanceHistoryItem[];
}) {
  return (
    <Stack spacing={2.5}>
      <Typography variant="h4">ประวัติการทำงาน</Typography>
      <AttendanceHistoryList history={history} />
    </Stack>
  );
}
