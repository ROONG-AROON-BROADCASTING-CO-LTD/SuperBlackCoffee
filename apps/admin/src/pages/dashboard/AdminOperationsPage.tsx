import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  DashboardMain,
  type CalendarDaysIconHandle,
} from '@stackbuild/ui';
import { branchCodeByBranch, branches } from '@stackbuild/management';
import {
  createAsset,
  createServiceInvoice,
  downloadInspectionPDF,
  downloadMaintenancePDF,
  listAssets,
  listAssetEvents,
  listInspections,
  listMaintenanceTickets,
  listServiceInvoices,
  randomizeIngredientInspection,
  randomizeInspection,
  updateAsset,
  updateMaintenanceStatus,
  updateServiceInvoiceStatus,
  type AssetEvent,
  type OperationRow,
  type RandomInspection,
} from '../../api/operations';

const labels: Record<string, string> = {
  open: 'รอรับงาน',
  assigned: 'มอบหมายแล้ว',
  waiting_parts: 'รออะไหล่',
  completed: 'เสร็จแล้ว',
  scheduled: 'รอตรวจ',
  passed: 'ผ่าน',
  needs_action: 'ต้องแก้ไข',
  failed: 'ไม่ผ่าน',
  draft: 'ร่าง',
  sent: 'ส่งเรียกเก็บแล้ว',
  paid: 'ชำระแล้ว',
  overdue: 'เกินกำหนด',
  active: 'ใช้งาน',
  repairing: 'กำลังซ่อม',
  retired: 'ปลดระวาง',
};
const columnLabels: Record<string, string> = {
  title: 'หัวข้องาน',
  branchName: 'สาขา',
  priority: 'ความเร่งด่วน',
  status: 'สถานะ',
  dueAt: 'กำหนดวันที่',
  inspectorName: 'ช่างผู้ตรวจ',
  name: 'ชื่ออุปกรณ์/ทรัพย์สิน',
  assetType: 'ประเภทอุปกรณ์',
  serialNumber: 'หมายเลขประจำเครื่อง',
  maintenanceDue: 'กำหนดบำรุงรักษา',
  invoiceNumber: 'เลขที่ใบเรียกเก็บ',
  serviceType: 'ประเภทบริการ',
  amount: 'จำนวนเงิน',
};
const valueLabels: Record<string, string> = {
  ...labels,
  low: 'ทั่วไป',
  normal: 'ปกติ',
  urgent: 'เร่งด่วน',
  inspection: 'ค่าตรวจมาตรฐาน',
  maintenance: 'ค่าซ่อมบำรุง',
  parts: 'ค่าอะไหล่',
  subscription: 'ค่าบริการรายเดือน',
};
const tabs = [
  ['maintenance', 'งานช่าง / แจ้งซ่อม'],
  ['inspection', 'สุ่มตรวจช่าง'],
  ['ingredientInspection', 'สุ่มตรวจวัตถุดิบ'],
  ['assets', 'ทรัพย์สิน'],
  ['billing', 'เรียกเก็บเงิน'],
] as const;
type Tab = (typeof tabs)[number][0];
const inputSx = { minWidth: 0 };
const formCardSx = {
  p: { xs: 2, sm: 2.5 },
  borderColor: '#e8ddd5',
  borderRadius: '15px',
};
const formGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
  gap: 1.5,
};
const inspectionFormGridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(4, minmax(0, 1fr))',
  },
  gap: 1.5,
};
const sectionTitleSx = {
  color: '#3c2d24',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 16,
  fontWeight: 600,
  lineHeight: 1.35,
};
const sectionDescriptionSx = {
  color: 'text.secondary',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 12.5,
  lineHeight: 1.6,
};
const formActionSx = {
  mt: 2,
  minHeight: 40,
  px: 2.25,
  fontFamily: 'Kanit, sans-serif',
  fontSize: 13,
  fontWeight: 600,
};
const tableActionSx = {
  minHeight: 32,
  px: 1.25,
  border: '1px solid rgba(23, 20, 17, 0.35)',
  borderRadius: '8px',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  '&:hover': {
    borderColor: '#171411',
    bgcolor: 'rgba(23, 20, 17, 0.06)',
  },
};
const branchOptions = branches.slice(1).map((label) => ({
  label,
  code: branchCodeByBranch[
    label as Exclude<(typeof branches)[number], 'ทุกสาขา'>
  ],
}));
const optionalID = (value: FormDataEntryValue | null) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
};

