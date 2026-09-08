import { Box, Button, Card, Skeleton, Typography } from '@mui/material';

export function EmployeesSkeleton({
  franchiseMode = false,
  showHeader = false,
  calendarWeeks = 5,
  onPreviousMonth,
  onCurrentMonth,
  onNextMonth,
}: {
  franchiseMode?: boolean;
  showHeader?: boolean;
  calendarWeeks?: number;
  onPreviousMonth?: () => void;
  onCurrentMonth?: () => void;
  onNextMonth?: () => void;
}) {
  return (
    <Box>
      {showHeader ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
            alignItems: { xs: 'flex-start', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            mb: 2.5,
          }}
        >
          <Box>
            <Typography
              component="h1"
              sx={{
                m: 0,
                color: '#201914',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 24,
                fontWeight: 700,
                lineHeight: 1.25,
              }}
            >
              ตารางงานพนักงาน
            </Typography>
            <Typography
              component="p"
              sx={{
                m: 0,
                mt: 0.5,
                color: 'text.secondary',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              ดูและวางแผนตารางกะของพนักงานในรูปแบบปฏิทิน
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" onClick={onPreviousMonth}>
              เดือนก่อน
            </Button>
            <Button size="small" variant="outlined" onClick={onCurrentMonth}>
              เดือนนี้
            </Button>
            <Button size="small" variant="outlined" onClick={onNextMonth}>
              เดือนถัดไป
            </Button>
          </Box>
        </Box>
      ) : null}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'minmax(0, 2fr) minmax(0, 8fr)',
          },
          gap: 1.5,
          mb: 2,
        }}
      >
        {!franchiseMode ? (
          <Card
            variant="outlined"
            sx={{
              minHeight: 116,
              p: 2,
              borderRadius: '15px',
              borderColor: '#e8ddd5',
            }}
          >
            <Skeleton variant="text" width={118} height={22} />
            <Skeleton variant="text" width={34} height={42} sx={{ mt: 0.25 }} />
          </Card>
        ) : null}
        <Card
          variant="outlined"
          sx={{
            minHeight: 116,
            p: 2,
            borderRadius: '15px',
            borderColor: '#e8ddd5',
          }}
        >
          <Skeleton
            variant="text"
            width={franchiseMode ? 150 : 138}
            height={22}
          />
          {franchiseMode ? (
            <Skeleton variant="text" width={34} height={42} sx={{ mt: 0.25 }} />
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 1,
                mt: 1.5,
              }}
            >
              {[1, 2].map((item) => (
                <Skeleton
                  key={item}
                  variant="rounded"
                  height={42}
                  sx={{ borderRadius: '10px' }}
                />
              ))}
            </Box>
          )}
        </Card>
        {franchiseMode ? (
          <Card
            variant="outlined"
            sx={{
              gridColumn: { xs: 'auto', sm: '2' },
              minHeight: 116,
              p: 2,
              borderRadius: '16px',
              borderColor: '#e8ddd5',
            }}
          >
            <Skeleton variant="text" width={116} height={22} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 1,
                mt: 1.5,
              }}
            >
              {[1, 2].map((item) => (
                <Skeleton
                  key={item}
                  variant="rounded"
                  height={42}
                  sx={{ borderRadius: '10px' }}
                />
              ))}
            </Box>
          </Card>
        ) : null}
      </Box>
      {!franchiseMode ? (
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Skeleton variant="text" width={126} height={34} />
          <Skeleton
            variant="rounded"
            width={74}
            height={40}
            sx={{ borderRadius: '12px' }}
          />
          <Skeleton
            variant="rounded"
            width={90}
            height={40}
            sx={{ borderRadius: '12px' }}
          />
        </Box>
      ) : null}
      <Card
        variant="outlined"
        sx={{
          borderRadius: '16px',
          borderColor: '#e8ddd5',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.75,
            borderBottom: '1px solid #eee4dd',
            bgcolor: '#fbf7f4',
          }}
        >
          <Skeleton variant="text" width={56} height={18} />
          <Skeleton variant="text" width={150} height={32} />
        </Box>
        <Box sx={{ overflow: 'hidden' }}>
          <Box sx={{ minWidth: 780 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                borderBottom: '1px solid #eee4dd',
              }}
            >
              {Array.from({ length: 7 }, (_, index) => (
                <Skeleton
                  key={index}
                  variant="text"
                  width={48}
                  height={30}
                  sx={{ mx: 'auto' }}
                />
              ))}
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              }}
            >
              {Array.from({ length: calendarWeeks * 7 }, (_, index) => (
                <Box
                  key={index}
                  sx={{
                    minHeight: 122,
                    p: 1.25,
                    borderRight: '1px solid #eee4dd',
                    borderBottom: '1px solid #eee4dd',
                    '&:nth-of-type(7n)': { borderRight: 0 },
                    '&:nth-last-child(-n + 7)': { borderBottom: 0 },
                  }}
                >
                  <Skeleton variant="circular" width={26} height={26} />
                  {index % 3 === 0 ? (
                    <Skeleton
                      variant="rounded"
                      height={38}
                      sx={{ mt: 2.5, borderRadius: '6px' }}
                    />
                  ) : null}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
