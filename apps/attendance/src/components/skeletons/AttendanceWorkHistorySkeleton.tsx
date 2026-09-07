import { Box, Paper, Skeleton, Stack } from '@mui/material';

export function AttendanceWorkHistorySkeleton() {
  return (
    <Box
      aria-label="กำลังโหลดประวัติการทำงาน"
      sx={{ '& .MuiSkeleton-root': { borderRadius: '3px' } }}
    >
      <Stack spacing={{ xs: 0, md: 2.5 }}>
        <Skeleton
          variant="rounded"
          width={150}
          height={29}
          sx={{ display: { xs: 'none', md: 'block' } }}
        />
        <Paper
          variant="outlined"
          sx={{
            p: 0,
            overflowX: 'auto',
            borderColor: '#e8ddd5',
            borderRadius: '15px',
            bgcolor: '#fffdfb',
          }}
        >
          <Box sx={{ minWidth: 580 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1.7fr 1fr 1fr 1.3fr',
                gap: 1.5,
                px: { xs: 2.5, sm: 3.5 },
                py: 1.25,
              }}
            >
              {[42, 28, 28, 34].map((width, index) => (
                <Skeleton
                  key={index}
                  variant="rounded"
                  width={`${width}%`}
                  height={18}
                />
              ))}
            </Box>
            {[1, 2, 3, 4].map((row) => (
              <Box
                key={row}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1.7fr 1fr 1fr 1.3fr',
                  gap: 1.5,
                  px: { xs: 2.5, sm: 3.5 },
                  py: 1.25,
                  borderTop: '1px solid #eee3dc',
                }}
              >
                {[76, 58, 58, 68].map((width, index) => (
                  <Skeleton
                    key={index}
                    variant="rounded"
                    width={`${width}%`}
                    height={18}
                  />
                ))}
              </Box>
            ))}
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}
