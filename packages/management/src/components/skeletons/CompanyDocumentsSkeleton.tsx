import { Box, Card, Skeleton } from '@mui/material';

export function CompanyDocumentsSkeleton() {
  return (
    <Box
      aria-label="กำลังโหลดเอกสารส่วนกลาง"
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(4, minmax(0, 1fr))',
        },
        gap: '16px',
      }}
    >
      {Array.from({ length: 4 }, (_, index) => (
        <Card
          key={index}
          variant="outlined"
          sx={{
            minHeight: 210,
            borderRadius: '15px',
            borderColor: '#e8ddd5',
            p: 2.5,
          }}
        >
          <Skeleton
            variant="rounded"
            width={92}
            height={25}
            sx={{ borderRadius: '12px' }}
          />
          <Skeleton variant="rounded" width="72%" height={25} sx={{ mt: 2 }} />
          <Skeleton variant="rounded" width="94%" height={18} sx={{ mt: 1 }} />
          <Skeleton
            variant="rounded"
            width="48%"
            height={16}
            sx={{ mt: 0.75 }}
          />
          <Skeleton
            variant="rounded"
            width={90}
            height={34}
            sx={{ mt: 3, borderRadius: '10px' }}
          />
        </Card>
      ))}
    </Box>
  );
}
