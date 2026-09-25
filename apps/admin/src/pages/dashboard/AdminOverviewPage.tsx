import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  Card,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  DashboardMain,
  formatCurrency,
  PageIntro,
  useMinimumLoading,
} from '@stackbuild/ui';
import { type Branch as ApiBranch } from '../../api/branches';
import { useDashboardSummary } from '../../hooks/useDashboardSummary';
import { AdminOverviewSkeleton } from '../../components/skeletons/AdminOverviewSkeleton';
import { StockConsumptionTrendCard } from '../../components/dashboard/StockConsumptionTrendCard';
import type { AdminPage } from '../../routes/adminRoutes';
import {
  getSalesTrend,
  getTopSellingMenus,
  listInventory,
  type DashboardScope,
  type SalesTrendPoint,
  type TopSellingMenu,
} from '../../api';

type OverviewAction = {
  title: string;
  description: string;
  page: AdminPage;
  marker: string;
};

const overviewActions: OverviewAction[] = [
  {
    title: 'จัดการคำสั่งซื้อ',
    description: 'ตรวจสอบและดำเนินการตามรายการขาย',
    page: 'คำสั่งซื้อ',
    marker: '01',
  },
  {
    title: 'ตรวจสอบสต๊อก',
    description: 'ดูคำขอเติมสินค้าและสถานะการจัดส่ง',
    page: 'สต๊อกอุปกรณ์เครื่องดื่ม',
    marker: '02',
  },
  {
    title: 'จัดการเมนูและสินค้า',
    description: 'เพิ่ม แก้ไข หรือปิดการขายสินค้า',
    page: 'เมนูและสินค้า',
    marker: '03',
  },
];

const cardSx = {
  borderRadius: '16px',
  borderColor: '#e8ddd5',
  boxShadow: 'none',
};
const eyebrowSx = {
  color: '#6e625a',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 13,
  fontWeight: 500,
};
const formatCount = (count: number) => count.toLocaleString('th-TH');
const salesChartWidth = 680;
const salesChartHeight = 250;
// Reserve enough room for Thai currency labels such as "1,000,000 บาท".
// SVG clips text outside its viewBox, so the previous narrow Y-axis gutter
// could cut off the beginning of larger values.
const salesChartPadding = { top: 20, right: 20, bottom: 42, left: 88 };

type SalesPeriod = 'day' | 'month' | 'year';

const salesPeriodOptions: Array<{
  value: SalesPeriod;
  label: string;
  range: string;
}> = [
  {
    value: 'day',
    label: 'รายวัน',
    range: 'จันทร์–อาทิตย์',
  },
  {
    value: 'month',
    label: 'รายเดือน',
    range: '12 เดือนล่าสุด',
  },
  { value: 'year', label: 'รายปี', range: '5 ปีล่าสุด' },
];

const salesPeriodOptionByValue = Object.fromEntries(
  salesPeriodOptions.map((option) => [option.value, option]),
) as Record<SalesPeriod, (typeof salesPeriodOptions)[number]>;

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

function formatSalesAxisLabel(period: SalesPeriod, bucket: string) {
  const date = new Date(`${bucket}T12:00:00`);
  if (Number.isNaN(date.getTime())) return bucket;
  if (period === 'day') {
    return new Intl.DateTimeFormat('th-TH', { weekday: 'long' }).format(date);
  }
  if (period === 'month') return thaiShortMonths[date.getMonth()];
  return new Intl.DateTimeFormat('th-TH', { year: 'numeric' }).format(date);
}

