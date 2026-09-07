import { Box, Paper, Skeleton, Stack } from '@mui/material';

export function AttendanceWorkHistorySkeleton() {
  return (
    <Box
      aria-label="กำลังโหลดประวัติการทำงาน"
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
            p: { xs: 2, sm: '18px 22px' },
            overflow: 'hidden',
            borderColor: '#e8ddd5',
            borderRadius: '15px',
            bgcolor: '#fffdfb',
          }}
        >
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}
          >
            <Skeleton variant="rounded" width={160} height={21} />
            <Skeleton variant="rounded" width={62} height={18} />
          </Box>
          <Stack spacing={1.25}>
            <Skeleton variant="rounded" height={22} />
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} variant="rounded" height={42} />
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
