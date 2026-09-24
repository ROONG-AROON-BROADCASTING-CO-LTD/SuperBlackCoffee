import { useMemo } from 'react';
import { Box, Card, Chip, Typography } from '@mui/material';
import { DashboardMain, formatDate, useMinimumLoading } from '@stackbuild/ui';
import type { AuditEvent } from '../../api';
import { useAuditEvents } from '../../hooks/useAuditEvents';
import { AdminAuditSkeleton } from '../../components/skeletons/AdminAuditSkeleton';

const actionLabels: Record<string, string> = {
  created: 'สร้างรายการ',
  create: 'สร้างรายการ',
  updated: 'แก้ไขรายการ',
  update: 'อัปเดตรายการ',
  deleted: 'ลบรายการ',
  approved: 'อนุมัติคำขอ',
  preparing: 'เริ่มจัดเตรียม',
  completed: 'ดำเนินการเสร็จสิ้น',
  rejected: 'ปฏิเสธคำขอ',
  scheduled: 'สร้างงานตรวจ',
  consumed: 'ตัดสต็อก',
  received: 'รับสินค้าเข้าสต็อก',
  adjusted: 'ปรับจำนวนสต็อก',
};

function stringMetadata(event: AuditEvent, key: string) {
  const value = event.metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberMetadata(event: AuditEvent, key: string) {
  const value = event.metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function eventPresentation(event: AuditEvent) {
  const itemName = stringMetadata(event, 'name');
  const title = stringMetadata(event, 'title');
  const inspectionType = stringMetadata(event, 'inspectionType');
  const templateName = stringMetadata(event, 'templateName');
  const invoiceNumber = stringMetadata(event, 'invoiceNumber');
  const itemCount = numberMetadata(event, 'itemCount');
  const menuQuantity = numberMetadata(event, 'menuQuantity');
  const reference = `#${event.entityId ?? '-'}`;
  const itemReference = itemName ? `“${itemName}”` : reference;

  switch (event.entityType) {
    case 'inventory_item':
      return {
        title: `${actionLabels[event.action] ?? 'อัปเดตรายการ'} วัตถุดิบ ${itemReference}`,
        detail: null,
      };
    case 'menu_item':
      return {
        title: `${actionLabels[event.action] ?? 'อัปเดตรายการ'} เมนู ${itemReference}`,
        detail: null,
      };
    case 'stock_request':
      return {
        title: `${actionLabels[event.action] ?? 'อัปเดตคำขอ'} คำขอสต็อก ${reference}`,
        detail: itemCount === null ? null : `จำนวน ${itemCount} รายการ`,
      };
    case 'stock_consumption':
      return {
        title: 'ตัดสต็อกจากการขายเมนู',
        detail:
          itemCount === null
            ? null
            : `ตัดวัตถุดิบ ${itemCount} รายการ${menuQuantity === null ? '' : ` · เมนู ${menuQuantity} แก้ว`}`,
      };
    case 'maintenance_ticket':
      return {
        title: `เปิดใบแจ้งซ่อม${title ? `: ${title}` : ` ${reference}`}`,
        detail: null,
      };
    case 'inspection':
      return {
        title:
          event.action === 'scheduled'
            ? `สร้างงาน${inspectionType === 'ingredients' ? 'ตรวจวัตถุดิบ' : 'ตรวจช่าง'}`
            : 'บันทึกผลการตรวจ',
        detail: templateName ? `แบบตรวจ: ${templateName}` : null,
      };
    case 'branch_asset':
      return {
        title: `${actionLabels[event.action] ?? 'อัปเดต'} ทรัพย์สิน ${itemReference}`,
        detail: null,
      };
    case 'service_invoice':
      return {
        title: `สร้างใบเรียกเก็บเงิน ${invoiceNumber || reference}`,
        detail: null,
      };
    case 'purchase_order':
      return {
        title: `${actionLabels[event.action] ?? 'อัปเดต'} ใบสั่งซื้อ ${reference}`,
        detail: itemCount === null ? null : `จำนวน ${itemCount} รายการ`,
      };
    default:
      return {
        title: `${actionLabels[event.action] ?? 'อัปเดตรายการ'} ${reference}`,
        detail: null,
      };
  }
}

export function AdminAuditPage() {
  const { data: events = [], error, isLoading: rawLoading } = useAuditEvents();
  const isLoading = useMinimumLoading(rawLoading);
  const groupedEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        presentation: eventPresentation(event),
        actionLabel: actionLabels[event.action] ?? 'อัปเดตรายการ',
        color:
          event.action === 'rejected' || event.action === 'deleted'
            ? '#b63b35'
            : event.action === 'completed' || event.action === 'received'
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
                  {event.presentation.title}
                </Typography>
                {event.presentation.detail ? (
                  <Typography
                    sx={{
                      mt: 0.3,
                      color: '#6b574a',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 12,
                    }}
                  >
                    {event.presentation.detail}
                  </Typography>
                ) : null}
                <Typography
                  sx={{
                    mt: event.presentation.detail ? 0.55 : 0.35,
                    color: 'text.secondary',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 12,
                  }}
                >
                  สาขา: {event.branchName || 'ไม่ระบุ'} · ผู้ดำเนินการ:{' '}
                  {event.actorName || 'ระบบ'} · วันที่:{' '}
                  {formatDate(event.createdAt)}
                </Typography>
              </Box>
              <Chip
                label={event.actionLabel}
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