function AggregateSalesBarChart({
  period,
  points,
}: {
  period: SalesPeriod;
  points: SalesTrendPoint[];
}) {
  const displayPoints = useMemo(
    () =>
      period === 'month'
        ? [...points].sort(
            (left, right) =>
              new Date(left.label).getMonth() -
              new Date(right.label).getMonth(),
          )
        : points,
    [period, points],
  );
  const chart = useMemo(() => {
    const highestSales = Math.max(
      ...displayPoints.map((point) => point.sales),
      0,
    );
    const maxSales = Math.max(highestSales, 1);
    const innerWidth =
      salesChartWidth - salesChartPadding.left - salesChartPadding.right;
    const innerHeight =
      salesChartHeight - salesChartPadding.top - salesChartPadding.bottom;
    const step = innerWidth / Math.max(displayPoints.length, 1);
    const barWidth = Math.min(42, step * 0.56);
    return {
      highestSales,
      maxSales,
      innerHeight,
      barWidth,
      points: displayPoints.map((point, index) => ({
        ...point,
        x: salesChartPadding.left + step * index + (step - barWidth) / 2,
        height: (point.sales / maxSales) * innerHeight,
      })),
    };
  }, [displayPoints]);

  const gridYs = [0, 0.5, 1].map(
    (ratio) => salesChartPadding.top + chart.innerHeight * ratio,
  );

  return (
    <Box sx={{ mt: 2.25, width: '100%', overflowX: 'auto' }}>
      <Box
        component="svg"
        viewBox={`0 0 ${salesChartWidth} ${salesChartHeight}`}
        role="img"
        aria-label={`กราฟแท่งยอดขายรวมทุกสาขาแบบ${salesPeriodOptionByValue[period].label}`}
        sx={{ display: 'block', minWidth: 510, width: '100%', height: 'auto' }}
      >
        {gridYs.map((y) => (
          <line
            key={y}
            x1={salesChartPadding.left}
            x2={salesChartWidth - salesChartPadding.right}
            y1={y}
            y2={y}
            stroke="#eee4dd"
            strokeWidth="1"
          />
        ))}
        <text
          x={salesChartPadding.left - 8}
          y={salesChartPadding.top + 4}
          textAnchor="end"
          fill="#796b62"
          fontSize="8"
        >
          {chart.highestSales === 0 ? '0 บาท' : formatCurrency(chart.maxSales)}
        </text>
        <text
          x={salesChartPadding.left - 8}
          y={salesChartHeight - salesChartPadding.bottom + 4}
          textAnchor="end"
          fill="#796b62"
          fontSize="9"
        >
          0
        </text>
        {chart.points.map((point) => (
          <rect
            key={point.label}
            x={point.x}
            y={salesChartPadding.top + chart.innerHeight - point.height}
            width={chart.barWidth}
            height={point.height}
            fill="#805637"
          />
        ))}
        {chart.points.map((point) => {
          // The Y-axis already identifies the maximum. Rendering the same
          // value above its bar would overlap that axis label at the chart top.
          if (point.sales > 0 && point.sales === chart.highestSales) {
            return null;
          }
          const barTop =
            salesChartPadding.top + chart.innerHeight - point.height;
          return (
            <text
              key={`${point.label}-value`}
              x={point.x + chart.barWidth / 2}
              y={Math.max(salesChartPadding.top + 12, barTop - 6)}
              textAnchor="middle"
              fill="#805637"
              fontSize="8"
              fontWeight="600"
            >
              {formatCurrency(point.sales)}
            </text>
          );
        })}
        {chart.points.map((point) => (
          <text
            key={point.label}
            x={point.x + chart.barWidth / 2}
            y={salesChartHeight - 13}
            textAnchor="middle"
            fill="#796b62"
            fontSize={
              period === 'month' ? '11' : period === 'year' ? '8' : '10'
            }
          >
            {formatSalesAxisLabel(period, point.label)}
          </text>
        ))}
      </Box>
    </Box>
  );
}

