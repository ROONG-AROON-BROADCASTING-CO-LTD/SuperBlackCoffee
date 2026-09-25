import { useState } from 'react';
import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { AttendanceHistoryList } from '../components/AttendanceHistoryList';
import { MyLeaveRequests } from '../components/MyLeaveRequests';
import type { AttendanceHistoryItem } from '../api/attendance';

export function AttendanceWorkHistoryPage({
  history,
}: {
  history: AttendanceHistoryItem[];
}) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave'>(
    'attendance',
  );

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
      <Box
        sx={{
          borderBottom: '1px solid #e8ddd5',
          bgcolor: '#fffdfb',
          borderRadius: '15px 15px 0 0',
          px: { xs: 1, sm: 2 },
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, value: 'attendance' | 'leave') => setActiveTab(value)}
          aria-label="ประวัติการทำงาน"
          variant="fullWidth"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
              fontWeight: 600,
              fontSize: 16,
            },
          }}
        >
          <Tab value="attendance" label="ลงเวลา" />
          <Tab value="leave" label="ใบลา" />
        </Tabs>
      </Box>
      <Box sx={{ mt: { xs: 1.5, md: 0 } }}>
        {activeTab === 'attendance' ? (
          <AttendanceHistoryList history={history} />
        ) : (
          <MyLeaveRequests />
        )}
      </Box>
    </Stack>
  );
}
