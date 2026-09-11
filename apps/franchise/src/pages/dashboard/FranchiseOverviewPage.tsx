import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Skeleton,
  Typography,
} from '@mui/material';
import {
  branchCodeByBranch,
  getDashboardSummary,
  listEmployees,
  listInventory,
  listMenuItems,
} from '@stackbuild/management';
import { formatCurrency } from '@stackbuild/ui';
import {
  franchiseBranch,
  type FranchisePlan,
} from '../../components/sidebar/franchiseSidebarNavigation';

const cardSx = {
  borderRadius: '16px',
  borderColor: '#e8ddd5',
  boxShadow: 'none',
  bgcolor: '#fff',
};

type Page =
  | 'คำสั่งซื้อ'
  | 'เมนูและสินค้า'
  | 'วัตถุดิบ'
  | 'สต๊อกอุปกรณ์เครื่องดื่ม'
  | 'ตารางพนักงาน';

function Metric({
  label,
  value,
  detail,
  color = '#805637',
}: {
  label: string;
  value: string;
  detail: string;
  color?: string;
}) {
  return (
    <Card variant="outlined" sx={{ ...cardSx, p: { xs: 1.75, lg: 2 } }}>
      <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
        {label}
      </Typography>
      <Typography
        sx={{ mt: 0.45, color: '#201914', fontSize: 27, fontWeight: 800 }}
      >
        {value}
      </Typography>
      <Typography sx={{ mt: 0.5, color, fontSize: 12.5 }}>{detail}</Typography>
    </Card>
  );
}

function State({ value }: { value: number }) {
  const good = value === 0;
  return (
    <Chip
      label={good ? 'พร้อมใช้งาน' : `${value} รายการ`}
      size="small"
      sx={{
        height: 24,
        borderRadius: '8px',
        bgcolor: good ? '#e6f4eb' : '#fff2dc',
        color: good ? '#247548' : '#a86a00',
        fontSize: 11.5,
      }}
    />
  );
}

function FranchiseOverviewLoading() {
  return (
    <Box sx={{ display: 'grid', gap: 1.75 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            xl: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 1.75,
        }}
      >
        {[1, 2, 3, 4].map((item) => (
          <Skeleton
            key={item}
            variant="rounded"
            height={126}
            sx={{ borderRadius: '16px' }}
          />
        ))}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.4fr) 1fr' },
          gap: 1.75,
        }}
      >
        <Skeleton
          variant="rounded"
          height={250}
          sx={{ borderRadius: '16px' }}
        />
        <Skeleton
          variant="rounded"
          height={250}
          sx={{ borderRadius: '16px' }}
        />
      </Box>
    </Box>
  );
}