function SalesTrendCard({
  points,
  period,
  onPeriodChange,
  isError,
  isLoading,
}: {
  points: SalesTrendPoint[];
  period: SalesPeriod;
  onPeriodChange: (period: SalesPeriod) => void;
  isError: boolean;
  isLoading: boolean;
}) {
  const activePeriod = salesPeriodOptionByValue[period];
  const totalSales = points.reduce((total, point) => total + point.sales, 0);

  return (
    <Card variant="outlined" sx={cardSx}>
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
              ยอดขายรวมทุกสาขาแบบ{activePeriod.label}
            </Typography>
            <Typography
              sx={{ mt: 0.35, color: 'text.secondary', fontSize: 13 }}
            >
              ยอดขายที่ชำระแล้วในช่วง {activePeriod.range}
            </Typography>
          </Box>
          <Box>
            <Typography
              sx={{ color: 'text.secondary', fontSize: 12, textAlign: 'right' }}
            >
              เลือกช่วงเวลาที่ต้องการดู
            </Typography>
            <Box
              aria-label="เลือกช่วงเวลาแสดงยอดขาย"
              role="group"
              sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}
            >
              {salesPeriodOptions.map((option) => (
                <Button
                  key={option.value}
                  aria-label={`${option.label} (${option.range})`}
                  variant={period === option.value ? 'contained' : 'outlined'}
                  onClick={() => onPeriodChange(option.value)}
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
        {isError ? (
          <Typography sx={{ mt: 3, color: '#a22e2a', fontSize: 13 }}>
            ไม่สามารถโหลดข้อมูลยอดขายได้
          </Typography>
        ) : isLoading ? (
          <Typography sx={{ mt: 3, color: 'text.secondary', fontSize: 13 }}>
            กำลังโหลดยอดขาย…
          </Typography>
        ) : points.length === 0 ? (
          <Typography sx={{ mt: 3, color: 'text.secondary', fontSize: 13 }}>
            ยังไม่มีข้อมูลยอดขายในช่วงเวลานี้
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
              {formatCurrency(totalSales)}
            </Typography>
            <AggregateSalesBarChart period={period} points={points} />
          </>
        )}
      </Box>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  helper,
  accent,
}: {
  label: string;
  value: string;
  helper: string;
  accent: string;
}) {
  return (
    <Card variant="outlined" sx={cardSx}>
      <Box sx={{ p: { xs: 2, md: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography sx={eyebrowSx}>{label}</Typography>
          <Box
            sx={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              bgcolor: accent,
              mt: 0.6,
            }}
          />
        </Box>
        <Typography
          sx={{
            mt: 1.25,
            color: '#201914',
            fontSize: { xs: 25, md: 31 },
            fontWeight: 800,
            lineHeight: 1.1,
          }}
        >
          {value}
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary', fontSize: 12.5 }}>
          {helper}
        </Typography>
      </Box>
    </Card>
  );
}

function FollowUpRow({
  title,
  detail,
  count,
  tone,
  onClick,
}: {
  title: string;
  detail: string;
  count: number;
  tone: string;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        border: '1px solid #eee4dd',
        borderRadius: '12px',
        textAlign: 'left',
        '&:hover': { borderColor: '#c9a78e', bgcolor: '#fdfaf8' },
        '&:focus-visible': {
          outline: '3px solid rgba(128,86,55,.28)',
          outlineOffset: 2,
        },
      }}
    >
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: tone,
          flexShrink: 0,
        }}
      />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            color: '#201914',
            fontFamily: 'Kanit, sans-serif',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {title}
        </Typography>
        <Typography sx={{ mt: 0.1, color: 'text.secondary', fontSize: 12.5 }}>
          {detail}
        </Typography>
      </Box>
      <Typography sx={{ color: '#201914', fontSize: 21, fontWeight: 800 }}>
        {formatCount(count)}
      </Typography>
      <Typography
        aria-hidden
        sx={{ color: '#805637', fontSize: 21, lineHeight: 1 }}
      >
        ›
      </Typography>
    </ButtonBase>
  );
}

