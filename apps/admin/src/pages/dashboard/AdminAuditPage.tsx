import { useMemo } from 'react';
import { Box, Card, Chip, Typography } from '@mui/material';
import { DashboardMain, formatDate } from '@stackbuild/ui';
import type { AuditEvent } from '../../api';
import { useAuditEvents } from '../../hooks/useAuditEvents';
import { AdminAuditSkeleton } from '../../components/skeletons/AdminAuditSkeleton';

const actionLabels: Record<string, string> = {
  created: 'สร้างรายการ',
  updated: 'แก้ไขรายการ',
  deleted: 'ลบรายการ',
  approved: 'อนุมัติคำขอ',
  preparing: 'เริ่มจัดเตรียม',
  completed: 'รับสินค้าเข้าสต็อก',
  rejected: 'ปฏิเสธคำขอ',
};

function eventDescription(event: AuditEvent) {
  const itemName =
    typeof event.metadata?.name === 'string' ? event.metadata.name : null;
  const entity =
    event.entityType === 'stock_request'
      ? `คำขอ #${event.entityId ?? '-'}`
      : (itemName ?? `สต็อก #${event.entityId ?? '-'}`);
  return `${actionLabels[event.action] ?? event.action} ${entity}`;
}

export function AdminAuditPage() {
  const { data: events = [], error, isLoading } = useAuditEvents();
  const groupedEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        description: eventDescription(event),
        color:
          event.action === 'rejected' || event.action === 'deleted'
            ? '#b63b35'
            : event.action === 'completed'
              ? '#3c5b47'
              : '#805637',
      })),
    [events],
  );

  return (
    <DashboardMain>
      <Box sx={{ mb: 2 }}>
        <Typography
          sx={{
            color: '#3c2d24',
            fontFamily: 'Kanit, sans-serif',
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          ประวัติการทำรายการ
        </Typography>
        <Typography
          sx={{
            color: 'text.secondary',
            fontFamily: 'Kanit, sans-serif',
            fontSize: 13,
          }}
        >
          ตรวจสอบการเปลี่ยนแปลงสต็อกและการดำเนินการคำขอของทุกสาขา
        </Typography>
      </Box>
      {error ? (
        <Card
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: '15px',
            borderColor: '#edc7c3',
            color: '#a22e2a',
            fontFamily: 'Kanit, sans-serif',
          }}
        >
          ไม่สามารถโหลดประวัติได้ · กำลังลองเชื่อมต่อใหม่อัตโนมัติ
        </Card>
      ) : null}
      {isLoading ? <AdminAuditSkeleton /> : null}
      <Box sx={{ display: isLoading || error ? 'none' : 'grid', gap: 1.25 }}>
        {groupedEvents.map((event) => (
          <Card
            key={event.id}
            variant="outlined"
            sx={{
              borderRadius: '15px',
              borderColor: '#e8ddd5',
              contentVisibility: 'auto',
              containIntrinsicSize: 'auto 86px',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { sm: 'center' },
                justifyContent: 'space-between',
                gap: 1.25,
                p: 2,
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
                  {event.description}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.25,
                    color: 'text.secondary',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 12,
                  }}
                >
                  {event.branchName || 'ไม่ระบุสาขา'} · โดย{' '}
                  {event.actorName || 'ระบบ'} · {formatDate(event.createdAt)}
                </Typography>
              </Box>
              <Chip
                label={actionLabels[event.action] ?? event.action}
                size="small"
                sx={{
                  flexShrink: 0,
                  height: 26,
                  borderRadius: '12px',
                  bgcolor: `${event.color}18`,
                  color: event.color,
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            </Box>
          </Card>
        ))}
      </Box>
      {!error && groupedEvents.length === 0 ? (
        <Typography
          sx={{
            pt: 5,
            textAlign: 'center',
            color: 'text.secondary',
            fontFamily: 'Kanit, sans-serif',
          }}
        >
          ยังไม่มีประวัติการทำรายการ
        </Typography>
      ) : null}
    </DashboardMain>
  );
}
