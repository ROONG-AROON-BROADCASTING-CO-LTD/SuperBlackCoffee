import { useMemo, useState } from 'react';
import { Box, Button, Card, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getDashboardTrend, type DashboardTrendPoint } from '../../api';

type TrendPeriod = 'day' | 'month' | 'year';

const periodLabels: Record<TrendPeriod, string> = {
  day: 'รายวัน',
  month: 'รายเดือน',
  year: 'รายปี',
};

const chartWidth = 680;
const chartHeight = 250;
const chartPadding = { top: 20, right: 20, bottom: 42, left: 46 };

const buildPath = (points: DashboardTrendPoint[]) => {
  const maxValue = Math.max(...points.map((point) => point.quantity), 1);
  const innerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const coordinates = points.map((point, index) => ({
    x:
      chartPadding.left +
      (points.length <= 1
        ? innerWidth / 2
        : (index / (points.length - 1)) * innerWidth),
    y:
      chartPadding.top +
      innerHeight -
      (point.quantity / maxValue) * innerHeight,
  }));
  return {
    maxValue,
    coordinates,
    path: coordinates
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' '),
  };
};

function TrendChart({ points }: { points: DashboardTrendPoint[] }) {
  const chart = useMemo(() => buildPath(points), [points]);
  const gridYs = [0, 0.5, 1].map(
    (ratio) =>
      chartPadding.top +
      (chartHeight - chartPadding.top - chartPadding.bottom) * ratio,
  );
  const labels =
    points.length > 6
      ? points.filter(
          (_, index) => index % 2 === 0 || index === points.length - 1,
        )
      : points;

  return (
    <Box sx={{ mt: 2.25, width: '100%', overflowX: 'auto' }}>
      <Box
        component="svg"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label="กราฟเส้นจำนวนเมนูที่ตัดสต๊อก"
        sx={{ display: 'block', minWidth: 510, width: '100%', height: 'auto' }}
      >
        {gridYs.map((y) => (
          <line
            key={y}
            x1={chartPadding.left}
            x2={chartWidth - chartPadding.right}
            y1={y}
            y2={y}
            stroke="#eee4dd"
            strokeWidth="1"
          />
        ))}
        <text
          x={chartPadding.left - 8}
          y={chartPadding.top + 4}
          textAnchor="end"
          fill="#796b62"
          fontSize="12"
        >
          {Math.ceil(chart.maxValue).toLocaleString('th-TH')}
        </text>
        <text
          x={chartPadding.left - 8}
          y={chartHeight - chartPadding.bottom + 4}
          textAnchor="end"
          fill="#796b62"
          fontSize="12"
        >
          0
        </text>
        {chart.path && (
          <path
            d={chart.path}
            fill="none"
            stroke="#805637"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {chart.coordinates.map((point, index) => (
          <circle
            key={points[index].label}
            cx={point.x}
            cy={point.y}
            r="4.5"
            fill="#fff"
            stroke="#805637"
            strokeWidth="3"
          />
        ))}
        {labels.map((point) => {
          const index = points.indexOf(point);
          return (
            <text
              key={point.label}
              x={chart.coordinates[index].x}
              y={chartHeight - 13}
              textAnchor="middle"
              fill="#796b62"
              fontSize="12"
            >
              {point.label}
            </text>
          );
        })}
      </Box>
    </Box>
  );
}

export function StockConsumptionTrendCard({
  branchCode,
}: {
  branchCode?: string;
}) {
  const [period, setPeriod] = useState<TrendPeriod>('day');
  const trend = useQuery({
    queryKey: ['dashboard-trend', period, branchCode],
    queryFn: () => getDashboardTrend(period, branchCode),
  });
  const total = (trend.data ?? []).reduce(
    (sum, point) => sum + point.quantity,
    0,
  );

  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: '16px', borderColor: '#e8ddd5', boxShadow: 'none' }}
    >
      <Box sx={{ p: { xs: 2, md: 2.75 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{
            justifyContent: 'space-between',
            alignItems: { sm: 'flex-start' },
            gap: 1.5,
          }}
        >
          <Box>
            <Typography
              sx={{
                color: '#201914',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 19,
                fontWeight: 600,
              }}
            >
              แนวโน้มการตัดสต๊อก
            </Typography>
            <Typography
              sx={{ mt: 0.35, color: 'text.secondary', fontSize: 13 }}
            >
              จำนวนเมนูที่ตัดตามสูตรจากข้อมูลที่บันทึกจริง
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {(Object.keys(periodLabels) as TrendPeriod[]).map((option) => (
              <Button
                key={option}
                size="small"
                variant={period === option ? 'contained' : 'outlined'}
                onClick={() => setPeriod(option)}
                sx={{
                  minHeight: 34,
                  borderRadius: '10px',
                  borderColor: period === option ? '#201914' : '#d8c8bd',
                  bgcolor: period === option ? '#201914' : '#fff',
                  color: period === option ? '#fff' : '#5f4b3d',
                  boxShadow: 'none',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 12,
                }}
              >
                {periodLabels[option]}
              </Button>
            ))}
          </Box>
        </Stack>
        {trend.isError ? (
          <Typography sx={{ mt: 3, color: '#a22e2a', fontSize: 13 }}>
            ไม่สามารถโหลดข้อมูลแนวโน้มได้
          </Typography>
        ) : trend.isLoading ? (
          <Typography sx={{ mt: 3, color: 'text.secondary', fontSize: 13 }}>
            กำลังโหลดแนวโน้ม…
          </Typography>
        ) : (
          <>
            <Typography
              sx={{
                mt: 2.25,
                color: '#805637',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 24,
                fontWeight: 750,
              }}
            >
              {total.toLocaleString('th-TH')}{' '}
              <Box
                component="span"
                sx={{ color: 'text.secondary', fontSize: 14, fontWeight: 500 }}
              >
                เมนู
              </Box>
            </Typography>
            <TrendChart points={trend.data ?? []} />
          </>
        )}
      </Box>
    </Card>
  );
}
