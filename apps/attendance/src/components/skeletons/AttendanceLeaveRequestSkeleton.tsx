import { Box, Paper, Skeleton, Stack } from '@mui/material';

export function AttendanceLeaveRequestSkeleton() {
  return (
    <Box
      aria-label="กำลังโหลดหน้าคำขอลา"
      sx={{ '& .MuiSkeleton-root': { borderRadius: '3px' } }}
    >
      <Stack spacing={2.5}>
        <Skeleton
          variant="rounded"
          width={150}
          height={29}
          sx={{ display: { xs: 'none', md: 'block' } }}
        />
        <Paper
          variant="outlined"
          sx={{
            maxWidth: 700,
            p: { xs: 2.5, sm: 3.5 },
            borderColor: '#e8ddd5',
            borderRadius: '15px',
            bgcolor: '#fffdfb',
          }}
        >
          <Stack spacing={2} sx={{ maxWidth: 580 }}>
            <Skeleton variant="rounded" width="84%" height={18} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: { xs: 0.75, sm: 1.25 },
              }}
            >
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} variant="rounded" height={78} />
              ))}
            </Box>
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" height={102} />
            <Skeleton variant="rounded" height={42} />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
