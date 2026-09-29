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
          bgcolor: '#fff',
          borderRadius: { xs: '14px 14px 0 0', md: '15px 15px 0 0' },
          px: { xs: 0.5, sm: 2 },
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, value: 'attendance' | 'leave') => setActiveTab(value)}
          aria-label="ประวัติการทำงาน"
          variant="fullWidth"
          sx={{
            minHeight: 54,
            '& .MuiTab-root': {
              minHeight: 54,
              color: 'rgba(23, 20, 17, .5)',
              fontWeight: 700,
              fontSize: { xs: 17, sm: 18 },
              letterSpacing: '-0.01em',
              '&.Mui-selected': { color: '#171411' },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              bgcolor: '#171411',
            },
          }}
        >
          <Tab value="attendance" label="ลงเวลา" />
          <Tab value="leave" label="ใบลา" />
        </Tabs>
      </Box>
      <Box sx={{ mt: 0 }}>
        {activeTab === 'attendance' ? (
          <AttendanceHistoryList history={history} />
        ) : (
          <MyLeaveRequests />
        )}
      </Box>
    </Stack>
  );
}
