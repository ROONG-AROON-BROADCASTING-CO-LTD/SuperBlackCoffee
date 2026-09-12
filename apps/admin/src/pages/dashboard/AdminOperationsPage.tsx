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
  createMaintenanceTicket,
  listAssets,
  listInspections,
  listMaintenanceTickets,
  listServiceInvoices,
  updateMaintenanceStatus,
  type OperationRow,
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
};
const tabs = [
  ['maintenance', 'งานช่าง'],
  ['inspection', 'สุ่มตรวจ'],
  ['assets', 'ทรัพย์สิน'],
  ['billing', 'เรียกเก็บเงิน'],
] as const;
type Tab = (typeof tabs)[number][0];

export function AdminOperationsPage() {
  const client = useQueryClient();
  const [tab, setTab] = useState<Tab>('maintenance');
  const [notice, setNotice] = useState('');
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
  const rows: OperationRow[] = data.data?.[key] ?? [];
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
          ? [
              'branchName',
              'inspectorName',
              'status',
              'score',
              'findings',
              'dueAt',
            ]
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
  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
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
      formElement.reset();
      setNotice('สร้างใบงานช่างแล้ว');
      client.invalidateQueries({ queryKey: ['operations'] });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'ไม่สามารถสร้างใบงานได้',
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
            สุ่มตรวจ งานช่าง ทรัพย์สิน และรายได้บริการ
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
        {notice ? <Alert severity="info">{notice}</Alert> : null}
        {tab === 'maintenance' ? (
          <Card
            component="form"
            variant="outlined"
            onSubmit={create}
            sx={{ p: 2 }}
          >
            <Typography sx={{ fontWeight: 700, mb: 1 }}>
              แจ้งงานซ่อมบำรุง
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' },
                gap: 1,
              }}
            >
              <TextField
                select
                name="branchCode"
                label="สาขา"
                required
                defaultValue=""
              >
                <MenuItem value="" disabled>
                  เลือกสาขา
                </MenuItem>
                {branches.slice(1).map((branch) => (
                  <MenuItem
                    key={branch}
                    value={
                      branchCodeByBranch[
                        branch as Exclude<(typeof branches)[number], 'ทุกสาขา'>
                      ]
                    }
                  >
                    {branch}
                  </MenuItem>
                ))}
              </TextField>
              <TextField name="title" label="อาการ/งานที่ต้องการ" required />
              <TextField
                select
                name="priority"
                label="ความเร่งด่วน"
                defaultValue="normal"
              >
                <MenuItem value="low">ต่ำ</MenuItem>
                <MenuItem value="normal">ปกติ</MenuItem>
                <MenuItem value="urgent">เร่งด่วน</MenuItem>
              </TextField>
              <TextField name="technicianName" label="ช่างผู้รับผิดชอบ" />
              <TextField
                name="dueAt"
                type="date"
                label="กำหนดเสร็จ"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField name="description" label="รายละเอียด" />
            </Box>
            <Button type="submit" sx={{ mt: 1.5 }}>
              สร้างใบงาน
            </Button>
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
                {tab === 'maintenance' ? <th>จัดการ</th> : null}
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
                  {tab === 'maintenance' ? (
                    <td>
                      {row.status !== 'completed' ? (
                        <Button
                          size="small"
                          onClick={async () => {
                            await updateMaintenanceStatus(row.id, 'completed');
                            client.invalidateQueries({
                              queryKey: ['operations'],
                            });
                          }}
                        >
                          ปิดงาน
                        </Button>
                      ) : null}
                    </td>
                  ) : null}
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
