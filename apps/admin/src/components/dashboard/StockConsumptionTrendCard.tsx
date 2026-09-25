import { useMemo, useState } from 'react';
import { Box, Button, Card, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  getDashboardTrend,
  type DashboardScope,
  type DashboardTrendPoint,
} from '../../api';

type TrendPeriod = 'day' | 'month' | 'year';

const periodOptions: Array<{
  value: TrendPeriod;
  label: string;
  range: string;
}> = [
  { value: 'day', label: 'รายวัน', range: 'จันทร์–อาทิตย์' },
  { value: 'month', label: 'รายเดือน', range: '12 เดือนล่าสุด' },
  { value: 'year', label: 'รายปี', range: '5 ปีล่าสุด' },
];

const periodOptionByValue = Object.fromEntries(
  periodOptions.map((option) => [option.value, option]),
) as Record<TrendPeriod, (typeof periodOptions)[number]>;

const chartWidth = 680;
const chartHeight = 250;
const chartPadding = { top: 20, right: 20, bottom: 42, left: 46 };
const thaiShortMonths = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

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

function formatTrendAxisLabel(period: TrendPeriod, bucket: string) {
  const date = new Date(`${bucket}T12:00:00`);
  if (Number.isNaN(date.getTime())) return bucket;

  if (period === 'day') {
    return new Intl.DateTimeFormat('th-TH', { weekday: 'long' }).format(date);
  }
  if (period === 'month') {
    return thaiShortMonths[date.getMonth()];
  }
  return new Intl.DateTimeFormat('th-TH', { year: 'numeric' }).format(date);
}

function TrendChart({
  points,
  period,
  ariaLabel,
}: {
  points: DashboardTrendPoint[];
  period: TrendPeriod;
  ariaLabel: string;
}) {
  const displayPoints = useMemo(() => {
    if (period !== 'month') return points;

    // Keep the rolling 12-month result in calendar order so January is the
    // first reference point on the chart instead of the API's current-month
    // window start.
    return [...points].sort(
      (left, right) =>
        new Date(left.label).getMonth() - new Date(right.label).getMonth(),
    );
  }, [period, points]);
  const chart = useMemo(() => buildPath(displayPoints), [displayPoints]);
  const gridYs = [0, 0.5, 1].map(
    (ratio) =>
      chartPadding.top +
      (chartHeight - chartPadding.top - chartPadding.bottom) * ratio,
  );
  return (
    <Box sx={{ mt: 2.25, width: '100%', overflowX: 'auto' }}>
      <Box
        component="svg"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label={ariaLabel}
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
            key={displayPoints[index].label}
            cx={point.x}
            cy={point.y}
            r="4.5"
            fill="#fff"
            stroke="#805637"
            strokeWidth="3"
          />
        ))}
        {displayPoints.map((point, index) => {
          return (
            <text
              key={point.label}
              x={chart.coordinates[index].x}
              y={chartHeight - 13}
              textAnchor="middle"
              fill="#796b62"
              fontSize={
                period === 'month' ? '11' : period === 'year' ? '8' : '10'
              }
            >
              {formatTrendAxisLabel(period, point.label)}
            </text>
          );
        })}
      </Box>
    </Box>
  );
}

export function StockConsumptionTrendCard({
  branchCode,
  scope,
}: {
  branchCode?: string;
  scope?: DashboardScope;
}) {
  const [period, setPeriod] = useState<TrendPeriod>('day');
  const trend = useQuery({
    queryKey: ['dashboard-trend', period, branchCode, scope],
    queryFn: () => getDashboardTrend(period, branchCode, scope),
  });
  const total = (trend.data ?? []).reduce(
    (sum, point) => sum + point.quantity,
    0,
  );
  const activePeriod = periodOptionByValue[period];

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
              แนวโน้มการตัดสต็อกย้อนหลังแบบ{activePeriod.label}
            </Typography>
            <Typography
              sx={{ mt: 0.35, color: 'text.secondary', fontSize: 13 }}
            >
              จำนวนเมนูที่ตัดตามสูตรในช่วง {activePeriod.range}
            </Typography>
          </Box>
          <Box>
            <Typography
              sx={{ color: 'text.secondary', fontSize: 12, textAlign: 'right' }}
            >
              เลือกช่วงเวลาที่ต้องการดู
            </Typography>
            <Box
              aria-label="เลือกช่วงเวลาแสดงแนวโน้ม"
              role="group"
              sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}
            >
              {periodOptions.map((option) => (
                <Button
                  key={option.value}
                  aria-label={`${option.label} (${option.range})`}
                  variant={period === option.value ? 'contained' : 'outlined'}
                  onClick={() => setPeriod(option.value)}
                  sx={{
                    minWidth: { xs: 92, sm: 106 },
                    minHeight: 52,
                    borderRadius: '10px',
                    borderColor:
                      period === option.value ? '#201914' : '#d8c8bd',
                    bgcolor: period === option.value ? '#201914' : '#fff',
                    color: period === option.value ? '#fff' : '#5f4b3d',
                    boxShadow: 'none',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 13,
                    lineHeight: 1.1,
                  }}
                >
                  <Stack spacing={0.25} sx={{ alignItems: 'center' }}>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {option.label}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        fontSize: 10.5,
                        opacity: period === option.value ? 0.78 : 0.66,
                      }}
                    >
                      {option.range}
                    </Box>
                  </Stack>
                </Button>
              ))}
            </Box>
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
            <TrendChart
              points={trend.data ?? []}
              period={period}
              ariaLabel={`กราฟแนวโน้มย้อนหลังจำนวนเมนูที่ตัดสต็อกแบบ${activePeriod.label} ${activePeriod.range}`}
            />
          </>
        )}
      </Box>
    </Card>
  );
}