function formatOperationValue(column: string, value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (column === 'status' || column === 'priority' || column === 'serviceType')
    return valueLabels[String(value)] ?? String(value);
  if (column === 'amount' || column === 'cost') {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? `${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`
      : String(value);
  }
  if (column === 'dueAt' || column === 'maintenanceDue') {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime()))
      return date.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
  }
  return String(value);
}

function BranchField() {
  return (
    <TextField
      select
      name="branchCode"
      label="สาขา"
      required
      defaultValue=""
      sx={inputSx}
    >
      <MenuItem value="" disabled>
        เลือกสาขา
      </MenuItem>
      {branchOptions.map((branch) => (
        <MenuItem key={branch.code} value={branch.code}>
          {branch.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

function AssetFields() {
  return (
    <>
      <BranchField />
      <TextField
        name="name"
        label="ชื่ออุปกรณ์/ทรัพย์สิน"
        required
        sx={inputSx}
      />
      <TextField
        name="assetType"
        label="ประเภท"
        required
        placeholder="เช่น เครื่องชงกาแฟ"
        sx={inputSx}
      />
      <TextField name="serialNumber" label="หมายเลขประจำเครื่อง" sx={inputSx} />
      <TextField
        name="warrantyUntil"
        type="date"
        label="หมดประกัน"
        fullWidth
        slotProps={{ inputLabel: { shrink: true } }}
        sx={inputSx}
      />
      <TextField
        name="maintenanceDue"
        type="date"
        label="กำหนดบำรุงรักษา"
        fullWidth
        slotProps={{ inputLabel: { shrink: true } }}
        sx={inputSx}
      />
    </>
  );
}
function InvoiceFields({
  maintenance,
  inspections,
}: {
  maintenance: OperationRow[];
  inspections: OperationRow[];
}) {
  return (
    <>
      <BranchField />
      <TextField
        name="invoiceNumber"
        label="เลขที่ใบเรียกเก็บ"
        required
        sx={inputSx}
      />
      <TextField
        select
        name="maintenanceTicketId"
        label="อ้างอิงใบงานช่าง (ถ้ามี)"
        defaultValue=""
        sx={inputSx}
      >
        <MenuItem value="">ไม่อ้างอิง</MenuItem>
        {maintenance.map((ticket) => (
          <MenuItem key={ticket.id} value={ticket.id}>
            #{ticket.id} {String(ticket.title ?? '')}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        name="inspectionId"
        label="อ้างอิงผลตรวจ (ถ้ามี)"
        defaultValue=""
        sx={inputSx}
      >
        <MenuItem value="">ไม่อ้างอิง</MenuItem>
        {inspections.map((inspection) => (
          <MenuItem key={inspection.id} value={inspection.id}>
            #{inspection.id} {String(inspection.branchName ?? '')}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        name="serviceType"
        label="ประเภทบริการ"
        defaultValue="maintenance"
        sx={inputSx}
      >
        <MenuItem value="inspection">ค่าตรวจมาตรฐาน</MenuItem>
        <MenuItem value="maintenance">ค่าซ่อมบำรุง</MenuItem>
        <MenuItem value="parts">ค่าอะไหล่</MenuItem>
        <MenuItem value="subscription">ค่าบริการรายเดือน</MenuItem>
      </TextField>
      <TextField
        name="amount"
        label="จำนวนเงิน"
        type="number"
        required
        slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
        sx={inputSx}
      />
      <TextField
        name="dueAt"
        type="date"
        label="วันครบกำหนด"
        fullWidth
        slotProps={{ inputLabel: { shrink: true } }}
        sx={inputSx}
      />
    </>
  );
}

export function AdminOperationsPage() {
  const client = useQueryClient();
  const inspectionDateInputRef = useRef<HTMLInputElement>(null);
  const inspectionCalendarIconRef = useRef<CalendarDaysIconHandle>(null);
  const [tab, setTab] = useState<Tab>('maintenance');
  const [notice, setNotice] = useState('');
  const [assignment, setAssignment] = useState<RandomInspection | null>(null);
  const [assetToTransfer, setAssetToTransfer] = useState<OperationRow | null>(
    null,
  );
  const [assetHistory, setAssetHistory] = useState<{
    name: string;
    events: AssetEvent[];
  } | null>(null);
  const isInspectionTab =
    tab === 'inspection' || tab === 'ingredientInspection';
  const isIngredientInspectionTab = tab === 'ingredientInspection';
  const openInspectionDatePicker = () => {
    inspectionCalendarIconRef.current?.startAnimation();
    window.setTimeout(
      () => inspectionCalendarIconRef.current?.stopAnimation(),
      950,
    );
    inspectionDateInputRef.current?.showPicker?.();
  };
  const data = useQuery({
    queryKey: ['operations'],
    queryFn: async () => {
      const [maintenance, inspections, assets, invoices] = await Promise.all([
        listMaintenanceTickets(),
        listInspections(),
        listAssets(),
        listServiceInvoices(),
      ]);
      return { maintenance, inspections, assets, invoices };
    },
  });
  const key =
    tab === 'maintenance'
      ? 'maintenance'
      : isInspectionTab
        ? 'inspections'
        : tab === 'assets'
          ? 'assets'
          : 'invoices';
  const sourceRows: OperationRow[] = data.data?.[key] ?? [];
  const rows = isInspectionTab
    ? sourceRows.filter(
        (row) =>
          row.status === 'scheduled' &&
          String(row.inspectionType ?? 'technician') ===
            (isIngredientInspectionTab ? 'ingredients' : 'technician'),
      )
    : sourceRows;
  const columns = useMemo(
    () =>
      tab === 'maintenance'
        ? ['title', 'branchName', 'priority', 'status', 'dueAt']
        : isInspectionTab
          ? ['branchName', 'inspectorName', 'dueAt', 'status']
          : tab === 'assets'
            ? [
                'name',
                'branchName',
                'assetType',
                'serialNumber',
                'status',
                'maintenanceDue',
              ]
            : [
                'invoiceNumber',
                'branchName',
                'serviceType',
                'amount',
                'status',
                'dueAt',
              ],
    [tab],
  );
  const formTitle =
    tab === 'assets' ? 'เพิ่มทรัพย์สินสาขา' : 'สร้างใบเรียกเก็บเงิน';
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    try {
      if (tab === 'assets')
        await createAsset({
          branchCode: String(form.get('branchCode')),
          name: String(form.get('name')),
          assetType: String(form.get('assetType')),
          serialNumber: String(form.get('serialNumber')),
          warrantyUntil: String(form.get('warrantyUntil')),
          maintenanceDue: String(form.get('maintenanceDue')),
        });
      if (tab === 'billing')
        await createServiceInvoice({
          branchCode: String(form.get('branchCode')),
          invoiceNumber: String(form.get('invoiceNumber')),
          serviceType: String(form.get('serviceType')) as
            'inspection' | 'maintenance' | 'parts' | 'subscription',
          amount: Number(form.get('amount')),
          dueAt: String(form.get('dueAt')),
          maintenanceTicketId: optionalID(form.get('maintenanceTicketId')),
          inspectionId: optionalID(form.get('inspectionId')),
        });
      setNotice(`${formTitle}แล้ว`);
      element.reset();
      void client.invalidateQueries({ queryKey: ['operations'] });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : `ไม่สามารถ${formTitle}ได้`,
      );
    }
  };
  const randomize = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const request = {
        inspectorName: String(form.get('inspectorName')),
        branchSize: String(form.get('branchSize')) as 'all' | 'S' | 'M' | 'L',
        dueAt: String(form.get('dueAt')),
        excludeDays: Number(form.get('excludeDays')) || 30,
      };
      const nextAssignment = await (isIngredientInspectionTab
        ? randomizeIngredientInspection(request)
        : randomizeInspection(request));
      setAssignment(nextAssignment);
      setNotice(
        `มอบหมายงาน${isIngredientInspectionTab ? 'สุ่มตรวจวัตถุดิบ' : 'สุ่มตรวจช่าง'}ให้สาขา ${nextAssignment.branchName} แล้ว`,
      );
      void client.invalidateQueries({ queryKey: ['operations'] });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'ไม่สามารถสุ่มงานตรวจได้',
      );
    }
  };
  const updateRow = async (row: OperationRow) => {
    try {
      if (tab === 'maintenance')
        await updateMaintenanceStatus(row.id, 'completed');
      if (tab === 'assets')
        await updateAsset(row.id, {
          branchCode: row.branchCode,
          status: row.status === 'active' ? 'repairing' : 'active',
          note:
            row.status === 'active' ? 'ส่งซ่อมจากหน้าจัดการ' : 'กลับมาใช้งาน',
        });
      if (tab === 'billing')
        await updateServiceInvoiceStatus(
          row.id,
          row.status === 'paid' ? 'sent' : 'paid',
        );
      setNotice('อัปเดตสถานะแล้ว');
      void client.invalidateQueries({ queryKey: ['operations'] });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'ไม่สามารถอัปเดตสถานะได้',
      );
    }
  };
  const transferAsset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assetToTransfer) return;
    const form = new FormData(event.currentTarget);
    try {
      await updateAsset(assetToTransfer.id, {
        branchCode: String(form.get('branchCode')),
        status: 'active',
        note: String(form.get('note')) || 'โอนทรัพย์สินระหว่างสาขา',
        eventType: 'transferred',
      });
      setAssetToTransfer(null);
      setNotice('โอนทรัพย์สินแล้ว');
      void client.invalidateQueries({ queryKey: ['operations'] });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'ไม่สามารถโอนทรัพย์สินได้',
      );
    }
  };
  const loadAssetHistory = async (asset: OperationRow) => {
    try {
      setAssetHistory({
        name: String(asset.name ?? ''),
        events: await listAssetEvents(asset.id),
      });
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'ไม่สามารถโหลดประวัติทรัพย์สินได้',
      );
    }
  };
  const downloadPDF = async (
    inspectionID: number,
    branchName?: string,
    branchCode?: string,
    inspectionType: 'technician' | 'ingredients' = 'technician',
  ) => {
    try {
      await downloadInspectionPDF(
        inspectionID,
        branchName,
        branchCode,
        inspectionType,
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'ไม่สามารถดาวน์โหลด PDF ได้',
      );
    }
  };
  const downloadMaintenanceWorkOrder = async (row: OperationRow) => {
    try {
      await downloadMaintenancePDF(
        row.id,
        String(row.branchName ?? ''),
        String(row.branchCode ?? ''),
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'ไม่สามารถดาวน์โหลด PDF ได้',
      );
    }
  };
  return (
    <DashboardMain>
      <Stack spacing={2.5}>
        <Box sx={{ display: 'grid', gap: 0.25 }}>
          <Typography
            sx={{
              color: '#3c2d24',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1.35,
            }}
          >
            ตรวจมาตรฐานและบริการสาขา
          </Typography>
          <Typography sx={sectionDescriptionSx}>
            สุ่มตรวจ งานช่าง/แจ้งซ่อม ทรัพย์สิน และรายได้บริการ
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          {tabs.map(([id, title]) => (
            <Button
              key={id}
              variant="outlined"
              onClick={() => {
                setTab(id);
                setAssignment(null);
              }}
              sx={{
                minHeight: 42,
                px: 2,
                boxSizing: 'border-box',
                border: '1px solid',
                borderColor: tab === id ? '#171411' : 'rgba(23, 20, 17, 0.35)',
                bgcolor: tab === id ? '#171411' : 'transparent',
                color: tab === id ? '#fff' : '#171411',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 13,
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#171411',
                  bgcolor: tab === id ? '#171411' : 'rgba(23, 20, 17, 0.06)',
                },
              }}
            >
              {title}
            </Button>
          ))}
        </Stack>
        {tab === 'maintenance' ? (
          <Typography sx={sectionDescriptionSx}>
            รายการแจ้งซ่อมจากทุกแฟรนไชส์ กด “ใบงาน PDF”
            เพื่อส่งรายละเอียดให้ช่างดำเนินการ
          </Typography>
        ) : null}
        {notice ? (
          <Alert severity="info" onClose={() => setNotice('')}>
            {notice}
          </Alert>
        ) : null}
        {isInspectionTab ? (
          <>
            <Card
              component="form"
              variant="outlined"
              onSubmit={randomize}
              sx={formCardSx}
            >
              <Typography sx={sectionTitleSx}>
                {isIngredientInspectionTab
                  ? 'สุ่มงานตรวจวัตถุดิบ'
                  : 'สุ่มงานตรวจช่าง'}
              </Typography>
              <Typography sx={{ ...sectionDescriptionSx, mt: 0.4, mb: 2 }}>
                {isIngredientInspectionTab
                  ? 'กรอกชื่อผู้ตรวจ แล้วให้ระบบเลือกสาขาและสร้างใบงานตรวจวัตถุดิบแยกต่างหาก'
                  : 'กรอกชื่อช่าง แล้วให้ระบบเลือกสาขาและสร้างใบงานตรวจพื้นที่ร้าน ระบบ EV และห้องน้ำ'}
              </Typography>
              <Box sx={inspectionFormGridSx}>
                <TextField
                  name="inspectorName"
                  label={
                    isIngredientInspectionTab
                      ? 'ผู้รับงานตรวจ'
                      : 'ช่างผู้รับงาน'
                  }
                  required
                  sx={inputSx}
                />
                <TextField
                  name="dueAt"
                  type="date"
                  label="กำหนดตรวจ"
                  inputRef={inspectionDateInputRef}
                  onClick={openInspectionDatePicker}
                  fullWidth
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                      endAdornment: (
                        <InputAdornment
                          position="end"
                          sx={{ pointerEvents: 'none' }}
                        >
                          <CalendarDaysIcon
                            ref={inspectionCalendarIconRef}
                            size={22}
                          />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    ...inputSx,
                    '& input::-webkit-calendar-picker-indicator': {
                      display: 'none',
                    },
                  }}
                />
                <TextField
                  select
                  name="branchSize"
                  label="ขนาดสาขา"
                  defaultValue="all"
                  slotProps={{ select: { IconComponent: ChevronDownIcon } }}
                  sx={inputSx}
                >
                  <MenuItem value="all">ทุกขนาด</MenuItem>
                  <MenuItem value="S">S</MenuItem>
                  <MenuItem value="M">M</MenuItem>
                  <MenuItem value="L">L</MenuItem>
                </TextField>
                <TextField
                  name="excludeDays"
                  type="number"
                  label="ไม่สุ่มซ้ำย้อนหลัง (วัน)"
                  defaultValue="30"
                  slotProps={{ htmlInput: { min: 0, max: 365 } }}
                  sx={inputSx}
                />
              </Box>
              <Button type="submit" variant="contained" sx={formActionSx}>
                {isIngredientInspectionTab
                  ? 'สร้างใบงานตรวจวัตถุดิบ'
                  : 'สร้างใบงานให้ช่าง'}
              </Button>
            </Card>
            {assignment ? (
              <Card
                variant="outlined"
                sx={{
                  ...formCardSx,
                  borderColor: 'primary.main',
                  bgcolor: '#fffcfa',
                }}
              >
                <Typography sx={sectionTitleSx}>
                  {isIngredientInspectionTab
                    ? 'ใบงานตรวจวัตถุดิบ'
                    : 'ใบงานช่าง'}
                  : {assignment.branchName}
                </Typography>
                <Typography sx={{ ...sectionDescriptionSx, mt: 0.4, mb: 1.5 }}>
                  ขนาด {assignment.branchSize} · พร้อมส่งให้
                  {isIngredientInspectionTab ? 'ผู้ตรวจ' : 'ช่าง'}
                </Typography>
                <Box
                  component="ol"
                  sx={{
                    display: 'grid',
                    gap: 0.5,
                    my: 0,
                    pl: 3,
                    color: '#3c2d24',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 13,
                    lineHeight: 1.55,
                  }}
                >
                  {assignment.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </Box>
                <Button
                  size="small"
                  sx={{ ...formActionSx, mt: 1.75 }}
                  onClick={() =>
                    void downloadPDF(
                      assignment.id,
                      String(assignment.branchName ?? ''),
                      String(assignment.branchCode ?? ''),
                      assignment.inspectionType ??
                        (isIngredientInspectionTab
                          ? 'ingredients'
                          : 'technician'),
                    )
                  }
                >
                  ดาวน์โหลดใบงาน PDF
                </Button>
              </Card>
            ) : null}
          </>
        ) : null}
        {!isInspectionTab && tab !== 'maintenance' ? (
          <Card
            component="form"
            variant="outlined"
            onSubmit={submit}
            sx={formCardSx}
          >
            <Typography sx={{ ...sectionTitleSx, mb: 2 }}>
              {formTitle}
            </Typography>
            <Box sx={formGridSx}>
              {tab === 'assets' ? (
                <AssetFields />
              ) : (
                <InvoiceFields
                  maintenance={data.data?.maintenance ?? []}
                  inspections={data.data?.inspections ?? []}
                />
              )}
            </Box>
            <Button type="submit" variant="contained" sx={formActionSx}>
              บันทึกรายการ
            </Button>
          </Card>
        ) : null}
        {tab === 'assets' && assetToTransfer ? (
          <Card
            component="form"
            variant="outlined"
            onSubmit={transferAsset}
            sx={formCardSx}
          >
            <Typography sx={{ ...sectionTitleSx, mb: 1.5 }}>
              โอน {String(assetToTransfer.name ?? 'ทรัพย์สิน')}
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <BranchField />
              <TextField name="note" label="หมายเหตุการโอน" fullWidth />
              <Button type="submit">ยืนยันโอน</Button>
              <Button onClick={() => setAssetToTransfer(null)}>ยกเลิก</Button>
            </Stack>
          </Card>
        ) : null}
        {tab === 'assets' && assetHistory ? (
          <Card variant="outlined" sx={formCardSx}>
            <Stack
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography sx={sectionTitleSx}>
                ประวัติ: {assetHistory.name}
              </Typography>
              <Button size="small" onClick={() => setAssetHistory(null)}>
                ปิด
              </Button>
            </Stack>
            {assetHistory.events.length ? (
              assetHistory.events.map((event) => (
                <Typography key={event.id} color="text.secondary">
                  {labels[event.eventType] ?? event.eventType} ·{' '}
                  {event.branchName} · {event.note || '—'}
                </Typography>
              ))
            ) : (
              <Typography color="text.secondary">ยังไม่มีประวัติ</Typography>
            )}
          </Card>
        ) : null}
        <Card
          variant="outlined"
          sx={{
            overflowX: 'auto',
            borderColor: '#e8ddd5',
            borderRadius: '15px',
          }}
        >
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              '& th': {
                p: '12px 14px',
                bgcolor: '#fcf9f6',
                borderBottom: '1px solid #eee4dd',
                textAlign: 'left',
                whiteSpace: 'nowrap',
                color: '#5a473a',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 12.5,
                fontWeight: 600,
              },
              '& td': {
                p: '14px',
                borderBottom: '1px solid #eee4dd',
                textAlign: 'left',
                whiteSpace: 'nowrap',
                color: '#3c2d24',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 13,
                lineHeight: 1.5,
              },
              '& tbody tr:last-child td': {
                borderBottom: 0,
              },
              '& tbody tr:hover': {
                bgcolor: '#fffcfa',
              },
            }}
          >
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{columnLabels[column] ?? column}</th>
                ))}
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column}>
                      {formatOperationValue(column, row[column])}
                    </td>
                  ))}
                  <td>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ flexWrap: 'wrap', minWidth: 'max-content' }}
                    >
                      {isInspectionTab && row.status === 'scheduled' ? (
                        <Button
                          size="small"
                          variant="outlined"
                          sx={tableActionSx}
                          onClick={() =>
                            void downloadPDF(
                              row.id,
                              String(row.branchName ?? ''),
                              String(row.branchCode ?? ''),
                              String(row.inspectionType ?? 'technician') as
                                'technician' | 'ingredients',
                            )
                          }
                        >
                          ดาวน์โหลด PDF
                        </Button>
                      ) : tab !== 'inspection' ? (
                        <>
                          {tab === 'maintenance' ? (
                            <Button
                              size="small"
                              variant="outlined"
                              sx={tableActionSx}
                              onClick={() =>
                                void downloadMaintenanceWorkOrder(row)
                              }
                            >
                              ใบงาน PDF
                            </Button>
                          ) : null}
                          {tab === 'maintenance' &&
                          row.status === 'completed' ? null : (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                sx={tableActionSx}
                                onClick={() => void updateRow(row)}
                              >
                                {tab === 'maintenance'
                                  ? 'ปิดงาน'
                                  : tab === 'assets'
                                    ? row.status === 'active'
                                      ? 'ส่งซ่อม'
                                      : 'กลับใช้งาน'
                                    : row.status === 'paid'
                                      ? 'แก้เป็นส่งแล้ว'
                                      : 'บันทึกชำระแล้ว'}
                              </Button>
                              {tab === 'assets' ? (
                                <>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    sx={tableActionSx}
                                    onClick={() => setAssetToTransfer(row)}
                                  >
                                    โอนสาขา
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    sx={tableActionSx}
                                    onClick={() => void loadAssetHistory(row)}
                                  >
                                    ประวัติ
                                  </Button>
                                </>
                              ) : null}
                            </>
                          )}
                        </>
                      ) : null}
                    </Stack>
                  </td>
                </tr>
              ))}
              {!data.isLoading && !rows.length ? (
                <tr>
                  <td colSpan={columns.length + 1}>ยังไม่มีข้อมูล</td>
                </tr>
              ) : null}
            </tbody>
          </Box>
        </Card>
      </Stack>
    </DashboardMain>
  );
}
