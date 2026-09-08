import { Box, Paper, Skeleton, Stack } from '@mui/material';

export function LeaveRequestsSkeleton() {
  return (
    <Box aria-label="กำลังโหลดคำขอลาพนักงาน">
      <Paper
        variant="outlined"
        sx={{ p: 2.5, borderColor: '#e8ddd5', borderRadius: '15px' }}
      >
        <Skeleton variant="text" width={170} height={30} />
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} variant="rounded" height={82} />
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