export function FranchiseOverviewPage({
  plan,
  onNavigate,
}: {
  plan: FranchisePlan;
  onNavigate: (page: Page) => void;
}) {
  const branchCode = branchCodeByBranch[franchiseBranch];
  const dashboard = useQuery({
    queryKey: ['franchise-dashboard-summary'],
    queryFn: getDashboardSummary,
  });
  const menu = useQuery({
    queryKey: ['franchise-dashboard-menu', branchCode],
    queryFn: () => listMenuItems(branchCode),
  });
  const ingredients = useQuery({
    queryKey: ['franchise-dashboard-ingredients', branchCode],
    queryFn: () => listInventory('ingredient', branchCode),
  });
  const stock = useQuery({
    queryKey: ['franchise-dashboard-stock', branchCode],
    queryFn: () => listInventory('stock', branchCode),
  });
  const employees = useQuery({
    queryKey: ['franchise-dashboard-employees'],
    queryFn: listEmployees,
  });

  const data = useMemo(() => {
    const menuItems = menu.data ?? [];
    const ingredientItems = ingredients.data ?? [];
    const stockItems = stock.data ?? [];
    const unavailable = menuItems.filter(
      (item) => item.status === 'soldout',
    ).length;
    const ingredientAlert = ingredientItems.filter(
      (item) => item.status !== 'ready',
    ).length;
    const stockAlert = stockItems.filter(
      (item) => item.status !== 'ready',
    ).length;
    const sources = [
      {
        label: 'เมนูและสินค้า',
        total: menuItems.length,
        ready: menuItems.length - unavailable,
        color: '#805637',
      },
      {
        label: 'วัตถุดิบ',
        total: ingredientItems.length,
        ready: ingredientItems.length - ingredientAlert,
        color: '#b98d69',
      },
      {
        label: 'สต๊อกอุปกรณ์เครื่องดื่ม',
        total: stockItems.length,
        ready: stockItems.length - stockAlert,
        color: '#d8c0ad',
      },
    ];
    return { menuItems, unavailable, ingredientAlert, stockAlert, sources };
  }, [ingredients.data, menu.data, plan, stock.data]);

  const loading =
    dashboard.isLoading ||
    menu.isLoading ||
    ingredients.isLoading ||
    employees.isLoading ||
    stock.isLoading;
  const updatedAt = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  return (
    <Box sx={{ display: 'grid', gap: 2.25 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 1.25,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: '#201914',
              fontSize: { xs: 23, md: 27 },
              fontWeight: 700,
            }}
          >
            ภาพรวมแฟรนไชส์
          </Typography>
          <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 13 }}>
            สรุปการดำเนินงานของสาขา{franchiseBranch}จากข้อมูลในระบบ
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`ขนาดสาขา ${plan}`}
            sx={{
              borderRadius: '9px',
              bgcolor: '#e3f2e8',
              color: '#247548',
              fontWeight: 600,
            }}
          />
          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
            อัปเดต {updatedAt}
          </Typography>
        </Box>
      </Box>

      {loading ? (
        <FranchiseOverviewLoading />
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                xl: 'repeat(4, minmax(0, 1fr))',
              },
              gap: 1.75,
            }}
          >
            <Metric
              label="ยอดขายวันนี้"
              value={formatCurrency(dashboard.data?.todaySales ?? 0)}
              detail="จากคำสั่งซื้อที่ชำระแล้ว"
            />
            <Metric
              label="คำสั่งซื้อวันนี้"
              value={`${dashboard.data?.todayOrders ?? 0} รายการ`}
              detail="ดูรายละเอียดที่หน้าคำสั่งซื้อ"
            />
            <Metric
              label="สินค้าที่พร้อมขาย"
              value={`${data.menuItems.length - data.unavailable} รายการ`}
              detail={
                data.unavailable
                  ? `มี ${data.unavailable} รายการไม่พร้อมขาย`
                  : 'ทุกเมนูพร้อมให้บริการ'
              }
              color={data.unavailable ? '#a86a00' : '#247548'}
            />
            <Metric
              label="พนักงานในแฟรนไชส์"
              value={`${employees.data?.length ?? 0} คน`}
              detail="จัดการรายชื่อและตารางกะ"
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                lg: 'minmax(0, 1.65fr) minmax(320px, .85fr)',
              },
              gap: 1.75,
            }}
          >
            <Card
              variant="outlined"
              sx={{ ...cardSx, p: { xs: 1.75, md: 2.25 } }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 1,
                  alignItems: 'baseline',
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
                    กราฟสถานะสินค้าและคลัง
                  </Typography>
                  <Typography
                    sx={{ mt: 0.15, color: 'text.secondary', fontSize: 12.5 }}
                  >
                    สัดส่วนรายการที่พร้อมใช้งานในแฟรนไชส์
                  </Typography>
                </Box>
                <Typography sx={{ color: '#805637', fontSize: 12 }}>
                  ข้อมูลปัจจุบัน
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gap: 1.7, mt: 2.5 }}>
                {data.sources.map((source) => {
                  const percent = source.total
                    ? Math.round((source.ready / source.total) * 100)
                    : 0;
                  return (
                    <Box key={source.label}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          mb: 0.65,
                        }}
                      >
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
                          {source.label}
                        </Typography>
                        <Typography
                          sx={{ color: 'text.secondary', fontSize: 12.5 }}
                        >
                          {source.ready}/{source.total} พร้อมใช้งาน
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 12,
                          overflow: 'hidden',
                          borderRadius: 99,
                          bgcolor: '#f2ece7',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${percent}%`,
                            height: '100%',
                            borderRadius: 99,
                            bgcolor: source.color,
                            transition: 'width .25s ease',
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
              <Divider sx={{ my: 2, borderColor: '#eee4dd' }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => onNavigate('เมนูและสินค้า')}
                >
                  ดูเมนูและสินค้า
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => onNavigate('วัตถุดิบ')}
                >
                  ดูวัตถุดิบ
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => onNavigate('สต๊อกอุปกรณ์เครื่องดื่ม')}
                >
                  ดูสต๊อกอุปกรณ์เครื่องดื่ม
                </Button>
              </Box>
            </Card>

            <Card
              variant="outlined"
              sx={{ ...cardSx, p: { xs: 1.75, md: 2.25 } }}
            >
              <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
                รายการที่ต้องติดตาม
              </Typography>
              <Typography
                sx={{ mt: 0.15, color: 'text.secondary', fontSize: 12.5 }}
              >
                ตรวจสอบก่อนเริ่มงานประจำวัน
              </Typography>
              <Box sx={{ display: 'grid', gap: 1.1, mt: 2 }}>
                {[
                  ['เมนูที่ไม่พร้อมขาย', data.unavailable, 'เมนูและสินค้า'],
                  ['วัตถุดิบใกล้หมด/หมด', data.ingredientAlert, 'วัตถุดิบ'],
                  [
                    'รายการสต๊อกที่ต้องตรวจสอบ',
                    data.stockAlert,
                    'สต๊อกอุปกรณ์เครื่องดื่ม',
                  ],
                ].map(([label, value, page]) => (
                  <Button
                    key={label}
                    variant="text"
                    onClick={() => onNavigate(page as Page)}
                    sx={{
                      justifyContent: 'space-between',
                      px: 1.25,
                      py: 1,
                      color: '#201914',
                      textAlign: 'left',
                      bgcolor: Number(value) ? '#fff8f3' : '#fbfaf8',
                      '&:hover': { bgcolor: '#f7efe9' },
                    }}
                  >
                    <Typography component="span" sx={{ fontSize: 13.5 }}>
                      {label}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        color: Number(value) ? '#a86a00' : '#247548',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {value} รายการ
                    </Typography>
                  </Button>
                ))}
              </Box>
            </Card>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 1.75,
            }}
          >
            {[
              [
                'เมนูและสินค้า',
                'ตรวจสอบสถานะและความพร้อมขายของเมนู',
                data.unavailable,
                'เมนูและสินค้า',
                'เปิดหน้าเมนู',
              ],
              [
                'ตารางพนักงาน',
                'จัดการรายชื่อและตารางกะของทีมงาน',
                employees.data?.length ?? 0,
                'ตารางพนักงาน',
                'ดูตารางพนักงาน',
              ],
            ].map(([title, detail, warningCount, page, action]) => (
              <Card key={title} variant="outlined" sx={{ ...cardSx, p: 2 }}>
                <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
                  {title}
                </Typography>
                <Typography
                  sx={{ mt: 0.4, color: 'text.secondary', fontSize: 12.5 }}
                >
                  {detail}
                </Typography>
                <Box
                  sx={{
                    mt: 1.75,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <State value={Number(warningCount)} />
                  <Button
                    variant="text"
                    onClick={() => onNavigate(page as Page)}
                  >
                    {action}
                  </Button>
                </Box>
              </Card>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
