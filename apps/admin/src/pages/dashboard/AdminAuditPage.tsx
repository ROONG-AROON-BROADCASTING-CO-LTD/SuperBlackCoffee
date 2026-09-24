import {
  AddCircleOutlineRounded as CreateIcon,
  BusinessOutlined as BranchIcon,
  CalendarMonthOutlined as CalendarIcon,
  DeleteOutlineRounded as DeleteIcon,
  EditRounded as EditIcon,
  FormatListBulletedRounded as ActionFilterIcon,
  Inventory2Outlined as StockIcon,
  LocalShippingOutlined as ReceiveIcon,
  ReceiptLongOutlined as TotalIcon,
  SearchRounded as SearchIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useDeferredValue, useMemo, useState, type ComponentType } from 'react';
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

type PeriodFilter = 'all' | 'today' | 'week';
type ActionTone = 'edit' | 'stock' | 'receive' | 'delete' | 'default';
type AuditRowData = AuditEvent & {
  presentation: ReturnType<typeof eventPresentation>;
  actionLabel: string;
  tone: ActionTone;
  time: string;
};

const toneStyles: Record<
  ActionTone,
  {
    color: string;
    background: string;
    Icon: ComponentType<{ fontSize?: 'small'; sx?: Record<string, unknown> }>;
  }
> = {
  edit: { color: '#2e7d48', background: '#e9f6ed', Icon: EditIcon },
  stock: { color: '#286ecb', background: '#eaf3ff', Icon: StockIcon },
  receive: { color: '#c76c13', background: '#fff2df', Icon: ReceiveIcon },
  delete: { color: '#b53a35', background: '#fcedec', Icon: DeleteIcon },
  default: { color: '#795234', background: '#f5eee8', Icon: CreateIcon },
};

const auditGridColumns =
  '40px 64px minmax(170px, 1.1fr) minmax(250px, 2.5fr) minmax(140px, .8fr) minmax(160px, 1fr) 104px';

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
        category: 'วัตถุดิบ',
      };
    case 'menu_item':
      return {
        title: `${actionLabels[event.action] ?? 'อัปเดตรายการ'} เมนู ${itemReference}`,
        detail: null,
        category: 'เมนู',
      };
    case 'stock_request':
      return {
        title: `${actionLabels[event.action] ?? 'อัปเดตคำขอ'} คำขอสต็อก ${reference}`,
        detail: itemCount === null ? null : `จำนวน ${itemCount} รายการ`,
        category: 'คำขอสต็อก',
      };
    case 'stock_consumption':
      return {
        title: 'ตัดสต็อกจากการขายเมนู',
        detail:
          itemCount === null
            ? null
            : `ตัดวัตถุดิบ ${itemCount} รายการ${menuQuantity === null ? '' : ` · เมนู ${menuQuantity} แก้ว`}`,
        category: 'ขายเมนู',
      };
    case 'maintenance_ticket':
      return {
        title: `เปิดใบแจ้งซ่อม${title ? `: ${title}` : ` ${reference}`}`,
        detail: null,
        category: 'แจ้งซ่อม',
      };
    case 'inspection':
      return {
        title:
          event.action === 'scheduled'
            ? `สร้างงาน${inspectionType === 'ingredients' ? 'ตรวจวัตถุดิบ' : 'ตรวจช่าง'}`
            : 'บันทึกผลการตรวจ',
        detail: templateName ? `แบบตรวจ: ${templateName}` : null,
        category: 'ตรวจมาตรฐาน',
      };
    case 'branch_asset':
      return {
        title: `${actionLabels[event.action] ?? 'อัปเดต'} ทรัพย์สิน ${itemReference}`,
        detail: null,
        category: 'ทรัพย์สิน',
      };
    case 'service_invoice':
      return {
        title: `สร้างใบเรียกเก็บเงิน ${invoiceNumber || reference}`,
        detail: null,
        category: 'ใบเรียกเก็บเงิน',
      };
    case 'purchase_order':
      return {
        title: `${actionLabels[event.action] ?? 'อัปเดต'} ใบสั่งซื้อ ${reference}`,
        detail: itemCount === null ? null : `จำนวน ${itemCount} รายการ`,
        category: 'ใบสั่งซื้อ',
      };
    default:
      return {
        title: `${actionLabels[event.action] ?? 'อัปเดตรายการ'} ${reference}`,
        detail: null,
        category: 'อื่น ๆ',
      };
  }
}

function actionTone(action: string): ActionTone {
  if (action === 'deleted' || action === 'rejected') return 'delete';
  if (action === 'consumed' || action === 'adjusted') return 'stock';
  if (action === 'received') return 'receive';
  if (action === 'updated' || action === 'update') return 'edit';
  return 'default';
}

function eventTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Bangkok',
  }).format(date);
}

function rowFrom(event: AuditEvent): AuditRowData {
  return {
    ...event,
    presentation: eventPresentation(event),
    actionLabel: actionLabels[event.action] ?? 'อัปเดตรายการ',
    tone: actionTone(event.action),
    time: eventTime(event.createdAt),
  };
}

function rangeStart(period: PeriodFilter) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (period === 'today') return now;
  if (period === 'week') {
    now.setDate(now.getDate() - 6);
    return now;
  }
  return null;
}

export function AdminAuditPage() {
  const { data: events = [], error, isLoading: rawLoading } = useAuditEvents();
  const isLoading = useMinimumLoading(rawLoading);
  const [query, setQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const eventRows = useMemo(() => events.map(rowFrom), [events]);
  const branches = useMemo(
    () =>
      [
        ...new Set(eventRows.map((event) => event.branchName).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b, 'th')),
    [eventRows],
  );
  const actions = useMemo(
    () =>
      [...new Set(eventRows.map((event) => event.actionLabel))].sort((a, b) =>
        a.localeCompare(b, 'th'),
      ),
    [eventRows],
  );
  const visibleEvents = useMemo(() => {
    const start = rangeStart(periodFilter);
    return eventRows.filter((event) => {
      const searchable = [
        event.presentation.title,
        event.presentation.detail,
        event.branchName,
        event.actorName,
        event.actionLabel,
        event.presentation.category,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();
      return (
        (branchFilter === 'all' || event.branchName === branchFilter) &&
        (actionFilter === 'all' || event.actionLabel === actionFilter) &&
        (!deferredQuery || searchable.includes(deferredQuery)) &&
        (!start || new Date(event.createdAt) >= start)
      );
    });
  }, [actionFilter, branchFilter, deferredQuery, eventRows, periodFilter]);
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, AuditRowData[]>();
    visibleEvents.forEach((event) => {
      const key = event.createdAt.slice(0, 10);
      groups.set(key, [...(groups.get(key) ?? []), event]);
    });
    return [...groups.entries()];
  }, [visibleEvents]);
  const summary = useMemo(
    () => ({
      all: visibleEvents.length,
      edits: visibleEvents.filter((event) => event.tone === 'edit').length,
      stock: visibleEvents.filter((event) => event.tone === 'stock').length,
      received: visibleEvents.filter((event) => event.tone === 'receive')
        .length,
      deleted: visibleEvents.filter((event) => event.tone === 'delete').length,
    }),
    [visibleEvents],
  );
  const hasActiveFilters = Boolean(
    query ||
    branchFilter !== 'all' ||
    actionFilter !== 'all' ||
    periodFilter !== 'all',
  );
  const emptyMessage =
    eventRows.length === 0
      ? 'ยังไม่มีประวัติการทำรายการ'
      : 'ไม่พบประวัติที่ตรงกับตัวกรอง';

  return (
    <DashboardMain>
      <Box sx={{ mb: 2.25 }}>
        <Typography
          component="h1"
          sx={{
            color: '#2e2723',
            fontFamily: 'Kanit, sans-serif',
            fontSize: { xs: 22, md: 25 },
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.32,
          }}
        >
          ประวัติการทำรายการ
        </Typography>
        <Typography
          sx={{
            mt: 0.2,
            color: '#746d68',
            fontFamily: 'Kanit, sans-serif',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          ตรวจสอบการเปลี่ยนแปลงสต็อกและการดำเนินการต่างของทุกสาขา
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
      <Box sx={{ display: isLoading || error ? 'none' : 'grid', gap: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: 'minmax(270px, 1.65fr) repeat(3, minmax(155px, .86fr)) auto auto',
            },
            gap: 1,
          }}
        >
          <TextField
            aria-label="ค้นหาการทำรายการ"
            placeholder="ค้นหาการทำรายการ"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#806f65', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={filterFieldStyles}
          />
          <TextField
            select
            aria-label="สาขา"
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
            size="small"
            sx={filterFieldStyles}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <BranchIcon sx={{ color: '#403630', fontSize: 19 }} />
                  </InputAdornment>
                ),
              },
            }}
          >
            <MenuItem value="all">ทุกสาขา</MenuItem>
            {branches.map((branch) => (
              <MenuItem key={branch} value={branch}>
                {branch}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            aria-label="ประเภทการทำรายการ"
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            size="small"
            sx={filterFieldStyles}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <ActionFilterIcon sx={{ color: '#403630', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          >
            <MenuItem value="all">ทุกประเภท</MenuItem>
            {actions.map((action) => (
              <MenuItem key={action} value={action}>
                {action}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            aria-label="ช่วงเวลา"
            value={periodFilter}
            onChange={(event) =>
              setPeriodFilter(event.target.value as PeriodFilter)
            }
            size="small"
            sx={filterFieldStyles}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarIcon sx={{ color: '#403630', fontSize: 19 }} />
                  </InputAdornment>
                ),
              },
            }}
          >
            <MenuItem value="all">ช่วงเวลา</MenuItem>
            <MenuItem value="today">วันนี้</MenuItem>
            <MenuItem value="week">7 วันล่าสุด</MenuItem>
          </TextField>
          <Button
            onClick={() => setPeriodFilter('today')}
            variant={periodFilter === 'today' ? 'contained' : 'outlined'}
            sx={periodFilterButtonStyles(periodFilter === 'today')}
          >
            วันนี้
          </Button>
          <Button
            onClick={() => setPeriodFilter('week')}
            variant={periodFilter === 'week' ? 'contained' : 'outlined'}
            sx={periodFilterButtonStyles(periodFilter === 'week')}
          >
            7 วันล่าสุด
          </Button>
        </Box>
        <Box aria-label="สรุปประวัติที่กำลังแสดง" sx={summaryPanelStyles}>
          <SummaryStat label="ทั้งหมด" value={summary.all} tone="default" />
          <SummaryStat label="แก้ไขรายการ" value={summary.edits} tone="edit" />
          <SummaryStat
            label="ตัดสต็อกจากการขายเมนู"
            value={summary.stock}
            tone="stock"
          />
          <SummaryStat
            label="รับล็อตเข้าสู่สต็อก"
            value={summary.received}
            tone="receive"
          />
          <SummaryStat label="ลบรายการ" value={summary.deleted} tone="delete" />
        </Box>
        {groupedEvents.length ? (
          <Box>
            {groupedEvents.map(([date, dateEvents]) => (
              <Box key={date} sx={{ mb: 2.25 }}>
                <Typography
                  component="h2"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 0.65,
                    color: '#332a25',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 17,
                    fontWeight: 700,
                    '&::before': {
                      content: '""',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: '#805637',
                    },
                  }}
                >
                  {formatDate(`${date}T00:00:00Z`)}
                </Typography>
                <Box
                  sx={{
                    display: { xs: 'none', md: 'grid' },
                    gridTemplateColumns: auditGridColumns,
                    gap: 1.5,
                    px: 1.5,
                    py: 0.55,
                    borderRadius: '9px',
                    bgcolor: '#f7f7f7',
                    color: '#88817b',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  <span aria-hidden="true" />
                  <span>เวลา</span>
                  <span>การดำเนินการ</span>
                  <span>รายการ</span>
                  <span>สาขา</span>
                  <span>ผู้ดำเนินการ</span>
                  <span>หมวด</span>
                </Box>
                <Box sx={{ position: 'relative' }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: { xs: 14, md: 20 },
                      width: '1px',
                      bgcolor: '#e7ddd7',
                    }}
                  />
                  {dateEvents.map((event) => (
                    <AuditRow key={event.id} event={event} />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography
              sx={{
                color: '#7e736c',
                fontFamily: 'Kanit, sans-serif',
                fontWeight: 600,
              }}
            >
              {emptyMessage}
            </Typography>
            {hasActiveFilters ? (
              <Button
                onClick={() => {
                  setQuery('');
                  setBranchFilter('all');
                  setActionFilter('all');
                  setPeriodFilter('all');
                }}
                sx={{
                  mt: 0.5,
                  color: '#805637',
                  fontFamily: 'Kanit, sans-serif',
                }}
              >
                ล้างตัวกรอง
              </Button>
            ) : null}
          </Box>
        )}
      </Box>
    </DashboardMain>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: ActionTone;
}) {
  const style = toneStyles[tone];
  const Icon = tone === 'default' ? TotalIcon : style.Icon;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.15,
        minHeight: 88,
        px: { xs: 1.5, md: 2.1 },
        borderRight: { lg: '1px solid #e5dfdb' },
        '&:last-of-type': { borderRight: 0 },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 34,
          height: 34,
          borderRadius: '50%',
          bgcolor: style.background,
          color: style.color,
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 20 }} />
      </Box>
      <Box>
        <Typography
          sx={{
            color: '#817971',
            fontFamily: 'Kanit, sans-serif',
            fontSize: 12,
            lineHeight: 1.3,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            color: '#322923',
            fontFamily: 'Kanit, sans-serif',
            fontSize: 25,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {value}{' '}
          <Box
            component="span"
            sx={{ color: '#817971', fontSize: 12, fontWeight: 400 }}
          >
            รายการ
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}

function AuditRow({ event }: { event: AuditRowData }) {
  const style = toneStyles[event.tone];
  const Icon = style.Icon;
  const actorName = event.actorName || 'ระบบ';
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: auditGridColumns },
        gap: { xs: 0.6, md: 1.5 },
        alignItems: 'center',
        minHeight: { xs: 112, md: 43 },
        ml: { xs: 3.5, md: 0 },
        pl: { xs: 2, md: 1.25 },
        pr: 1.25,
        py: { xs: 1.25, md: 0.45 },
        borderBottom: '1px solid #f0e9e5',
        transition: 'background-color 160ms ease',
        '&:hover': { bgcolor: '#fcfaf9' },
      }}
    >
      <Box
        sx={{
          position: { xs: 'absolute', md: 'relative' },
          left: { xs: -28, md: 'auto' },
          top: { xs: 19, md: 'auto' },
          transform: { xs: 'none', md: 'none' },
          justifySelf: { md: 'center' },
          zIndex: 1,
          display: 'grid',
          placeItems: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          bgcolor: style.background,
          color: style.color,
          boxShadow: '0 0 0 3px #fff',
        }}
      >
        <Icon sx={{ fontSize: 17 }} />
      </Box>
      <Typography
        sx={{ color: '#776f69', fontFamily: 'Kanit, sans-serif', fontSize: 13 }}
      >
        {event.time}
      </Typography>
      <Typography
        sx={{
          color: '#3d3029',
          fontFamily: 'Kanit, sans-serif',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {event.actionLabel}
      </Typography>
      <Box>
        <Typography
          sx={{
            color: '#30251f',
            fontFamily: 'Kanit, sans-serif',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          {event.presentation.title}
        </Typography>
        {event.presentation.detail ? (
          <Typography
            sx={{
              mt: 0.1,
              color: '#837770',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 11.5,
            }}
          >
            {event.presentation.detail}
          </Typography>
        ) : null}
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.65,
          minWidth: 0,
          color: '#66594f',
          fontFamily: 'Kanit, sans-serif',
          fontSize: 12,
        }}
      >
        <BranchIcon sx={{ fontSize: 16, color: '#887a70', flexShrink: 0 }} />
        <Box
          component="span"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {event.branchName || 'ไม่ระบุ'}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Avatar
          sx={{
            width: 27,
            height: 27,
            bgcolor: '#eee4dc',
            color: '#76543c',
            fontFamily: 'Kanit, sans-serif',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {avatarInitials(actorName)}
        </Avatar>
        <Typography
          sx={{
            color: '#66594f',
            fontFamily: 'Kanit, sans-serif',
            fontSize: 12,
          }}
        >
          {actorName}
        </Typography>
      </Box>
      <Chip
        label={event.presentation.category}
        size="small"
        sx={{
          justifySelf: { md: 'start' },
          width: 'fit-content',
          height: 23,
          borderRadius: '9px',
          bgcolor: style.background,
          color: style.color,
          fontFamily: 'Kanit, sans-serif',
          fontSize: 10.5,
          fontWeight: 600,
        }}
      />
    </Box>
  );
}

function avatarInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

const filterFieldStyles = {
  '& .MuiOutlinedInput-root': {
    height: 41,
    borderRadius: '9px',
    bgcolor: '#fff',
    fontFamily: 'Kanit, sans-serif',
    fontSize: 13,
    '& fieldset': { borderColor: '#ded6d1' },
    '&:hover fieldset': { borderColor: '#b8a79b' },
    '&.Mui-focused fieldset': { borderColor: '#805637' },
  },
  '& .MuiInputLabel-root': { fontFamily: 'Kanit, sans-serif', fontSize: 13 },
};

const summaryPanelStyles = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(5, minmax(0, 1fr))',
  },
  overflow: 'hidden',
  borderRadius: '12px',
  bgcolor: '#faf9f8',
  boxShadow: '0 3px 14px rgba(51, 42, 36, 0.045)',
};

function periodFilterButtonStyles(selected: boolean) {
  return {
    minWidth: selected ? 84 : 108,
    height: 41,
    borderRadius: '9px',
    borderColor: '#ded6d1',
    bgcolor: selected ? '#744b36' : '#fff',
    color: selected ? '#fff' : '#5d463c',
    boxShadow: 'none',
    fontFamily: 'Kanit, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    '&:hover': {
      borderColor: selected ? '#603b2a' : '#b8a79b',
      bgcolor: selected ? '#603b2a' : '#faf8f7',
      boxShadow: 'none',
    },
  };
}
