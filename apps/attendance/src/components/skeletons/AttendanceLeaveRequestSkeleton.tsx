import { Box, Paper, Skeleton, Stack } from '@mui/material';

export function AttendanceLeaveRequestSkeleton() {
  return (
    <Box
      aria-label="กำลังโหลดหน้าคำขอลา"
      sx={{
        height: {
          xs: 'calc(100dvh - 72px - var(--attendance-mobile-nav-height, 82px) - env(safe-area-inset-bottom) - 48px)',
          md: 'auto',
        },
        '& .MuiSkeleton-root': { borderRadius: '3px' },
      }}
    >
      <Stack spacing={{ xs: 0, md: 2.5 }} sx={{ height: '100%' }}>
        <Skeleton
          variant="rounded"
          width={150}
          height={29}
          sx={{ display: { xs: 'none', md: 'block' } }}
        />
        <Paper
          variant="outlined"
          sx={{
            width: '100%',
            p: { xs: 2.5, sm: 3.5 },
            flex: { xs: 1, md: 'initial' },
            minHeight: 0,
            display: 'flex',
            borderColor: '#e8ddd5',
            borderRadius: '15px',
            bgcolor: '#fffdfb',
          }}
        >
          <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
            <Skeleton variant="rounded" width="100%" height={36} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 2,
              }}
            >
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} variant="rounded" height={78} />
              ))}
            </Box>
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" sx={{ flex: 1, minHeight: 102 }} />
            <Skeleton variant="rounded" height={64} />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
