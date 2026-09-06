import { Stack, Typography } from '@mui/material';
import { AttendanceHistoryList } from '../components/AttendanceHistoryList';

export function AttendanceWorkHistoryPage() {
  return (
    <Stack spacing={2.5}>
      <Typography variant="h4">ประวัติการทำงาน</Typography>
      <AttendanceHistoryList />
    </Stack>
  );
}
