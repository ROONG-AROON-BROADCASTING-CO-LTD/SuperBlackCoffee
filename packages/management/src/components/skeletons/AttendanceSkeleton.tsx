import { Box, Paper, Skeleton, Stack } from '@mui/material';

export function AttendanceSkeleton() {
  return (
    <Box aria-label="กำลังโหลดข้อมูลลงเวลาพนักงาน">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: 2,
        }}
      >
        <Paper
          variant="outlined"
          sx={{ p: 2.5, borderColor: '#e8ddd5', borderRadius: '15px' }}
        >
          <Skeleton variant="text" width={210} height={30} />
          <Stack spacing={1.25} sx={{ mt: 2 }}>
            <Skeleton variant="rounded" height={34} />
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} variant="rounded" height={42} />
            ))}
          </Stack>
        </Paper>
        <Paper
          variant="outlined"
          sx={{ p: 2.5, borderColor: '#e8ddd5', borderRadius: '15px' }}
        >
          <Skeleton variant="text" width={130} height={30} />
          <Skeleton variant="text" width={44} height={54} sx={{ mt: 1.25 }} />
          <Skeleton variant="text" width={104} height={20} />
          <Skeleton variant="text" width={44} height={54} sx={{ mt: 1.25 }} />
          <Skeleton variant="text" width={120} height={20} />
        </Paper>
      </Box>
      <Paper
        variant="outlined"
        sx={{ mt: 3, p: 2.5, borderColor: '#e8ddd5', borderRadius: '15px' }}
      >
        <Skeleton variant="text" width={150} height={30} />
        <Skeleton variant="text" width={132} height={22} sx={{ mt: 1.5 }} />
      </Paper>
    </Box>
  );
}
