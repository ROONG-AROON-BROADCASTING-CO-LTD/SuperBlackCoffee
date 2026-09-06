import { Box, Card, Skeleton } from '@mui/material';

export function AdminFranchiseBranchesSkeleton({
  contentOnly = false,
}: {
  contentOnly?: boolean;
}) {
  return (
    <Box aria-label="กำลังโหลดข้อมูลสาขาแฟรนไชส์">
      {!contentOnly ? (
        <>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
              mb: 2.5,
            }}
          >
            <Skeleton
              variant="rounded"
              width={310}
              height={40}
              sx={{ borderRadius: '12px' }}
            />
            <Skeleton
              variant="rounded"
              width={168}
              height={40}
              sx={{ borderRadius: '12px' }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 2,
              mb: 1.25,
            }}
          >
            <Skeleton variant="text" width={140} height={30} />
            <Skeleton variant="text" width={220} height={22} />
          </Box>
        </>
      ) : null}
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
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Card
            key={index}
            variant="outlined"
            sx={{
              p: { xs: 2.25, md: 2.5 },
              borderRadius: '15px',
              borderColor: '#e8ddd5',
            }}
          >
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
            >
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="72%" height={28} />
                <Skeleton variant="text" width="52%" height={20} />
              </Box>
              <Skeleton
                variant="rounded"
                width={62}
                height={25}
                sx={{ borderRadius: '12px' }}
              />
            </Box>
            <Box sx={{ mt: 2, pt: 1.75, borderTop: '1px solid #eee6e0' }}>
              <Skeleton
                variant="rounded"
                width={68}
                height={25}
                sx={{ borderRadius: '12px' }}
              />
              <Skeleton variant="text" width="88%" height={20} sx={{ mt: 1 }} />
            </Box>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
