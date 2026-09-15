import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardMain, DateField, formatDate } from '@stackbuild/ui';
import { ActionSnackbar, type ActionNotice } from '@stackbuild/management';
import {
  createFranchiseMaintenanceTicket,
  listFranchiseMaintenanceTickets,
  type FranchiseMaintenanceTicket,
} from '../../api/maintenance';

const maintenanceKey = ['franchise-maintenance-tickets'] as const;

const statusConfig: Record<
  FranchiseMaintenanceTicket['status'],
  { label: string; color: string; background: string }
> = {
  open: { label: 'รอรับงาน', color: '#8a4f22', background: '#f7eadf' },
  assigned: {
    label: 'กำลังดำเนินการ',
    color: '#435d78',
    background: '#e7edf5',
  },
  waiting_parts: { label: 'รออะไหล่', color: '#9b6200', background: '#fff1d9' },
  completed: { label: 'เสร็จสิ้น', color: '#2d6d47', background: '#e6f2e8' },
};

const priorityConfig: Record<
  FranchiseMaintenanceTicket['priority'],
  { label: string; color: string }
> = {
  low: { label: 'ทั่วไป', color: '#76675d' },
  normal: { label: 'ควรดำเนินการ', color: '#8a4f22' },
  urgent: { label: 'เร่งด่วน', color: '#b42318' },
};

function MaintenanceTicketList({
  tickets,
}: {
  tickets: FranchiseMaintenanceTicket[];
}) {
  if (!tickets.length) {
    return (
      <Card
        variant="outlined"
        sx={{
          display: 'grid',
          minHeight: 260,
          placeItems: 'center',
          borderColor: '#e8ddd5',
          borderRadius: '16px',
          textAlign: 'center',
        }}
      >
        <Box sx={{ px: 3 }}>
          <Typography sx={{ fontFamily: 'Kanit, sans-serif', fontWeight: 600 }}>
            ยังไม่มีรายการแจ้งซ่อม
          </Typography>
          <Typography
            sx={{
              mt: 0.5,
              color: 'text.secondary',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 13,
            }}
          >
            กรอกข้อมูลด้านซ้ายเพื่อส่งงานให้ทีมช่างรับดำเนินการ
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Stack sx={{ gap: 1.25 }}>
      {tickets.map((ticket) => {
        const status = statusConfig[ticket.status];
        const priority = priorityConfig[ticket.priority];
        return (
          <Card
            key={ticket.id}
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderColor: '#e8ddd5',
              borderRadius: '16px',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{
                alignItems: { sm: 'center' },
                gap: 1.25,
                justifyContent: 'space-between',
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
                  งานแจ้งซ่อม #{ticket.id} · {ticket.title}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.3,
                    color: 'text.secondary',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 12.5,
                  }}
                >
                  ส่งเมื่อ {formatDate(ticket.createdAt)}
                  {ticket.dueAt
                    ? ` · ต้องการให้ดำเนินการ ${formatDate(ticket.dueAt)}`
                    : ''}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.25,
                    color: 'text.secondary',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 12.5,
                  }}
                >
                  {ticket.technicianName
                    ? `ช่างผู้รับงาน: ${ticket.technicianName}`
                    : 'กำลังรอทีมช่างรับงาน'}
                </Typography>
              </Box>
              <Stack
                direction="row"
                sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}
              >
                <Chip
                  label={priority.label}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: priority.color,
                    color: priority.color,
                    fontFamily: 'Kanit, sans-serif',
                    fontWeight: 600,
                  }}
                />
                <Chip
                  label={status.label}
                  size="small"
                  sx={{
                    bgcolor: status.background,
                    color: status.color,
                    fontFamily: 'Kanit, sans-serif',
                    fontWeight: 600,
                  }}
                />
              </Stack>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}

