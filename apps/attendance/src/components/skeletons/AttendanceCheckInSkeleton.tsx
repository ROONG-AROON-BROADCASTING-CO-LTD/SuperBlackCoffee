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
          gridTemplateRows: {
            xs: 'minmax(360px, 7fr) minmax(244px, 3fr)',
            md: 'auto',
          },
          height: {
            xs: 'calc(100dvh - 72px - var(--attendance-mobile-nav-height, 82px) - env(safe-area-inset-bottom) - 48px)',
            md: 'auto',
          },
          gap: { xs: 1.5, md: 2.5 },
          overflow: 'visible',
          '@media (max-width:899.95px) and (max-height:760px)': {
            gridTemplateRows: 'minmax(230px, 7fr) minmax(150px, 3fr)',
          },
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
          sx={{
            ...panelSx,
            p: { xs: 2.5, sm: 3.5 },
            height: '100%',
            minHeight: 0,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            '@media (max-width:899.95px) and (max-height:760px)': {
              p: 1.5,
            },
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: 'grid',
              alignContent: 'center',
              justifyItems: 'center',
              gap: 1.25,
            }}
          >
            <Skeleton variant="rounded" width="min(300px, 74%)" height={72} />
            <Skeleton
              variant="rounded"
              width={180}
              height={18}
              sx={{ mt: 1.5 }}
            />
          </Box>
          <Skeleton variant="rounded" height={64} />
        </Paper>
        <Paper
          variant="outlined"
          sx={{
            ...panelSx,
            p: { xs: 2.5, sm: 3.5 },
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            '@media (max-width:899.95px) and (max-height:760px)': {
              p: 1.5,
            },
          }}
        >
          <Skeleton variant="rounded" width={110} height={20} />
          <Skeleton
            variant="rounded"
            height={64}
            sx={{
              mt: 1.5,
              height: { xs: 64, md: 40 },
              '@media (max-width:899.95px) and (max-height:760px)': {
                height: 44,
              },
            }}
          />
          <Stack
            spacing={{ xs: 0.75, md: 0.75 }}
            sx={{ mt: { xs: 1.75, md: 2 } }}
          >
            {[1, 2, 3].map((item) => (
              <Skeleton
                key={item}
                variant="rounded"
                width="58%"
                height={18}
                sx={{
                  '@media (max-width:899.95px) and (max-height:760px)': {
                    height: 15,
                  },
                }}
              />
            ))}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
