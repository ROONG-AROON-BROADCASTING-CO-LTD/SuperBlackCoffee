import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { ReceiptTextIcon } from '@stackbuild/ui';
import {
  AttendanceAction,
  TimeCard,
  TodayCard,
} from '../components/AttendanceCards';
import { AttendanceHistoryList } from '../components/AttendanceHistoryList';
import type { StaffPage } from '../types/attendance';
import type {
  AttendanceHistoryItem,
  AttendanceSession,
} from '../api/attendance';

type AttendanceDashboardPageProps = {
  username: string;
  staff: AttendanceSession['user'];
  checkedIn: boolean;
  checkInAt: string | null;
  clock: string;
  onAction: () => void;
  onPage: (page: StaffPage) => void;
  history: AttendanceHistoryItem[];
};

export function AttendanceDashboardPage({
  username,
  staff,
  checkedIn,
  checkInAt,
  clock,
  onAction,
  onPage,
  history,
}: AttendanceDashboardPageProps) {
  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4">ภาพรวม</Typography>
          <Typography color="text.secondary">
            สวัสดี {username} · วันนี้พร้อมเริ่มงานแล้ว
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ReceiptTextIcon size={20} />}
          onClick={() => onPage('leave')}
        >
          ส่งคำขอลา
        </Button>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2.25,
        }}
      >
        <TimeCard clock={clock} />
        <Paper
          variant="outlined"
          sx={{
            p: 2.75,
            display: 'grid',
            gap: 2,
            alignContent: 'center',
            borderColor: '#e2d3c7',
            borderRadius: 2.25,
            bgcolor: '#fffdfb',
          }}
        >
          <Typography sx={{ fontWeight: 600 }}>บันทึกเวลาทำงาน</Typography>
          <AttendanceAction checkedIn={checkedIn} onAction={onAction} />
          <Typography color="text.secondary">
            {checkedIn
              ? 'อย่าลืมเช็กเอาต์เมื่อเลิกงาน'
              : 'กรุณาเช็กอินเมื่อมาถึงที่ทำงาน'}
          </Typography>
        </Paper>
        <TodayCard checkedIn={checkedIn} checkInAt={checkInAt} staff={staff} />
      </Box>
      <AttendanceHistoryList compact history={history} />
    </Stack>
  );
}
