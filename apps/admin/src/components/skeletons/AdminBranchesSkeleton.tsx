import { Box, Card, Skeleton } from '@mui/material';

export function AdminBranchesSkeleton() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: 'repeat(2, minmax(0, 1fr))',
        },
        gap: 2.25,
        maxWidth: 1200,
      }}
      aria-label="กำลังโหลดข้อมูลสาขา"
    >
      {Array.from({ length: 2 }, (_, i) => (
        <Card
          key={i}
          variant="outlined"
          sx={{
            p: { xs: 2.25, sm: 3 },
            borderRadius: '20px',
            borderColor: '#e8ddd5',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Skeleton
              variant="rounded"
              width={46}
              height={46}
              sx={{ borderRadius: '14px' }}
            />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="42%" height={27} />
              <Skeleton variant="text" width="27%" height={17} />
            </Box>
            <Skeleton variant="rounded" width={82} height={25} />
          </Box>
          <Box sx={{ mt: 2.5, pt: 2.25, borderTop: '1px solid #eee6e0' }}>
            <Skeleton variant="text" width="62%" height={22} />
            <Skeleton variant="text" width="76%" height={22} sx={{ mt: 1 }} />
            <Skeleton variant="text" width="70%" height={22} sx={{ mt: 1 }} />
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 1.5,
              mt: 2.5,
              pt: 2,
              borderTop: '1px solid #eee6e0',
            }}
          >
            <Skeleton variant="rounded" width={245} height={40} />
            <Skeleton variant="rounded" width={145} height={40} />
          </Box>
        </Card>
      ))}
    </Box>
  );
}
