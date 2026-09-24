import { Box, Paper, Skeleton, Stack } from '@mui/material';

export function LeaveRequestsSkeleton() {
  return (
    <Stack spacing={3} aria-label="กำลังโหลดคำขอลาพนักงาน">
      <Paper
        variant="outlined"
        sx={{ p: 2.5, borderColor: '#e8ddd5', borderRadius: '15px' }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Skeleton variant="circular" width={22} height={22} />
          <Box>
            <Skeleton variant="rounded" width={72} height={20} />
            <Skeleton
              variant="rounded"
              width={54}
              height={14}
              sx={{ mt: 0.5 }}
            />
          </Box>
        </Stack>
      </Paper>
      <Paper
        variant="outlined"
        sx={{ p: 2.5, borderColor: '#e8ddd5', borderRadius: '15px' }}
      >
        <Stack spacing={1.5}>
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} variant="rounded" height={82} />
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
