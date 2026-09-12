import { Box, Paper, Skeleton, Stack } from '@mui/material';
import type { StockPage } from '../../types/stock';

const panelSx = {
  borderColor: '#e8ddd5',
  borderRadius: '15px',
  bgcolor: '#fffdfb',
} as const;

export function StockPageSkeleton({ page }: { page: StockPage }) {
  const isSales = page === 'sales';
  const isCount = page === 'count';

  return (
    <Box
      aria-label="กำลังโหลดข้อมูลสต๊อก"
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
          <Skeleton variant="rounded" width={250} height={18} sx={{ mt: 1 }} />
        </Box>
        {isSales || isCount ? (
          <Paper variant="outlined" sx={{ ...panelSx, p: { xs: 2, sm: 2.5 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.25 }}>
              <Skeleton
                variant="rounded"
                width={isSales ? 112 : 236}
                height={40}
              />
              <Skeleton
                variant="rounded"
                height={40}
                sx={{ width: { xs: '100%', sm: isSales ? 112 : 210 } }}
              />
            </Stack>
          </Paper>
        ) : null}
        {isSales ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            {Array.from({ length: 6 }, (_, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{ ...panelSx, overflow: 'hidden' }}
              >
                <Skeleton variant="rectangular" height={166} />
                <Stack sx={{ gap: 1.25, p: 2.5 }}>
                  <Skeleton variant="rounded" width="76%" height={24} />
                  <Skeleton variant="rounded" width="92%" height={18} />
                  <Skeleton variant="rounded" width="64%" height={18} />
                  <Skeleton variant="rounded" height={36} sx={{ mt: 1 }} />
                </Stack>
              </Paper>
            ))}
          </Box>
        ) : (
          <Stack sx={{ gap: 1.25 }}>
            {Array.from({ length: page === 'history' ? 5 : 4 }, (_, index) => (
              <Paper key={index} variant="outlined" sx={{ ...panelSx, p: 2 }}>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', gap: 2 }}
                >
                  <Stack sx={{ flex: 1, gap: 1 }}>
                    <Skeleton variant="rounded" width="42%" height={21} />
                    <Skeleton variant="rounded" width="58%" height={17} />
                  </Stack>
                  <Skeleton variant="rounded" width={94} height={36} />
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
