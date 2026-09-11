import { Box, Card, Skeleton } from '@mui/material';

export function IngredientsSkeleton({
  readOnly = false,
  allowOrdering = false,
}: {
  readOnly?: boolean;
  allowOrdering?: boolean;
}) {
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
      aria-label="กำลังโหลดวัตถุดิบ"
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
              display: 'flex',
              justifyContent: 'flex-end',
              aspectRatio: '1 / 1',
              px: 1.5,
              pt: 1.5,
              bgcolor: '#f1e8de',
            }}
          >
            <Skeleton
              variant="rounded"
              width={70}
              height={25}
              sx={{ borderRadius: '12px' }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              p: 2.5,
              pt: 1.25,
            }}
          >
            <Skeleton variant="rounded" width="62%" height={23} />
            <Box sx={{ display: 'grid', gap: 0.8, mt: 0.8, px: 1 }}>
              <Skeleton variant="rounded" width="100%" height={22} />
              <Skeleton variant="rounded" width="100%" height={22} />
              <Skeleton variant="rounded" width="100%" height={22} />
            </Box>
            {allowOrdering ? (
              <Box sx={{ display: 'flex', mt: 'auto', pt: 2 }}>
                <Skeleton
                  variant="rounded"
                  width="100%"
                  height={34}
                  sx={{ borderRadius: '10px' }}
                />
              </Box>
            ) : null}
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
