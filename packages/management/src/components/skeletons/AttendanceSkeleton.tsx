import { Box, Card, Skeleton } from '@mui/material';

const weekdayPlaceholders = Array.from({ length: 7 }, (_, index) => index);

export function AttendanceSkeleton({
  franchiseMode = false,
  calendarWeeks = 5,
}: {
  franchiseMode?: boolean;
  calendarWeeks?: number;
} = {}) {
  const dayPlaceholders = Array.from(
    { length: calendarWeeks * 7 },
    (_, index) => index,
  );

  return (
    <Box aria-label="กำลังโหลดข้อมูลลงเวลาพนักงาน">
      {!franchiseMode ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            mb: 2,
          }}
        >
          <Skeleton variant="text" width={118} height={26} />
          <Skeleton variant="rounded" width={74} height={32} />
          <Skeleton variant="rounded" width={92} height={32} />
        </Box>
      ) : null}

      <Card
        variant="outlined"
        aria-label="โครงปฏิทินลงเวลาพนักงาน"
        sx={{
          borderRadius: '16px',
          borderColor: '#e8ddd5',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.75,
            borderBottom: '1px solid #eee4dd',
            bgcolor: '#fbf7f4',
          }}
        >
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {!franchiseMode ? (
              <Box>
                <Skeleton variant="text" width={34} height={18} />
                <Skeleton variant="text" width={118} height={32} />
              </Box>
            ) : null}
            <Box
              sx={{
                pl: franchiseMode ? 0 : 3,
                borderLeft: franchiseMode ? 0 : '1px solid #dfd1c8',
              }}
            >
              <Skeleton variant="text" width={36} height={18} />
              <Skeleton variant="text" width={142} height={32} />
            </Box>
          </Box>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 780 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                borderBottom: '1px solid #eee4dd',
              }}
            >
              {weekdayPlaceholders.map((index) => (
                <Box key={index} sx={{ py: 1, textAlign: 'center' }}>
                  <Skeleton
                    variant="text"
                    width={index > 4 ? 52 : 68}
                    height={20}
                    sx={{ mx: 'auto' }}
                  />
                </Box>
              ))}
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              }}
            >
              {dayPlaceholders.map((index) => (
                <Box
                  key={index}
                  sx={{
                    minHeight: 122,
                    p: 1.25,
                    borderRight: '1px solid #eee4dd',
                    borderBottom: '1px solid #eee4dd',
                    '&:nth-of-type(7n)': { borderRight: 0 },
                    '&:nth-last-of-type(-n + 7)': { borderBottom: 0 },
                  }}
                >
                  <Skeleton variant="circular" width={26} height={26} />
                  <Skeleton
                    variant="rounded"
                    height={31}
                    sx={{ mt: 1.25, borderRadius: '6px' }}
                  />
                  {index % 3 !== 0 ? (
                    <Skeleton
                      variant="rounded"
                      height={31}
                      sx={{ mt: 0.75, borderRadius: '6px' }}
                    />
                  ) : null}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
