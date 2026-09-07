import { Box, Paper, Skeleton, Stack } from '@mui/material';

export function AttendanceOverviewSkeleton() {
  return (
    <Box
      aria-label="กำลังโหลดภาพรวมพนักงาน"
      sx={{ '& .MuiSkeleton-root': { borderRadius: '3px' } }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Skeleton
            variant="rounded"
            width={150}
            height={29}
            sx={{ display: { xs: 'none', md: 'block' } }}
          />
          <Skeleton
            variant="rounded"
            width={190}
            height={18}
            sx={{ mt: { xs: 0, md: 1 } }}
          />
        </Box>
        <Box>
          <Skeleton
            variant="rounded"
            width={116}
            height={20}
            sx={{ mb: 1.25 }}
          />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 1.5,
            }}
          >
            {Array.from({ length: 4 }, (_, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{
                  p: 2,
                  borderColor: '#e8ddd5',
                  borderRadius: '15px',
                  bgcolor: '#fffdfb',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Skeleton variant="circular" width={22} height={22} />
                  <Skeleton variant="rounded" width="48%" height={18} />
                </Box>
                <Skeleton
                  variant="rounded"
                  width="48%"
                  height={36}
                  sx={{ mt: 1.5 }}
                />
              </Paper>
            ))}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
