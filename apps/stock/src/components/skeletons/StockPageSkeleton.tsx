import { Box, Card, Paper, Skeleton, Stack } from '@mui/material';
import type { StockPage } from '../../types/stock';

const panelSx = {
  p: { xs: 2, sm: 2.5 },
  borderRadius: '15px',
  border: '1px solid #e8ddd5',
  bgcolor: '#fff',
} as const;

const gridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(5, minmax(0, 1fr))',
  },
  gap: { xs: 1.25, sm: 2 },
  alignContent: 'start',
} as const;

function Line({
  width = '100%',
  height = 16,
}: {
  width?: number | string;
  height?: number;
}) {
  return <Skeleton variant="rounded" width={width} height={height} />;
}

function ImagePlaceholder({ badges = 1 }: { badges?: number }) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1 / 1',
        bgcolor: '#f1e8de',
      }}
    >
      {badges === 2 ? (
        <Skeleton
          variant="rounded"
          width={55}
          height={21}
          sx={{ position: 'absolute', top: 8, left: 8, borderRadius: '12px' }}
        />
      ) : null}
      <Skeleton
        variant="rounded"
        width={58}
        height={25}
        sx={{ position: 'absolute', top: 8, right: 8, borderRadius: '12px' }}
      />
    </Box>
  );
}

function ProductCardSkeleton({
  kind,
}: {
  kind: 'sales' | 'count' | 'promotions';
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
        borderRadius: '15px',
        borderColor: '#e8ddd5',
        bgcolor: '#fff',
      }}
    >
      <ImagePlaceholder badges={kind === 'promotions' ? 2 : 1} />
      <Stack sx={{ flex: 1, p: { xs: 1.25, sm: 2.5 }, gap: 0.55 }}>
        <Line width="83%" height={18} />
        {kind === 'count' ? (
          <>
            <Line width="72%" height={13} />
            <Line width="60%" height={15} />
            <Box sx={{ flex: 1 }} />
            <Line height={32} />
            <Line height={32} />
          </>
        ) : kind === 'sales' ? (
          <>
            <Line width="64%" height={13} />
            <Box sx={{ flex: 1 }} />
            <Line height={32} />
          </>
        ) : (
          <>
            <Line width="68%" height={13} />
            <Line width="57%" height={18} />
            <Stack
              sx={{
                gap: 0.5,
                mt: 0.5,
                p: 0.75,
                borderRadius: '9px',
                bgcolor: '#f8f4f1',
              }}
            >
              <Line width="78%" height={11} />
              <Line width="92%" height={11} />
            </Stack>
            <Line width="81%" height={12} />
            <Box sx={{ flex: 1 }} />
            <Line height={32} />
          </>
        )}
      </Stack>
    </Card>
  );
}

function SearchPlaceholder() {
  return (
    <Skeleton
      variant="rounded"
      height={40}
      sx={{ width: '100%', borderRadius: '10px' }}
    />
  );
}

function SalesFiltersSkeleton() {
  return (
    <Paper sx={panelSx}>
      <Stack
        direction="row"
        sx={{
          mb: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Stack direction="row" spacing={1}>
          <Line width={84} height={40} />
          <Line width={106} height={40} />
        </Stack>
        <Line width={92} height={40} />
      </Stack>
      <SearchPlaceholder />
    </Paper>
  );
}

function CountFiltersSkeleton() {
  return (
    <Paper sx={panelSx}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ gap: 1.25, justifyContent: 'space-between' }}
      >
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Line width={68} height={40} />
          <Line width={112} height={40} />
          <Line width={112} height={40} />
        </Stack>
        <Box sx={{ width: { xs: '100%', sm: 240 } }}>
          <SearchPlaceholder />
        </Box>
      </Stack>
    </Paper>
  );
}

function PromotionsFiltersSkeleton() {
  return (
    <Box>
      <Stack sx={{ mb: 2.5, gap: 0.4 }}>
        <Line width={84} height={17} />
        <Line width={120} height={27} />
        <Line width="88%" height={17} />
      </Stack>
      <Box sx={{ width: { xs: '100%', sm: 280 }, mb: 1 }}>
        <SearchPlaceholder />
      </Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{ overflow: 'hidden', pt: 1.5, pb: 0.4, mb: 2.5 }}
      >
        {[82, 108, 110, 96].map((width, index) => (
          <Line key={index} width={width} height={40} />
        ))}
      </Stack>
    </Box>
  );
}

function HistorySkeleton() {
  return (
    <Stack sx={{ gap: 1.25 }}>
      {Array.from({ length: 4 }, (_, index) => (
        <Paper
          key={index}
          variant="outlined"
          sx={{ p: { xs: 1.75, sm: 2 }, borderRadius: '15px' }}
        >
          <Stack sx={{ gap: 1.25 }}>
            <Stack
              direction="row"
              sx={{ justifyContent: 'space-between', gap: 1 }}
            >
              <Stack sx={{ width: '65%', gap: 0.5 }}>
                <Line width="75%" height={19} />
                <Line width="90%" height={14} />
              </Stack>
              <Line width={72} height={25} />
            </Stack>
            <Stack
              direction="row"
              sx={{
                justifyContent: 'space-between',
                p: 1.25,
                border: '1px solid #eee5df',
                borderRadius: '10px',
                bgcolor: '#fffcfa',
              }}
            >
              <Stack sx={{ gap: 0.5 }}>
                <Line width={72} height={12} />
                <Line width={50} height={23} />
              </Stack>
              <Stack sx={{ alignItems: 'flex-end', gap: 0.5 }}>
                <Line width={72} height={12} />
                <Line width={50} height={23} />
              </Stack>
            </Stack>
            <Line width="52%" height={16} />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

export function StockPageSkeleton({ page }: { page: StockPage }) {
  if (page === 'history')
    return (
      <Box aria-label="กำลังโหลดประวัติสต๊อก">
        <HistorySkeleton />
      </Box>
    );

  return (
    <Box
      aria-label="กำลังโหลดข้อมูลสต๊อก"
      sx={{ '& .MuiSkeleton-root': { borderRadius: '4px' } }}
    >
      <Stack sx={{ gap: page === 'promotions' ? 0 : 2.5 }}>
        {page === 'sales' ? (
          <>
            <SalesFiltersSkeleton />
            <Paper
              sx={{
                ...panelSx,
                border: '1px dashed #d7c5b8',
                bgcolor: '#fffcfa',
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
                  alignItems: 'center',
                  gap: { xs: 1.5, sm: 2.5 },
                }}
              >
                <Stack sx={{ gap: 0.6 }}>
                  <Line width="92%" height={19} />
                  <Line width="100%" height={15} />
                  <Line width="72%" height={15} />
                </Stack>
                <Line height={56} />
              </Box>
            </Paper>
          </>
        ) : page === 'count' ? (
          <CountFiltersSkeleton />
        ) : (
          <PromotionsFiltersSkeleton />
        )}
        <Box sx={gridSx}>
          {Array.from({ length: 6 }, (_, index) => (
            <ProductCardSkeleton key={index} kind={page} />
          ))}
        </Box>
      </Stack>
    </Box>
  );
}