function SalesSummaryCard({ sales }: { sales: number }) {
  return (
    <Card variant="outlined" sx={cardSx}>
      <Box sx={{ p: { xs: 2, md: 2.75 } }}>
        <Typography
          sx={{
            color: '#201914',
            fontFamily: 'Kanit, sans-serif',
            fontSize: 19,
            fontWeight: 600,
          }}
        >
          สรุปยอดขายวันนี้
        </Typography>
        <Typography sx={{ mt: 0.35, color: 'text.secondary', fontSize: 13 }}>
          ข้อมูลจากคำสั่งซื้อที่ชำระเงินแล้ว
        </Typography>
        <Box
          sx={{
            mt: 2.5,
            p: { xs: 2, md: 2.5 },
            borderRadius: '14px',
            bgcolor: '#201914',
            color: '#fff',
          }}
        >
          <Typography
            sx={{
              color: '#d6b59d',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 13,
            }}
          >
            รายได้สะสม
          </Typography>
          <Typography
            sx={{
              mt: 0.7,
              fontSize: { xs: 31, md: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            {formatCurrency(sales)}
          </Typography>
          <Typography
            sx={{ mt: 1, color: 'rgba(255,255,255,.7)', fontSize: 13 }}
          >
            จากคำสั่งซื้อที่ชำระเงินแล้ว
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}

function BestSellingMenuCard({
  menus,
  isLoading,
  isError,
}: {
  menus: TopSellingMenu[];
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <Card variant="outlined" sx={cardSx}>
      <Box sx={{ p: { xs: 2, md: 2.75 } }}>
        <Typography
          sx={{
            color: '#201914',
            fontFamily: 'Kanit, sans-serif',
            fontSize: 19,
            fontWeight: 600,
          }}
        >
          เมนูที่ขายดี
        </Typography>
        <Typography sx={{ mt: 0.35, color: 'text.secondary', fontSize: 13 }}>
          จัดอันดับจากจำนวนเมนูที่ขายได้วันนี้
        </Typography>
        {isLoading ? (
          <Typography sx={{ mt: 2.25, color: 'text.secondary', fontSize: 13 }}>
            กำลังโหลดเมนูที่ขายดี…
          </Typography>
        ) : isError ? (
          <Typography sx={{ mt: 2.25, color: '#a22e2a', fontSize: 13 }}>
            ไม่สามารถโหลดอันดับเมนูขายดีได้
          </Typography>
        ) : menus.length > 0 ? (
          <Stack spacing={1} sx={{ mt: 2.25 }}>
            {menus.map((menu, index) => (
              <Box
                key={menu.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  p: 1.25,
                  border: '1px solid #eee4dd',
                  borderRadius: '12px',
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: index === 0 ? '#805637' : '#f1e8e2',
                    color: index === 0 ? '#fff' : '#805637',
                    fontSize: 13,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    noWrap
                    sx={{
                      color: '#201914',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {menu.name}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                    ขาย {formatCount(menu.quantity)} รายการ
                  </Typography>
                </Box>
                <Typography
                  sx={{ color: '#805637', fontSize: 14, fontWeight: 700 }}
                >
                  {formatCurrency(menu.sales)}
                </Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <Box
            sx={{
              mt: 2.25,
              p: 2,
              border: '1px dashed #d8c8bd',
              borderRadius: '12px',
              bgcolor: '#fdfaf8',
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                color: '#5f5148',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              ยังไม่มีข้อมูลยอดขายรายเมนู
            </Typography>
            <Typography
              sx={{ mt: 0.35, color: 'text.secondary', fontSize: 12 }}
            >
              ยอดขายจะแสดงเมื่อพนักงานยืนยันตัดสต๊อกจาก Stock app
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
}

export function AdminOverviewPage({
  onNavigate,
  scope = 'sbc',
  branchDirectory = [],
}: {
  onNavigate: (page: AdminPage) => void;
  scope?: DashboardScope;
  branchDirectory?: ApiBranch[];
}) {
  const [selectedBranch, setSelectedBranch] = useState('ทุกสาขา');
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>('day');
  const scopedBranches = useMemo(() => {
    const matchingBranches = branchDirectory.filter((branch) =>
      scope === 'franchise'
        ? Boolean(branch.franchiseeId)
        : !branch.franchiseeId && !branch.isHeadquarters,
    );
    if (matchingBranches.length || scope === 'franchise')
      return matchingBranches;
    return [
      { id: 0, name: 'อยุธยา', code: 'SBC-AYA-001' },
      { id: 0, name: 'พิษณุโลก', code: 'SBC-PLK-001' },
    ] satisfies ApiBranch[];
  }, [branchDirectory, scope]);
  const branchOptions = useMemo(
    () => ['ทุกสาขา', ...scopedBranches.map((branch) => branch.name)],
    [scopedBranches],
  );
  useEffect(() => {
    if (branchOptions.includes(selectedBranch)) return;
    setSelectedBranch('ทุกสาขา');
  }, [branchOptions, selectedBranch]);
  const selectedBranchCode =
    selectedBranch === 'ทุกสาขา'
      ? undefined
      : scopedBranches.find((branch) => branch.name === selectedBranch)?.code;
  const dashboard = useDashboardSummary(selectedBranchCode, scope);
  const salesTrend = useQuery({
    queryKey: ['dashboard-sales-trend', salesPeriod, scope],
    queryFn: () => getSalesTrend(salesPeriod, scope),
  });
  const topSellingMenus = useQuery({
    queryKey: ['dashboard-top-menus', selectedBranchCode, scope],
    queryFn: () => getTopSellingMenus(selectedBranchCode, scope),
  });
  const branchStock = useQuery({
    queryKey: ['overview-branch-stock', scope],
    queryFn: async () => {
      const entries = await Promise.all(
        scopedBranches.map(async (branch) => {
          const items = await listInventory('stock', branch.code);
          return {
            branch: branch.name,
            quantity: items.reduce((total, item) => total + item.quantity, 0),
            low: items.filter((item) => item.status !== 'ready').length,
          };
        }),
      );
      return entries;
    },
  });
  const inventoryAttention = useQuery({
    queryKey: ['overview-inventory-attention', scope],
    queryFn: async () =>
      Promise.all(
        scopedBranches.map(async (branch) => ({
          branch: branch.name,
          items: await listInventory('ingredient', branch.code),
        })),
      ),
  });
  const sales = dashboard.data?.todaySales ?? 0;
  const stockCuts = dashboard.data?.todayMenuStockCuts ?? 0;
  const stockEntries = dashboard.data?.todayStockEntries ?? 0;
  const rawLoading =
    dashboard.isLoading ||
    salesTrend.isLoading ||
    topSellingMenus.isLoading ||
    branchStock.isLoading ||
    inventoryAttention.isLoading;
  const isLoading = useMinimumLoading(rawLoading);
  const followUps = useMemo(() => {
    const ingredients = (inventoryAttention.data ?? [])
      .filter(
        ({ branch }) =>
          selectedBranch === 'ทุกสาขา' || branch === selectedBranch,
      )
      .flatMap(({ items }) => items);
    const options = [
      {
        title: 'วัตถุดิบใกล้หมดอายุ',
        detail: 'วางแผนใช้งานก่อนถึงวันหมดอายุ',
        count: ingredients.filter(
          (item) =>
            item.trackStock !== false && item.expiryStatus === 'expiring_soon',
        ).length,
        tone: '#d59a31',
      },
      {
        title: 'วัตถุดิบหมด',
        detail: 'เติมสต๊อกเพื่อไม่ให้กระทบการขาย',
        count: ingredients.filter(
          (item) => item.trackStock !== false && item.status === 'out',
        ).length,
        tone: '#c73b32',
      },
      {
        title: 'วัตถุดิบใกล้หมด',
        detail: 'ตรวจสอบและเตรียมเติมสต๊อก',
        count: ingredients.filter(
          (item) => item.trackStock !== false && item.status === 'low',
        ).length,
        tone: '#d59a31',
      },
      {
        title: 'วัตถุดิบค้างสต๊อก',
        detail: 'มีของเหลือ แต่ไม่มีการเคลื่อนไหวเกิน 30 วัน',
        count: ingredients.filter(
          (item) => item.trackStock !== false && item.status === 'stale',
        ).length,
        tone: '#8a6d3b',
      },
    ];
    return options.filter((option) => option.count > 0).slice(0, 2);
  }, [inventoryAttention.data, selectedBranch]);
  const hasError =
    dashboard.isError ||
    salesTrend.isError ||
    topSellingMenus.isError ||
    branchStock.isError ||
    inventoryAttention.isError;
  const branchStockRows = (branchStock.data ?? []).filter(
    (branch) =>
      selectedBranch === 'ทุกสาขา' || branch.branch === selectedBranch,
  );
  const overviewSales = sales;
  const updatedAt = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  return (
    <DashboardMain>
      <Stack spacing={2.25}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <PageIntro
            title={
              scope === 'franchise'
                ? 'ภาพรวมการดำเนินงานแฟรนไชส์วันนี้'
                : 'ภาพรวมการดำเนินงานวันนี้'
            }
            description={
              scope === 'franchise'
                ? 'ดูยอดขายและงานที่ควรติดตามจากข้อมูลแฟรนไชส์'
                : 'ดูยอดขายและงานที่ควรติดตามจากข้อมูลในระบบ'
            }
          />
          <Typography sx={{ color: 'text.secondary', fontSize: 12.5 }}>
            อัปเดตเมื่อ {updatedAt}
          </Typography>
        </Box>
        {isLoading ? (
          <AdminOverviewSkeleton />
        ) : (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="overview-branch-filter-label">
                  เลือกสาขา
                </InputLabel>
                <Select
                  labelId="overview-branch-filter-label"
                  id="overview-branch-filter"
                  value={selectedBranch}
                  label="เลือกสาขา"
                  onChange={(event) => setSelectedBranch(event.target.value)}
                  sx={{
                    borderRadius: '12px',
                    bgcolor: '#fff',
                    fontFamily: 'Kanit, sans-serif',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#d8c8bd',
                    },
                  }}
                >
                  {branchOptions.map((branch) => (
                    <MenuItem key={branch} value={branch}>
                      {branch}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {hasError ? (
              <Box
                role="alert"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  border: '1px solid #e7b8ae',
                  borderRadius: '12px',
                  bgcolor: '#fff7f5',
                  p: 1.5,
                  color: '#9d3322',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 14,
                }}
              >
                <span>
                  โหลดข้อมูลบางส่วนไม่สำเร็จ · กำลังลองเชื่อมต่อใหม่อัตโนมัติ
                </span>
              </Box>
            ) : null}
            <SalesSummaryCard sales={overviewSales} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              <MetricCard
                label="เมนูที่ตัดสต๊อกวันนี้"
                value={hasError ? '—' : `${formatCount(stockCuts)} รายการ`}
                helper={
                  hasError
                    ? 'โหลดข้อมูลไม่สำเร็จ'
                    : 'จากการบันทึกขายผ่าน Stock app'
                }
                accent={hasError ? '#b63b35' : '#805637'}
              />
              <MetricCard
                label="รอบที่บันทึกตัดสต๊อก"
                value={hasError ? '—' : `${formatCount(stockEntries)} รอบ`}
                helper={
                  hasError
                    ? 'โหลดข้อมูลไม่สำเร็จ'
                    : 'รายการที่พนักงานยืนยันในวันนี้'
                }
                accent={hasError ? '#b63b35' : '#4c8f70'}
              />
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: 2,
              }}
            >
              <SalesTrendCard
                points={salesTrend.data ?? []}
                period={salesPeriod}
                onPeriodChange={setSalesPeriod}
                isError={salesTrend.isError}
                isLoading={salesTrend.isLoading}
              />
              <StockConsumptionTrendCard
                branchCode={selectedBranchCode}
                scope={scope}
              />
              <BestSellingMenuCard
                menus={topSellingMenus.data ?? []}
                isLoading={topSellingMenus.isLoading}
                isError={topSellingMenus.isError}
              />
              <Card variant="outlined" sx={cardSx}>
                <Box sx={{ p: { xs: 2, md: 2.75 } }}>
                  <Typography
                    sx={{
                      color: '#201914',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 19,
                      fontWeight: 600,
                    }}
                  >
                    สต๊อกแยกตามสาขา
                  </Typography>
                  <Typography
                    sx={{ mt: 0.35, color: 'text.secondary', fontSize: 13 }}
                  >
                    จำนวนคงเหลือและรายการที่ต้องติดตาม
                  </Typography>
                  <Stack spacing={1.25} sx={{ mt: 2.3 }}>
                    {branchStock.isError ? (
                      <Typography sx={{ color: '#a22e2a', fontSize: 13 }}>
                        ไม่สามารถโหลดข้อมูลสต๊อกได้
                      </Typography>
                    ) : (
                      branchStockRows.map((branch) => (
                        <Box
                          key={branch.branch}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 2,
                            p: 1.5,
                            border: '1px solid #eee4dd',
                            borderRadius: '12px',
                          }}
                        >
                          <Box>
                            <Typography
                              sx={{
                                fontFamily: 'Kanit, sans-serif',
                                fontSize: 15,
                                fontWeight: 600,
                              }}
                            >
                              {branch.branch}
                            </Typography>
                            <Typography
                              sx={{
                                mt: 0.1,
                                color: 'text.secondary',
                                fontSize: 12,
                              }}
                            >
                              คงเหลือ {branch.quantity.toLocaleString('th-TH')}{' '}
                              หน่วย
                            </Typography>
                          </Box>
                          <Typography
                            sx={{
                              color: branch.low ? '#a76415' : '#3c5b47',
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {branch.low
                              ? `${branch.low} รายการใกล้หมด`
                              : 'พร้อมใช้งาน'}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Stack>
                </Box>
              </Card>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  xl: '1fr',
                },
                gap: 2,
              }}
            >
              <Card variant="outlined" sx={cardSx}>
                <Box sx={{ p: { xs: 2, md: 2.75 } }}>
                  <Typography
                    sx={{
                      color: '#201914',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 19,
                      fontWeight: 600,
                    }}
                  >
                    สิ่งที่ต้องติดตาม
                  </Typography>
                  <Typography
                    sx={{ mt: 0.35, color: 'text.secondary', fontSize: 13 }}
                  >
                    จัดลำดับจากความเสี่ยงของวัตถุดิบในสต๊อก
                  </Typography>
                  <Stack spacing={1.25} sx={{ mt: 2.3 }}>
                    {followUps.length ? (
                      followUps.map((followUp) => (
                        <FollowUpRow
                          key={followUp.title}
                          {...followUp}
                          onClick={() => onNavigate('วัตถุดิบ')}
                        />
                      ))
                    ) : (
                      <Typography
                        sx={{ color: 'text.secondary', fontSize: 14, py: 2 }}
                      >
                        ไม่มีรายการเร่งด่วนที่ต้องติดตาม
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Card>
            </Box>
            <Card variant="outlined" sx={cardSx}>
              <Box sx={{ p: { xs: 2, md: 2.75 } }}>
                <Typography
                  sx={{
                    color: '#201914',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 19,
                    fontWeight: 600,
                  }}
                >
                  ทางลัด
                </Typography>
                <Typography
                  sx={{ mt: 0.35, color: 'text.secondary', fontSize: 13 }}
                >
                  ไปยังงานที่ใช้บ่อยของผู้ดูแลระบบ
                </Typography>
                <Divider sx={{ my: 2.2, borderColor: '#eee4dd' }} />
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(0, 1fr))',
                      lg: 'repeat(4, minmax(0, 1fr))',
                    },
                    gap: 1.25,
                  }}
                >
                  {overviewActions.map((action) => (
                    <ButtonBase
                      key={action.page}
                      onClick={() => onNavigate(action.page)}
                      sx={{
                        display: 'block',
                        border: '1px solid #eee4dd',
                        borderRadius: '12px',
                        p: 1.75,
                        textAlign: 'left',
                        transition:
                          'transform 160ms ease, border-color 160ms ease, background-color 160ms ease',
                        '&:hover': {
                          bgcolor: '#fdfaf8',
                          borderColor: '#c9a78e',
                          transform: 'translateY(-2px)',
                        },
                        '&:focus-visible': {
                          outline: '3px solid rgba(128,86,55,.28)',
                          outlineOffset: 2,
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          color: '#b28a6d',
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: 1,
                        }}
                      >
                        {action.marker}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.8,
                          color: '#201914',
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        {action.title}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.35,
                          color: 'text.secondary',
                          fontSize: 12.5,
                          lineHeight: 1.45,
                        }}
                      >
                        {action.description}
                      </Typography>
                    </ButtonBase>
                  ))}
                </Box>
              </Box>
            </Card>
          </>
        )}
      </Stack>
    </DashboardMain>
  );
}