export function FranchiseMaintenancePage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] =
    useState<FranchiseMaintenanceTicket['priority']>('normal');
  const [dueAt, setDueAt] = useState('');
  const [notice, setNotice] = useState<ActionNotice | null>(null);
  const tickets = useQuery({
    queryKey: maintenanceKey,
    queryFn: listFranchiseMaintenanceTickets,
  });
  const createTicket = useMutation({
    mutationFn: createFranchiseMaintenanceTicket,
    onSuccess: async () => {
      setTitle('');
      setDescription('');
      setPriority('normal');
      setDueAt('');
      setNotice({
        message: 'ส่งแจ้งซ่อมเรียบร้อยแล้ว ทีมช่างจะรับงานตามระดับความเร่งด่วน',
      });
      await queryClient.invalidateQueries({ queryKey: maintenanceKey });
    },
    onError: (error) => {
      setNotice({
        message:
          error instanceof Error ? error.message : 'ไม่สามารถส่งแจ้งซ่อมได้',
        severity: 'error',
      });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    if (!title.trim()) {
      setNotice({
        message: 'กรุณาระบุหัวข้อปัญหาที่ต้องการแจ้งซ่อม',
        severity: 'warning',
      });
      return;
    }
    createTicket.mutate({
      title: title.trim(),
      description: description.trim(),
      priority,
      dueAt,
    });
  };

  return (
    <DashboardMain>
      <Stack sx={{ gap: 2.25 }}>
        <Box>
          <Typography
            sx={{
              color: '#201914',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            แจ้งซ่อม / งานช่าง
          </Typography>
          <Typography
            sx={{
              mt: 0.25,
              color: 'text.secondary',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 13,
            }}
          >
            แจ้งปัญหาอุปกรณ์และพื้นที่สาขาให้ทีมช่างติดตามและดำเนินการ
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: 'minmax(300px, 0.82fr) minmax(0, 1.5fr)',
            },
            gap: 2,
          }}
        >
          <Card
            component="form"
            variant="outlined"
            onSubmit={submit}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderColor: '#e8ddd5',
              borderRadius: '16px',
            }}
          >
            <Stack sx={{ gap: 1.5 }}>
              <Box>
                <Typography
                  sx={{
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  ส่งแจ้งซ่อม
                </Typography>
                <Typography
                  sx={{
                    mt: 0.25,
                    color: 'text.secondary',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 12.5,
                  }}
                >
                  ระบุอาการให้ชัดเจนเพื่อให้ทีมช่างเตรียมอุปกรณ์ได้ตรงจุด
                </Typography>
              </Box>
              <TextField
                label="หัวข้อปัญหา"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="เช่น เครื่องชงกาแฟมีน้ำรั่ว"
              />
              <TextField
                select
                label="ระดับความเร่งด่วน"
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.target
                      .value as FranchiseMaintenanceTicket['priority'],
                  )
                }
              >
                <MenuItem value="low">ทั่วไป - ยังใช้งานได้</MenuItem>
                <MenuItem value="normal">
                  ควรดำเนินการ - กระทบการใช้งาน
                </MenuItem>
                <MenuItem value="urgent">
                  เร่งด่วน - หยุดใช้งานหรือไม่ปลอดภัย
                </MenuItem>
              </TextField>
              <TextField
                label="รายละเอียดอาการ"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                multiline
                minRows={4}
                placeholder="อธิบายอาการ จุดที่พบ และสิ่งที่ได้ตรวจสอบเบื้องต้น"
              />
              <DateField
                label="วันที่ต้องการให้ดำเนินการ"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={createTicket.isPending}
                sx={{
                  bgcolor: '#3c2d24',
                  minHeight: 46,
                  '&:hover': { bgcolor: '#2a1e17' },
                }}
              >
                {createTicket.isPending ? 'กำลังส่งแจ้งซ่อม…' : 'ส่งแจ้งซ่อม'}
              </Button>
            </Stack>
          </Card>

          <Stack sx={{ gap: 1.25 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                รายการแจ้งซ่อมของสาขา
              </Typography>
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 12.5,
                }}
              >
                {tickets.data?.length ?? 0} รายการ
              </Typography>
            </Box>
            {tickets.isLoading ? (
              <Card
                variant="outlined"
                sx={{
                  display: 'grid',
                  minHeight: 180,
                  placeItems: 'center',
                  borderColor: '#e8ddd5',
                  borderRadius: '16px',
                }}
              >
                <Typography
                  sx={{
                    color: 'text.secondary',
                    fontFamily: 'Kanit, sans-serif',
                  }}
                >
                  กำลังโหลดรายการแจ้งซ่อม…
                </Typography>
              </Card>
            ) : null}
            {tickets.isError ? (
              <Alert severity="error">ไม่สามารถโหลดรายการแจ้งซ่อมได้</Alert>
            ) : null}
            {!tickets.isLoading && !tickets.isError ? (
              <MaintenanceTicketList tickets={tickets.data ?? []} />
            ) : null}
          </Stack>
        </Box>
      </Stack>
      <ActionSnackbar notice={notice} onClose={() => setNotice(null)} />
    </DashboardMain>
  );
}
