import { Box, Paper, Typography } from '@mui/material';
import { workHistory } from '../data/attendanceData';

export function AttendanceHistoryList({
  compact = false,
}: {
  compact?: boolean;
}) {
  const items = compact ? workHistory.slice(0, 3) : workHistory;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: '18px 22px' },
        overflowX: 'auto',
        borderColor: '#e2d3c7',
        borderRadius: 2.25,
        bgcolor: '#fffdfb',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
        }}
      >
        <Typography sx={{ fontWeight: 700 }}>
          {compact ? 'ประวัติการเช็กอินล่าสุด' : 'ประวัติการทำงาน'}
        </Typography>
        {compact ? (
          <Typography color="secondary.main">ดูทั้งหมด</Typography>
        ) : null}
      </Box>
      <Box sx={{ minWidth: 580 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1.7fr 1fr 1fr 1.3fr',
            gap: 1.5,
            py: 1.25,
            color: '#76675d',
            fontSize: 12,
          }}
        >
          <span>วันที่</span>
          <span>เช็กอิน</span>
          <span>เช็กเอาต์</span>
          <span>รวมเวลา</span>
        </Box>
        {items.map(([date, checkIn, checkOut, total]) => (
          <Box
            key={date}
            sx={{
              display: 'grid',
              gridTemplateColumns: '1.7fr 1fr 1fr 1.3fr',
              gap: 1.5,
              py: 1.25,
              borderTop: '1px solid #eee3dc',
              fontSize: 14,
            }}
          >
            <span>{date}</span>
            <span>{checkIn}</span>
            <span>{checkOut}</span>
            <span>{total}</span>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
