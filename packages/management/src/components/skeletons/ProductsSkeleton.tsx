import { Box, Card, Skeleton } from '@mui/material';

export function ProductsSkeleton({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(4, minmax(0, 1fr))',
        },
        gap: '16px',
      }}
      aria-label="กำลังโหลดเมนูและสินค้า"
    >
      {Array.from({ length: 4 }, (_, i) => (
        <Card
          key={i}
          variant="outlined"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: '15px',
            borderColor: '#e8ddd5',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              aspectRatio: '1 / 1',
              bgcolor: '#f1e8de',
            }}
          >
            <Skeleton
              variant="rounded"
              width={70}
              height={25}
              sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                borderRadius: '12px',
              }}
            />
          </Box>
          <Box
            sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: 2.5 }}
          >
            <Skeleton variant="rounded" width="62%" height={23} />
            <Skeleton
              variant="rounded"
              width="38%"
              height={17}
              sx={{ mt: 0.6 }}
            />
            <Box sx={{ display: 'grid', gap: 0.8, mt: 0.8, px: 1 }}>
              <Skeleton variant="rounded" width="100%" height={22} />
              <Skeleton variant="rounded" width="100%" height={22} />
              <Box
                sx={{ my: 0.45, borderTop: '1px solid rgba(95, 64, 48, 0.16)' }}
              />
              <Skeleton variant="rounded" width="100%" height={24} />
              <Skeleton variant="rounded" width="100%" height={24} />
            </Box>
            {!readOnly ? (
              <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 2 }}>
                <Skeleton
                  variant="rounded"
                  sx={{ flex: 1, height: 34, borderRadius: '10px' }}
                />
                <Skeleton
                  variant="rounded"
                  sx={{ flex: 1, height: 34, borderRadius: '10px' }}
                />
              </Box>
            ) : null}
          </Box>
        </Card>
      ))}
    </Box>
  );
}
