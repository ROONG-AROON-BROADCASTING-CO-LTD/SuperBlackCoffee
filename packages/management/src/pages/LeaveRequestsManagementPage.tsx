import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ReceiptTextIcon } from '@stackbuild/ui';
import {
  listManagedLeaveRequests,
  updateManagedLeaveRequest,
  type ManagedLeaveRequest,
} from '../api/attendance';
import { DataLoadNotice } from '../components/DataLoadNotice';
import { LeaveRequestsSkeleton } from '../components/skeletons/LeaveRequestsSkeleton';
import {
  ActionSnackbar,
  type ActionNotice,
} from '../components/ActionSnackbar';

const dateFormatter = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const leaveTypeLabels = {
  sick: 'ลาป่วย',
  personal: 'ลากิจ',
  other: 'ลาอื่น ๆ',
};
const leaveStatusLabels = {
  pending: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
};

function LeaveStatusChip({
  status,
}: {
  status: ManagedLeaveRequest['status'];
}) {
  return (
    <Chip
      size="small"
      label={leaveStatusLabels[status]}
      color={
        status === 'approved'
          ? 'success'
          : status === 'rejected'
            ? 'error'
            : 'warning'
      }
    />
  );
}

export function LeaveRequestsManagementPage({
  franchiseMode = false,
}: { franchiseMode?: boolean } = {}) {
  const queryClient = useQueryClient();
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const leaveRequests = useQuery({
    queryKey: ['attendance-leave-requests'],
    queryFn: listManagedLeaveRequests,
  });
  const updateLeave = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number;
      status: 'approved' | 'rejected';
    }) => updateManagedLeaveRequest(id, status),
    onSuccess: (_, variables) => {
      setActionNotice({
        message:
          variables.status === 'approved'
            ? 'อนุมัติคำขอลาแล้ว'
            : 'ไม่อนุมัติคำขอลาแล้ว',
      });
      void queryClient.invalidateQueries({
        queryKey: ['attendance-leave-requests'],
      });
    },
    onError: (error) =>
      setActionNotice({
        message:
          error instanceof Error ? error.message : 'บันทึกคำขอลาไม่สำเร็จ',
        severity: 'error',
      }),
  });
  const requests = leaveRequests.data ?? [];
  const pendingCount = requests.filter(
    (item) => item.status === 'pending',
  ).length;

  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        minWidth: 0,
        width: '100%',
        height: 'calc(100vh - 72px)',
        mt: '72px',
        overflowY: 'auto',
        overflowX: 'hidden',
        p: { xs: 2, md: 4 },
        bgcolor: '#fbfaf8',
      }}
    >
      <Stack spacing={3} sx={{ maxWidth: 1240, mx: 'auto' }}>
        <Box>
          <Typography
            sx={{
              color: '#201914',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            คำขอลาพนักงาน
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ fontFamily: 'Kanit, sans-serif', fontSize: 14 }}
          >
            {franchiseMode
              ? 'พิจารณาคำขอลาของพนักงานในแฟรนไชส์ของคุณ'
              : 'พิจารณาคำขอลาของพนักงานบริษัท Super Black Coffee'}
          </Typography>
        </Box>
        {updateLeave.error ? (
          <Alert severity="error">อัปเดตรายการไม่สำเร็จ</Alert>
        ) : null}
        {leaveRequests.isLoading ? (
          <LeaveRequestsSkeleton />
        ) : leaveRequests.error ? (
          <DataLoadNotice />
        ) : (
          <>
            <Paper
              variant="outlined"
              sx={{ p: 2.5, borderColor: '#e8ddd5', borderRadius: '15px' }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <ReceiptTextIcon size={22} />
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>รออนุมัติ</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {pendingCount} รายการ
                  </Typography>
                </Box>
              </Stack>
            </Paper>
            <Paper
              variant="outlined"
              sx={{ p: 2.5, borderColor: '#e8ddd5', borderRadius: '15px' }}
            >
              {requests.length === 0 ? (
                <Typography color="text.secondary">ยังไม่มีคำขอลา</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {requests.map((item) => (
                    <Paper
                      key={item.id}
                      variant="outlined"
                      sx={{
                        p: 1.75,
                        borderColor: '#eee2db',
                        borderRadius: '12px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1.25,
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>
                          {item.name} · {leaveTypeLabels[item.leaveType]}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {dateFormatter.format(
                            new Date(`${item.leaveDate}T00:00:00`),
                          )}{' '}
                          · สาขา{item.branchName} · {item.reason}
                        </Typography>
                        {item.status !== 'pending' && item.approvedBy ? (
                          <Typography variant="caption" color="text.secondary">
                            ดำเนินการโดย {item.approvedBy}
                            {item.approvedAt
                              ? ` · ${dateFormatter.format(new Date(item.approvedAt))}`
                              : ''}
                            {item.decisionNote ? ` · ${item.decisionNote}` : ''}
                          </Typography>
                        ) : null}
                      </Box>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'center' }}
                      >
                        <LeaveStatusChip status={item.status} />
                        {item.status === 'pending' ? (
                          <>
                            <Button
                              size="small"
                              color="success"
                              onClick={() =>
                                updateLeave.mutate({
                                  id: item.id,
                                  status: 'approved',
                                })
                              }
                            >
                              อนุมัติ
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={() =>
                                updateLeave.mutate({
                                  id: item.id,
                                  status: 'rejected',
                                })
                              }
                            >
                              ไม่อนุมัติ
                            </Button>
                          </>
                        ) : null}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          </>
        )}
      </Stack>
      <ActionSnackbar
        notice={actionNotice}
        onClose={() => setActionNotice(null)}
      />
    </Box>
  );
}
