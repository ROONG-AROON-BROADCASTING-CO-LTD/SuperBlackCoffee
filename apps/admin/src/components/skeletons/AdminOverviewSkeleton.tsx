import { Box, Card, Divider, Skeleton, Stack } from '@mui/material';

export function AdminOverviewSkeleton() {
  return (
    <Stack
      spacing={2.25}
      aria-label="กำลังโหลดภาพรวม"
      sx={{
        '& .MuiSkeleton-root:not(.skeleton-panel)': {
          borderRadius: '3px',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            width={74}
            height={34}
            sx={{ borderRadius: '12px' }}
          />
        ))}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        {Array.from({ length: 3 }, (_, i) => (
          <Card
            key={i}
            variant="outlined"
            sx={{ p: 2.5, borderRadius: '15px', borderColor: '#e8ddd5' }}
          >
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
            >
              <Skeleton variant="rounded" width="42%" height={14} />
              <Skeleton
                variant="circular"
                width={9}
                height={9}
                sx={{ mt: 0.6 }}
              />
            </Box>
            <Skeleton
              variant="rounded"
              width="58%"
              height={34}
              sx={{ mt: 1.25 }}
            />
            <Skeleton
              variant="rounded"
              width="72%"
              height={13}
              sx={{ mt: 1 }}
            />
          </Card>
        ))}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            xl: 'minmax(0, 1.2fr) minmax(330px, .8fr)',
          },
          gap: 2,
        }}
      >
        <Card
          variant="outlined"
          sx={{
            p: { xs: 2, md: 2.75 },
            borderRadius: '15px',
            borderColor: '#e8ddd5',
          }}
        >
          <Skeleton variant="rounded" width="42%" height={22} />
          <Skeleton
            variant="rounded"
            width="58%"
            height={13}
            sx={{ mt: 0.35 }}
          />
          <Stack spacing={2} sx={{ mt: 2.5 }}>
            {Array.from({ length: 2 }, (_, i) => (
              <Box key={i}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton variant="rounded" width="24%" height={15} />
                  <Skeleton variant="rounded" width="28%" height={14} />
                </Box>
                <Skeleton
                  variant="rounded"
                  width="100%"
                  height={10}
                  sx={{ mt: 0.7, borderRadius: 99 }}
                />
                <Skeleton
                  variant="rounded"
                  width="18%"
                  height={13}
                  sx={{ mt: 0.45 }}
                />
              </Box>
            ))}
          </Stack>
        </Card>
        <Card
          variant="outlined"
          sx={{
            p: { xs: 2, md: 2.75 },
            borderRadius: '15px',
            borderColor: '#e8ddd5',
          }}
        >
          <Skeleton variant="rounded" width="42%" height={22} />
          <Skeleton
            variant="rounded"
            width="68%"
            height={13}
            sx={{ mt: 0.35 }}
          />
          <Stack spacing={1.25} sx={{ mt: 2.3 }}>
            {Array.from({ length: 2 }, (_, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.5,
                  border: '1px solid #eee4dd',
                  borderRadius: '12px',
                }}
              >
                <Box>
                  <Skeleton variant="rounded" width={86} height={15} />
                  <Skeleton
                    variant="rounded"
                    width={128}
                    height={13}
                    sx={{ mt: 0.5 }}
                  />
                </Box>
                <Skeleton variant="rounded" width={88} height={14} />
              </Box>
            ))}
          </Stack>
        </Card>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            xl: 'minmax(0, 1.25fr) minmax(330px, .75fr)',
          },
          gap: 2,
        }}
      >
        <Card
          variant="outlined"
          sx={{
            p: { xs: 2, md: 2.75 },
            borderRadius: '15px',
            borderColor: '#e8ddd5',
          }}
        >
          <Skeleton variant="rounded" width="28%" height={22} />
          <Skeleton
            variant="rounded"
            width="38%"
            height={13}
            sx={{ mt: 0.35 }}
          />
          <Box
            className="skeleton-panel"
            sx={{
              mt: 2.5,
              p: { xs: 2, md: 2.5 },
              minHeight: 140,
              boxSizing: 'border-box',
              borderRadius: '14px',
              bgcolor: '#201914',
            }}
          >
            <Skeleton
              variant="rounded"
              width="24%"
              height={13}
              sx={{ bgcolor: '#6b5141' }}
            />
            <Skeleton
              variant="rounded"
              width="46%"
              height={34}
              sx={{ mt: 0.7, bgcolor: '#6b5141' }}
            />
            <Skeleton
              variant="rounded"
              width="58%"
              height={13}
              sx={{ mt: 1, bgcolor: '#6b5141' }}
            />
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 2,
              mt: 2.25,
            }}
          >
            <Box>
              <Skeleton variant="rounded" width="52%" height={14} />
              <Skeleton
                variant="rounded"
                width="62%"
                height={28}
                sx={{ mt: 0.4 }}
              />
            </Box>
            <Box sx={{ borderLeft: '1px solid #ece3dc', pl: 2 }}>
              <Skeleton variant="rounded" width="58%" height={14} />
              <Skeleton
                variant="rounded"
                width="62%"
                height={28}
                sx={{ mt: 0.4 }}
              />
            </Box>
          </Box>
        </Card>
        <Card
          variant="outlined"
          sx={{
            p: { xs: 2, md: 2.75 },
            borderRadius: '15px',
            borderColor: '#e8ddd5',
          }}
        >
          <Skeleton variant="rounded" width="32%" height={22} />
          <Skeleton
            variant="rounded"
            width="48%"
            height={13}
            sx={{ mt: 0.35 }}
          />
          <Stack spacing={1.25} sx={{ mt: 2.3 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <Box
                key={i}
                className="skeleton-panel"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  border: '1px solid #eee4dd',
                  borderRadius: '12px',
                }}
              >
                <Skeleton variant="circular" width={10} height={10} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Skeleton variant="rounded" width="62%" height={15} />
                  <Skeleton
                    variant="rounded"
                    width="48%"
                    height={13}
                    sx={{ mt: 0.5 }}
                  />
                </Box>
                <Skeleton variant="rounded" width={18} height={22} />
                <Skeleton variant="rounded" width={9} height={22} />
              </Box>
            ))}
          </Stack>
        </Card>
      </Box>
      <Card
        variant="outlined"
        sx={{
          p: { xs: 2, md: 2.75 },
          borderRadius: '15px',
          borderColor: '#e8ddd5',
        }}
      >
        <Skeleton variant="rounded" width="18%" height={22} />
        <Skeleton variant="rounded" width="38%" height={13} sx={{ mt: 0.35 }} />
        <Divider sx={{ my: 2.2, borderColor: '#eee4dd' }} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 1.25,
          }}
        >
          {Array.from({ length: 4 }, (_, i) => (
            <Box
              key={i}
              sx={{
                border: '1px solid #eee4dd',
                borderRadius: '12px',
                p: 1.75,
              }}
            >
              <Skeleton variant="rounded" width={24} height={14} />
              <Skeleton
                variant="rounded"
                width="74%"
                height={19}
                sx={{ mt: 0.8 }}
              />
              <Skeleton
                variant="rounded"
                width="92%"
                height={14}
                sx={{ mt: 0.35 }}
              />
            </Box>
          ))}
        </Box>
      </Card>
    </Stack>
  );
}
