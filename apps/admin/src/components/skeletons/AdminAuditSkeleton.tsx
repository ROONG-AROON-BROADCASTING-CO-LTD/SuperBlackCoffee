import { Box, Skeleton } from '@mui/material';

export function AdminAuditSkeleton() {
  return (
    <Box sx={{ display: 'grid', gap: 2 }} aria-label="กำลังโหลดประวัติ">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.6fr repeat(3, .8fr)' },
          gap: 1,
        }}
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={index}
            variant="rounded"
            height={40}
            sx={{ borderRadius: '11px' }}
          />
        ))}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
          py: 1.25,
          gap: 1,
        }}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton
            key={index}
            variant="rounded"
            height={48}
            sx={{ borderRadius: '9px' }}
          />
        ))}
      </Box>
      {Array.from({ length: 6 }, (_, index) => (
        <Box
          key={index}
          sx={{
            display: 'grid',
            gridTemplateColumns:
              '62px minmax(170px, 1fr) minmax(240px, 2fr) 120px',
            gap: 1.5,
            alignItems: 'center',
            minHeight: 62,
            px: 1.25,
            borderBottom: '1px solid #f0e9e5',
          }}
        >
          <Skeleton variant="text" width={35} />
          <Skeleton variant="rounded" width="72%" height={18} />
          <Skeleton variant="rounded" width="88%" height={18} />
          <Skeleton variant="rounded" width="82%" height={18} />
        </Box>
      ))}
    </Box>
  );
}
