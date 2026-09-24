import { Box, Card, Skeleton, Stack } from '@mui/material';

export function AdminOperationsSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <Card
      variant="outlined"
      aria-label="กำลังโหลดข้อมูลตรวจมาตรฐานและบริการ"
      sx={{
        overflowX: 'auto',
        borderColor: '#e8ddd5',
        borderRadius: '15px',
      }}
    >
      <Box sx={{ minWidth: 820 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr)) 15%`,
            gap: 2,
            px: 1.75,
            py: 1.5,
            bgcolor: '#fcf9f6',
            borderBottom: '1px solid #eee4dd',
          }}
        >
          {Array.from({ length: columns + 1 }, (_, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              width={index === columns ? 54 : `${58 + (index % 3) * 10}%`}
              height={13}
            />
          ))}
        </Box>
        {Array.from({ length: 6 }, (_, rowIndex) => (
          <Box
            key={rowIndex}
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr)) 15%`,
              alignItems: 'center',
              gap: 2,
              minHeight: 69,
              px: 1.75,
              py: 1.5,
              borderBottom: rowIndex === 5 ? undefined : '1px solid #eee4dd',
            }}
          >
            {Array.from({ length: columns }, (_, columnIndex) => (
              <Skeleton
                key={columnIndex}
                variant="rounded"
                width={`${60 + ((rowIndex + columnIndex) % 3) * 12}%`}
                height={15}
              />
            ))}
            <Stack direction="row" spacing={0.5}>
              <Skeleton
                variant="rounded"
                width={76}
                height={40}
                sx={{ borderRadius: '12px' }}
              />
            </Stack>
          </Box>
        ))}
      </Box>
    </Card>
  );
}
