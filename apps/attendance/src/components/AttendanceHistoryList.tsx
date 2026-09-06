import { Box, Paper, Typography } from '@mui/material';
import type { AttendanceHistoryItem } from '../api/attendance';

export function AttendanceHistoryList({
  compact = false,
  history,
}: {
  compact?: boolean;
  history: AttendanceHistoryItem[];
}) {
  const items = compact ? history.slice(0, 3) : history;
  const formatTime = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date(value))
      : '-';
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('th-TH', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
  const totalTime = (checkInAt: string | null, checkOutAt: string | null) => {
    if (!checkInAt || !checkOutAt) return '-';
    const minutes = Math.max(
      0,
      Math.round(
        (new Date(checkOutAt).getTime() - new Date(checkInAt).getTime()) /
          60000,
      ),
    );
    return `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`;
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: '18px 22px' },
        overflowX: 'auto',
        borderColor: '#e8ddd5',
        borderRadius: '15px',
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
        {items.map(({ date, checkInAt, checkOutAt }) => (
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
            <span>{formatDate(date)}</span>
            <span>{formatTime(checkInAt)}</span>
            <span>{formatTime(checkOutAt)}</span>
            <span>{totalTime(checkInAt, checkOutAt)}</span>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
