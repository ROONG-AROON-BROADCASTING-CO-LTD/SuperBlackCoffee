import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardMain } from '@stackbuild/ui';
import { branchCodeByBranch, branches } from '@stackbuild/management';
import {
  createAsset,
  createMaintenanceTicket,
  createServiceInvoice,
  downloadInspectionPDF,
  downloadMaintenancePDF,
  listAssets,
  listAssetEvents,
  listInspections,
  listMaintenanceTickets,
  listServiceInvoices,
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
const tabs = [
  ['maintenance', 'งานช่าง / แจ้งซ่อม'],
  ['inspection', 'สุ่มตรวจ'],
  ['assets', 'ทรัพย์สิน'],
  ['billing', 'เรียกเก็บเงิน'],
] as const;
type Tab = (typeof tabs)[number][0];
const inputSx = { minWidth: 0 };
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

function MaintenanceFields() {
  return (
    <>
      <BranchField />
      <TextField
        name="title"
        label="อาการ/งานที่ต้องการ"
        required
        sx={inputSx}
      />
      <TextField
        select
        name="priority"
        label="ความเร่งด่วน"
        defaultValue="normal"
        sx={inputSx}
      >
        <MenuItem value="low">ต่ำ</MenuItem>
        <MenuItem value="normal">ปกติ</MenuItem>
        <MenuItem value="urgent">เร่งด่วน</MenuItem>
      </TextField>
      <TextField name="technicianName" label="ช่าง/ผู้รับผิดชอบ" sx={inputSx} />
      <TextField
        name="dueAt"
        type="date"
        label="กำหนดเสร็จ"
        slotProps={{ inputLabel: { shrink: true } }}
        sx={inputSx}
      />
      <TextField
        name="description"
        label="รายละเอียด"
        multiline
        minRows={2}
        sx={inputSx}
      />
    </>
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
      <TextField name="serialNumber" label="Serial number" sx={inputSx} />
      <TextField
        name="warrantyUntil"
        type="date"
        label="หมดประกัน"
        slotProps={{ inputLabel: { shrink: true } }}
        sx={inputSx}
      />
      <TextField
        name="maintenanceDue"
        type="date"
        label="กำหนดบำรุงรักษา"
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
        slotProps={{ inputLabel: { shrink: true } }}
        sx={inputSx}
      />
    </>
  );
}

export function AdminOperationsPage() {
  const client = useQueryClient();
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
      : tab === 'inspection'
        ? 'inspections'
        : tab === 'assets'
          ? 'assets'
          : 'invoices';
  const sourceRows: OperationRow[] = data.data?.[key] ?? [];
  const rows =
    tab === 'inspection'
      ? sourceRows.filter((row) => row.status === 'scheduled')
      : sourceRows;
  const columns = useMemo(
    () =>
      tab === 'maintenance'
        ? [
            'title',
            'branchName',
            'priority',
            'status',
            'technicianName',
            'cost',
            'dueAt',
          ]
        : tab === 'inspection'
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
    tab === 'maintenance'
      ? 'แจ้งงานซ่อมบำรุง'
      : tab === 'assets'
        ? 'เพิ่มทรัพย์สินสาขา'
        : 'สร้างใบเรียกเก็บเงิน';
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    try {
      if (tab === 'maintenance')
        await createMaintenanceTicket({
          branchCode: String(form.get('branchCode')),
          title: String(form.get('title')),
          description: String(form.get('description')),
          priority: String(form.get('priority')),
          technicianName: String(form.get('technicianName')),
          dueAt: String(form.get('dueAt')),
          laborCost: 0,
          partsCost: 0,
          travelCost: 0,
        });
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
      const nextAssignment = await randomizeInspection({
        inspectorName: String(form.get('inspectorName')),
        branchSize: String(form.get('branchSize')) as 'all' | 'S' | 'M' | 'L',
        dueAt: String(form.get('dueAt')),
        excludeDays: Number(form.get('excludeDays')) || 30,
      });
      setAssignment(nextAssignment);
      setNotice(`มอบหมายงานสุ่มตรวจให้สาขา ${nextAssignment.branchName} แล้ว`);
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
  ) => {
    try {
      await downloadInspectionPDF(inspectionID, branchName, branchCode);
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
      <Stack spacing={2.25}>
        <Box>
          <Typography sx={{ fontSize: 27, fontWeight: 700 }}>
            ตรวจมาตรฐานและบริการสาขา
          </Typography>
          <Typography color="text.secondary">
            สุ่มตรวจ งานช่าง/แจ้งซ่อม ทรัพย์สิน และรายได้บริการ
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {tabs.map(([id, title]) => (
            <Button
              key={id}
              variant={tab === id ? 'contained' : 'outlined'}
              onClick={() => setTab(id)}
            >
              {title}
            </Button>
          ))}
        </Stack>
        {tab === 'maintenance' ? (
          <Typography color="text.secondary" sx={{ fontSize: 13 }}>
            รายการนี้รวมแจ้งซ่อมจากทุกแฟรนไชส์และงานที่แอดมินสร้างเอง กด “ใบงาน
            PDF” เพื่อส่งรายละเอียดให้ช่างดำเนินการ
          </Typography>
        ) : null}
        {notice ? (
          <Alert severity="info" onClose={() => setNotice('')}>
            {notice}
          </Alert>
        ) : null}
        {tab === 'inspection' ? (
          <>
            <Card
              component="form"
              variant="outlined"
              onSubmit={randomize}
              sx={{ p: 2 }}
            >
              <Typography sx={{ fontWeight: 700, mb: 1 }}>
                สุ่มงานตรวจสาขา
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                กรอกชื่อช่าง แล้วให้ระบบเลือกสาขาและสร้างใบงานตรวจครบทั้งคาเฟ่,
                EV และห้องน้ำ
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                  gap: 1,
                }}
              >
                <TextField
                  name="inspectorName"
                  label="ช่างผู้รับงาน"
                  required
                  sx={inputSx}
                />
                <TextField
                  name="dueAt"
                  type="date"
                  label="กำหนดตรวจ"
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={inputSx}
                />
              </Box>
              <Box component="details" sx={{ mt: 1 }}>
                <Box
                  component="summary"
                  sx={{ cursor: 'pointer', color: 'text.secondary' }}
                >
                  ตัวเลือกการสุ่ม
                </Box>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1}
                  sx={{ mt: 1 }}
                >
                  <TextField
                    select
                    name="branchSize"
                    label="ขนาดสาขา"
                    defaultValue="all"
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
                </Stack>
              </Box>
              <Button type="submit" sx={{ mt: 1.5 }}>
                สร้างใบงานให้ช่าง
              </Button>
            </Card>
            {assignment ? (
              <Card
                variant="outlined"
                sx={{ p: 2, borderColor: 'primary.main' }}
              >
                <Typography sx={{ fontWeight: 700 }}>
                  ใบงานช่าง: {assignment.branchName}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 1 }}>
                  ขนาด {assignment.branchSize} · พร้อมส่งให้ช่างตรวจ
                </Typography>
                <Box component="ol" sx={{ my: 0, pl: 3 }}>
                  {assignment.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </Box>
                <Button
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() =>
                    void downloadPDF(
                      assignment.id,
                      String(assignment.branchName ?? ''),
                      String(assignment.branchCode ?? ''),
                    )
                  }
                >
                  ดาวน์โหลดใบงาน PDF
                </Button>
              </Card>
            ) : null}
          </>
        ) : null}
        {tab !== 'inspection' ? (
          <Card
            component="form"
            variant="outlined"
            onSubmit={submit}
            sx={{ p: 2 }}
          >
            <Typography sx={{ fontWeight: 700, mb: 1 }}>{formTitle}</Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 1,
              }}
            >
              {tab === 'maintenance' ? (
                <MaintenanceFields />
              ) : tab === 'assets' ? (
                <AssetFields />
              ) : (
                <InvoiceFields
                  maintenance={data.data?.maintenance ?? []}
                  inspections={data.data?.inspections ?? []}
                />
              )}
            </Box>
            <Button type="submit" sx={{ mt: 1.5 }}>
              บันทึกรายการ
            </Button>
          </Card>
        ) : null}
        {tab === 'assets' && assetToTransfer ? (
          <Card
            component="form"
            variant="outlined"
            onSubmit={transferAsset}
            sx={{ p: 2 }}
          >
            <Typography sx={{ fontWeight: 700, mb: 1 }}>
              โอน {String(assetToTransfer.name ?? 'ทรัพย์สิน')}
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <BranchField />
              <TextField name="note" label="หมายเหตุการโอน" fullWidth />
              <Button type="submit">ยืนยันโอน</Button>
              <Button onClick={() => setAssetToTransfer(null)}>ยกเลิก</Button>
            </Stack>
          </Card>
        ) : null}
        {tab === 'assets' && assetHistory ? (
          <Card variant="outlined" sx={{ p: 2 }}>
            <Stack
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography sx={{ fontWeight: 700 }}>
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
        <Card variant="outlined" sx={{ overflowX: 'auto' }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              '& td,& th': {
                p: 1.25,
                borderBottom: '1px solid #eee4dd',
                textAlign: 'left',
                whiteSpace: 'nowrap',
              },
            }}
          >
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column}>
                      {column === 'status'
                        ? (labels[String(row[column])] ??
                          String(row[column] ?? '—'))
                        : String(row[column] ?? '—')}
                    </td>
                  ))}
                  <td>
                    {tab === 'inspection' && row.status === 'scheduled' ? (
                      <Button
                        size="small"
                        onClick={() =>
                          void downloadPDF(
                            row.id,
                            String(row.branchName ?? ''),
                            String(row.branchCode ?? ''),
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
                                  onClick={() => setAssetToTransfer(row)}
                                >
                                  โอนสาขา
                                </Button>
                                <Button
                                  size="small"
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
