import { Box, Paper, Skeleton, Stack } from '@mui/material';

const panelSx = {
  borderColor: '#e8ddd5',
  borderRadius: '15px',
  bgcolor: '#fffdfb',
} as const;

export function AttendanceCheckInSkeleton() {
  return (
    <Box
      aria-label="กำลังโหลดหน้าลงเวลาพนักงาน"
      sx={{ '& .MuiSkeleton-root': { borderRadius: '3px' } }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gap: 2.5,
        }}
      >
        <Skeleton
          variant="rounded"
          width={150}
          height={29}
          sx={{
            display: { xs: 'none', md: 'block' },
            gridColumn: { md: '1 / -1' },
          }}
        />
        <Paper
          variant="outlined"
          sx={{ ...panelSx, p: { xs: 2.5, sm: 3.5 }, textAlign: 'center' }}
        >
          <Skeleton
            variant="rounded"
            width={130}
            height={20}
            sx={{ mx: 'auto' }}
          />
          <Skeleton
            variant="rounded"
            width="min(300px, 74%)"
            height={66}
            sx={{ mx: 'auto', mt: 2 }}
          />
          <Skeleton
            variant="rounded"
            width={180}
            height={18}
            sx={{ mx: 'auto', mt: 1.5 }}
          />
          <Skeleton variant="rounded" height={48} />
          <Skeleton
            variant="rounded"
            width="58%"
            height={16}
            sx={{ mt: 1.5 }}
          />
        </Paper>
        <Paper variant="outlined" sx={{ ...panelSx, p: { xs: 2, sm: 2.5 } }}>
          <Skeleton variant="rounded" width={110} height={20} />
          <Skeleton variant="rounded" height={40} sx={{ mt: 1.5 }} />
          <Stack spacing={1.25} sx={{ mt: 2 }}>
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} variant="rounded" width="58%" height={18} />
            ))}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
