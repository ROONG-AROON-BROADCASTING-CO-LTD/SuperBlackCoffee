import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
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
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23',
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
        p: compact ? { xs: 2, sm: '18px 22px' } : 0,
        overflowX: 'auto',
        borderColor: '#e8ddd5',
        borderRadius: compact ? '15px' : '0 0 15px 15px',
        bgcolor: '#fffdfb',
      }}
    >
      {compact ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1.5,
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>
            ประวัติการเช็กอินล่าสุด
          </Typography>
          <Typography color="secondary.main">ดูทั้งหมด</Typography>
        </Box>
      ) : null}
      <TableContainer>
        <Table
          size="small"
          sx={{
            minWidth: { xs: 0, sm: 580 },
            tableLayout: { xs: 'fixed', sm: 'auto' },
          }}
          aria-label="ประวัติการลงเวลา"
        >
          <TableHead>
            <TableRow sx={{ bgcolor: '#f7f3f0' }}>
              {['วันที่', 'เช็กอิน', 'เช็กเอาต์', 'รวมเวลา'].map(
                (label, index) => (
                  <TableCell
                    key={label}
                    sx={{
                      borderColor: '#eee3dc',
                      color: '#76675d',
                      display: { xs: index === 3 ? 'none' : 'table-cell' },
                      fontSize: { xs: 12, sm: 14 },
                      fontWeight: 700,
                      py: 1.25,
                      width: { xs: index === 0 ? '50%' : '25%', sm: 'auto' },
                      whiteSpace: 'nowrap',
                      ...(compact ? { px: 0 } : { px: { xs: 2.5, sm: 3.5 } }),
                    }}
                  >
                    {label}
                  </TableCell>
                ),
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(({ date, checkInAt, checkOutAt }) => (
              <TableRow key={date} hover>
                <TableCell sx={cellStyle(compact)}>
                  {formatDate(date)}
                </TableCell>
                <TableCell sx={cellStyle(compact)}>
                  {formatTime(checkInAt)}
                </TableCell>
                <TableCell sx={cellStyle(compact)}>
                  {formatTime(checkOutAt)}
                </TableCell>
                <TableCell
                  sx={{
                    ...cellStyle(compact),
                    display: { xs: 'none', sm: 'table-cell' },
                    fontWeight: 600,
                  }}
                >
                  {totalTime(checkInAt, checkOutAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

function cellStyle(compact: boolean) {
  return {
    borderColor: '#eee3dc',
    color: '#2a221d',
    fontSize: { xs: 12, sm: 14 },
    py: 1.5,
    whiteSpace: 'nowrap',
    ...(compact ? { px: 0 } : { px: { xs: 2.5, sm: 3.5 } }),
  };
}
