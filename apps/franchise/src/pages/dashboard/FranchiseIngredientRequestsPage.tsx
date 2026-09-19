import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, Chip, Typography } from '@mui/material';
import {
  ActionSnackbar,
  DashboardMain,
  formatDate,
  PageIntro,
} from '@stackbuild/ui';
import {
  listStockRequests,
  type StockRequestStatus,
} from '@stackbuild/management';

const statusConfig: Record<
  StockRequestStatus,
  { label: string; background: string; color: string }
> = {
  pending: { label: 'รออนุมัติ', background: '#f7eadf', color: '#8a4f22' },
  approved: { label: 'อนุมัติแล้ว', background: '#e7edf5', color: '#435d78' },
  preparing: {
    label: 'กำลังจัดเตรียม',
    background: '#fff1d9',
    color: '#9b6200',
  },
  completed: { label: 'จัดเสร็จแล้ว', background: '#e6f2e8', color: '#2d6d47' },
  rejected: { label: 'ไม่อนุมัติ', background: '#fbe8e6', color: '#aa3328' },
};

export function FranchiseIngredientRequestsPage() {
  const [dismissedLoadError, setDismissedLoadError] = useState(false);
  const requests = useQuery({
    queryKey: ['franchise-stock-requests'],
    queryFn: listStockRequests,
  });
  const pendingCount = useMemo(
    () =>
      (requests.data ?? []).filter((request) => request.status === 'pending')
        .length,
    [requests.data],
  );

  return (
    <DashboardMain>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
          }}
        >
          <PageIntro
            title="คำขอวัตถุดิบ"
            description="ตรวจสอบสถานะคำขอที่ส่งให้ Admin ดำเนินการ"
          />
          <Chip
            label={`รออนุมัติ ${pendingCount} รายการ`}
            sx={{
              borderRadius: '10px',
              bgcolor: '#f7eadf',
              color: '#8a4f22',
              fontFamily: 'Kanit, sans-serif',
              fontWeight: 600,
            }}
          />
        </Box>

        {requests.isLoading ? (
          <Card
            variant="outlined"
            sx={{
              minHeight: 180,
              display: 'grid',
              placeItems: 'center',
              borderRadius: '16px',
              borderColor: '#e8ddd5',
            }}
          >
            <Typography
              sx={{ color: 'text.secondary', fontFamily: 'Kanit, sans-serif' }}
            >
              กำลังโหลดคำขอวัตถุดิบ…
            </Typography>
          </Card>
        ) : requests.isError ? (
          <Card
            variant="outlined"
            sx={{ p: 2.5, borderRadius: '16px', borderColor: '#e8ddd5' }}
          >
            <Typography
              sx={{ color: 'text.secondary', fontFamily: 'Kanit, sans-serif' }}
            >
              ไม่สามารถแสดงรายการได้ในขณะนี้
            </Typography>
          </Card>
        ) : requests.data?.length ? (
          <Box sx={{ display: 'grid', gap: 1.25 }}>
            {requests.data.map((request) => {
              const status = statusConfig[request.status];
              return (
                <Card
                  key={request.id}
                  variant="outlined"
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: '16px',
                    borderColor: '#e8ddd5',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 16,
                          fontWeight: 600,
                        }}
                      >
                        คำขอ #{request.id}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.2,
                          color: 'text.secondary',
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 12.5,
                        }}
                      >
                        ส่งเมื่อ {formatDate(request.createdAt)} ·{' '}
                        {request.items.length} รายการ
                      </Typography>
                    </Box>
                    <Chip
                      label={status.label}
                      size="small"
                      sx={{
                        borderRadius: '8px',
                        bgcolor: status.background,
                        color: status.color,
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.75,
                      mt: 1.5,
                    }}
                  >
                    {request.items.map((item, index) => (
                      <Chip
                        key={`${item.name}-${index}`}
                        label={`${item.name} × ${item.quantity} ${item.unit}`}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderRadius: '8px',
                          borderColor: '#e8ddd5',
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 12,
                        }}
                      />
                    ))}
                  </Box>
                </Card>
              );
            })}
          </Box>
        ) : (
          <Card
            variant="outlined"
            sx={{
              minHeight: 220,
              display: 'grid',
              placeItems: 'center',
              p: 3,
              borderRadius: '16px',
              borderColor: '#e8ddd5',
              textAlign: 'center',
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 17,
                  fontWeight: 600,
                }}
              >
                ยังไม่มีคำขอวัตถุดิบ
              </Typography>
              <Typography
                sx={{
                  mt: 0.35,
                  color: 'text.secondary',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 13,
                }}
              >
                เพิ่มรายการจากหน้าวัตถุดิบ แล้วส่งคำขอจากตะกร้าได้เลย
              </Typography>
            </Box>
          </Card>
        )}
      </Box>
      <ActionSnackbar
        notice={
          requests.isError && !dismissedLoadError
            ? { message: 'ไม่สามารถโหลดคำขอวัตถุดิบได้', severity: 'error' }
            : null
        }
        onClose={() => setDismissedLoadError(true)}
        autoHideDuration={null}
      />
    </DashboardMain>
  );
}
