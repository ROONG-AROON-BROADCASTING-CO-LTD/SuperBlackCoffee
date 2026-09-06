import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  Card,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { DashboardMain, formatCurrency } from '@stackbuild/ui';
import {
  branchCodeByBranch,
  branches,
  type Branch,
} from '@stackbuild/management';
import { useDashboardSummary } from '../../hooks/useDashboardSummary';
import { useStockRequests } from '../../hooks/useStockRequests';
import { AdminOverviewSkeleton } from '../../components/skeletons/AdminOverviewSkeleton';
import type { AdminPage } from '../../routes/adminRoutes';
import { listBranchSales, listInventory, type BranchSales } from '../../api';

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
    page: 'สต๊อก',
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

export function AdminOverviewPage({
  onNavigate,
}: {
  onNavigate: (page: AdminPage) => void;
}) {
  const dashboard = useDashboardSummary();
  const stockRequests = useStockRequests();
  const [selectedBranch, setSelectedBranch] = useState<Branch>('ทุกสาขา');
  const branchSales = useQuery({
    queryKey: ['overview-branch-sales'],
    queryFn: () => listBranchSales('today'),
  });
  const branchStock = useQuery({
    queryKey: ['overview-branch-stock'],
    queryFn: async () => {
      const entries = await Promise.all(
        branches.slice(1).map(async (branch) => {
          const items = await listInventory(
            'stock',
            branchCodeByBranch[branch as Exclude<Branch, 'ทุกสาขา'>],
          );
          return {
            branch,
            quantity: items.reduce((total, item) => total + item.quantity, 0),
            low: items.filter((item) => item.status !== 'ready').length,
          };
        }),
      );
      return entries;
    },
  });
  const sales = dashboard.data?.todaySales ?? 0;
  const orders = dashboard.data?.todayOrders ?? 0;
  const isLoading =
    dashboard.isLoading ||
    stockRequests.isLoading ||
    branchSales.isLoading ||
    branchStock.isLoading;
  const followUps = useMemo(() => {
    const requests = stockRequests.data ?? [];
    return {
      pendingStock: requests.filter((request) => request.status === 'pending')
        .length,
      activeStock: requests.filter((request) =>
        ['approved', 'preparing'].includes(request.status),
      ).length,
    };
  }, [stockRequests.data]);
  const hasError =
    dashboard.isError ||
    stockRequests.isError ||
    branchSales.isError ||
    branchStock.isError;
  const selectedBranchCode =
    selectedBranch === 'ทุกสาขา' ? null : branchCodeByBranch[selectedBranch];
  const branchSalesRows = (branchSales.data ?? []).filter(
    (branch) =>
      selectedBranchCode === null || branch.code === selectedBranchCode,
  );
  const maxBranchSales = Math.max(
    ...branchSalesRows.map((branch) => branch.sales),
    1,
  );
  const branchStockRows = (branchStock.data ?? []).filter(
    (branch) =>
      selectedBranch === 'ทุกสาขา' || branch.branch === selectedBranch,
  );
  const overviewSales =
    selectedBranch === 'ทุกสาขา'
      ? sales
      : branchSalesRows.reduce((total, branch) => total + branch.sales, 0);
  const overviewOrders =
    selectedBranch === 'ทุกสาขา'
      ? orders
      : branchSalesRows.reduce((total, branch) => total + branch.orders, 0);
  const updatedAt = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  return (
    <DashboardMain>
      {isLoading ? (
        <AdminOverviewSkeleton />
      ) : (
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
            <Box>
              <Typography
                sx={{
                  color: '#201914',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: { xs: 23, md: 27 },
                  fontWeight: 700,
                }}
              >
                ภาพรวมการดำเนินงานวันนี้
              </Typography>
              <Typography
                sx={{ mt: 0.35, color: 'text.secondary', fontSize: 13 }}
              >
                ดูยอดขายและงานที่ควรติดตามจากข้อมูลในระบบ
              </Typography>
            </Box>
            <Typography sx={{ color: 'text.secondary', fontSize: 12.5 }}>
              อัปเดตเมื่อ {updatedAt}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {branches.map((branch) => (
              <Button
                key={branch}
                size="small"
                variant={selectedBranch === branch ? 'contained' : 'outlined'}
                onClick={() => setSelectedBranch(branch)}
                sx={{
                  minHeight: 34,
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor:
                    selectedBranch === branch ? '#201914' : '#d8c8bd',
                  bgcolor: selectedBranch === branch ? '#201914' : '#fff',
                  color: selectedBranch === branch ? '#fff' : '#5f4b3d',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 12,
                  boxShadow: 'none',
                }}
              >
                {branch}
              </Button>
            ))}
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
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            <MetricCard
              label="ยอดขายวันนี้"
              value={hasError ? '—' : formatCurrency(overviewSales)}
              helper={
                hasError
                  ? 'โหลดข้อมูลไม่สำเร็จ'
                  : 'รวมเฉพาะรายการที่ชำระเงินแล้ว'
              }
              accent={hasError ? '#b63b35' : '#805637'}
            />
            <MetricCard
              label="คำสั่งซื้อที่ชำระแล้ว"
              value={hasError ? '—' : `${formatCount(overviewOrders)} รายการ`}
              helper={
                hasError
                  ? 'โหลดข้อมูลไม่สำเร็จ'
                  : 'คำสั่งซื้อที่บันทึกสำเร็จในวันนี้'
              }
              accent={hasError ? '#b63b35' : '#4c8f70'}
            />
            <MetricCard
              label="ยอดเฉลี่ยต่อบิล"
              value={
                hasError
                  ? '—'
                  : formatCurrency(
                      overviewOrders === 0 ? 0 : overviewSales / overviewOrders,
                    )
              }
              helper={
                hasError
                  ? 'โหลดข้อมูลไม่สำเร็จ'
                  : 'ยอดขายเฉลี่ยต่อคำสั่งซื้อที่ชำระแล้ว'
              }
              accent={hasError ? '#b63b35' : '#c38642'}
            />
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
                  ยอดขายแยกตามสาขา
                </Typography>
                <Typography
                  sx={{ mt: 0.35, color: 'text.secondary', fontSize: 13 }}
                >
                  เปรียบเทียบยอดขายที่ชำระแล้วของวันนี้
                </Typography>
                <Stack spacing={2} sx={{ mt: 2.5 }}>
                  {branchSalesRows.map((branch: BranchSales) => (
                    <Box key={branch.id}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 2,
                          mb: 0.7,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: 'Kanit, sans-serif',
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          {branch.name}
                        </Typography>
                        <Typography
                          sx={{
                            color: '#805637',
                            fontFamily: 'Kanit, sans-serif',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {formatCurrency(branch.sales)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 10,
                          borderRadius: 99,
                          bgcolor: '#f0e7e1',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${Math.max((branch.sales / maxBranchSales) * 100, branch.sales ? 4 : 0)}%`,
                            height: '100%',
                            borderRadius: 99,
                            bgcolor: '#805637',
                            transition: 'width .25s ease',
                          }}
                        />
                      </Box>
                      <Typography
                        sx={{ mt: 0.45, color: 'text.secondary', fontSize: 12 }}
                      >
                        {branch.orders.toLocaleString('th-TH')} ออเดอร์
                      </Typography>
                    </Box>
                  ))}
                  {branchSales.isError ? (
                    <Typography sx={{ color: '#a22e2a', fontSize: 13 }}>
                      ไม่สามารถโหลดข้อมูลยอดขายได้
                    </Typography>
                  ) : !branchSales.isLoading && branchSalesRows.length === 0 ? (
                    <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                      ยังไม่มีข้อมูลยอดขายของสาขา
                    </Typography>
                  ) : null}
                </Stack>
              </Box>
            </Card>
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
                xl: 'minmax(0, 1.25fr) minmax(330px, .75fr)',
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
                  สรุปยอดขายวันนี้
                </Typography>
                <Typography
                  sx={{ mt: 0.35, color: 'text.secondary', fontSize: 13 }}
                >
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
                    {formatCurrency(overviewSales)}
                  </Typography>
                  <Typography
                    sx={{ mt: 1, color: 'rgba(255,255,255,.7)', fontSize: 13 }}
                  >
                    จาก {formatCount(overviewOrders)} คำสั่งซื้อที่ชำระเงินแล้ว
                  </Typography>
                </Box>
                <Box
                  sx={{
                    mt: 2.25,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography sx={eyebrowSx}>จำนวนคำสั่งซื้อ</Typography>
                    <Typography
                      sx={{
                        mt: 0.4,
                        color: '#201914',
                        fontSize: 24,
                        fontWeight: 750,
                      }}
                    >
                      {formatCount(overviewOrders)}{' '}
                      <Box
                        component="span"
                        sx={{ fontSize: 14, fontWeight: 500 }}
                      >
                        รายการ
                      </Box>
                    </Typography>
                  </Box>
                  <Box sx={{ borderLeft: '1px solid #ece3dc', pl: 2 }}>
                    <Typography sx={eyebrowSx}>เฉลี่ยต่อคำสั่งซื้อ</Typography>
                    <Typography
                      sx={{
                        mt: 0.4,
                        color: '#201914',
                        fontSize: 24,
                        fontWeight: 750,
                      }}
                    >
                      {formatCurrency(
                        overviewOrders === 0
                          ? 0
                          : overviewSales / overviewOrders,
                      )}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Card>
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
                  รายการที่ยังต้องดำเนินการ
                </Typography>
                <Stack spacing={1.25} sx={{ mt: 2.3 }}>
                  <FollowUpRow
                    title="คำขอสต๊อกรออนุมัติ"
                    detail="ตรวจสอบรายการจากสาขา"
                    count={followUps.pendingStock}
                    tone="#d59a31"
                    onClick={() => onNavigate('สต๊อก')}
                  />
                  <FollowUpRow
                    title="คำขอสต๊อกที่กำลังดำเนินการ"
                    detail="อนุมัติแล้วหรือกำลังจัดเตรียม"
                    count={followUps.activeStock}
                    tone="#4c8f70"
                    onClick={() => onNavigate('สต๊อก')}
                  />
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
        </Stack>
      )}
    </DashboardMain>
  );
}
