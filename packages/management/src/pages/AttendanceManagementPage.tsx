import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClockIcon, ReceiptTextIcon, UsersIcon } from '@stackbuild/ui';
import {
  listManagedAttendance,
  listManagedLeaveRequests,
  updateManagedLeaveRequest,
  type ManagedLeaveRequest,
} from '../api/attendance';
import { DataLoadNotice } from '../components/DataLoadNotice';
import { AttendanceSkeleton } from '../components/skeletons/AttendanceSkeleton';

const timeFormatter = new Intl.DateTimeFormat('th-TH', {
  hour: '2-digit',
  minute: '2-digit',
});
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

const currentMonth = () => new Date().toISOString().slice(0, 7);
const displayTime = (value: string | null) =>
  value ? timeFormatter.format(new Date(value)) : '-';

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

export function AttendanceManagementPage({
  franchiseMode = false,
}: { franchiseMode?: boolean } = {}) {
  const [month, setMonth] = useState(currentMonth);
  const queryClient = useQueryClient();
  const attendance = useQuery({
    queryKey: ['attendance-management', month],
    queryFn: () => listManagedAttendance(month),
  });
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
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['attendance-leave-requests'],
      }),
  });
  const rows = attendance.data ?? [];
  const openLeaves = (leaveRequests.data ?? []).filter(
    (item) => item.status === 'pending',
  );
  const initialLoading = attendance.isLoading && leaveRequests.isLoading;

  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        overflow: 'auto',
        p: { xs: 2, md: 4 },
        bgcolor: '#fbfaf8',
      }}
    >
      <Stack spacing={3} sx={{ maxWidth: 1240, mx: 'auto' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              ลงเวลาพนักงาน
            </Typography>
            <Typography color="text.secondary">
              {franchiseMode
                ? 'ข้อมูลพนักงานในแฟรนไชส์ของคุณเท่านั้น'
                : 'ข้อมูลพนักงานบริษัท Super Black Coffee เท่านั้น'}
            </Typography>
          </Box>
          <TextField
            label="เดือน"
            type="month"
            size="small"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </Stack>
        {updateLeave.error ? (
          <Alert severity="error">อัปเดตรายการไม่สำเร็จ</Alert>
        ) : null}
        {initialLoading ? (
          <AttendanceSkeleton />
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
                gap: 2,
              }}
            >
              <Paper
                variant="outlined"
                sx={{ p: 2.5, borderColor: '#e8ddd5', borderRadius: '15px' }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', mb: 2 }}
                >
                  <ClockIcon size={22} />
                  <Typography sx={{ fontWeight: 700 }}>
                    รายการเช็กอิน / เช็กเอาต์
                  </Typography>
                </Stack>
                {attendance.isLoading ? (
                  <Skeleton variant="rounded" height={140} />
                ) : attendance.error ? (
                  <DataLoadNotice />
                ) : rows.length === 0 ? (
                  <Typography color="text.secondary">
                    ยังไม่มีรายการลงเวลาในเดือนนี้
                  </Typography>
                ) : (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>พนักงาน</TableCell>
                          <TableCell>วันที่</TableCell>
                          <TableCell>เช็กอิน</TableCell>
                          <TableCell>เช็กเอาต์</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Typography sx={{ fontWeight: 600 }}>
                                {row.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                สาขา{row.branchName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {dateFormatter.format(
                                new Date(`${row.date}T00:00:00`),
                              )}
                            </TableCell>
                            <TableCell>{displayTime(row.checkInAt)}</TableCell>
                            <TableCell>{displayTime(row.checkOutAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </Paper>
              <Paper
                variant="outlined"
                sx={{ p: 2.5, borderColor: '#e8ddd5', borderRadius: '15px' }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', mb: 2 }}
                >
                  <UsersIcon size={22} />
                  <Typography sx={{ fontWeight: 700 }}>สรุปเดือนนี้</Typography>
                </Stack>
                <Typography
                  variant="h3"
                  color="primary"
                  sx={{ fontWeight: 700 }}
                >
                  {attendance.error ? '-' : rows.length}
                </Typography>
                <Typography color="text.secondary">รายการลงเวลา</Typography>
                <Typography
                  variant="h3"
                  color="secondary"
                  sx={{ mt: 2, fontWeight: 700 }}
                >
                  {leaveRequests.error ? '-' : openLeaves.length}
                </Typography>
                <Typography color="text.secondary">คำขอลารออนุมัติ</Typography>
              </Paper>
            </Box>
            <Paper
              variant="outlined"
              sx={{ p: 2.5, borderColor: '#e8ddd5', borderRadius: '15px' }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', mb: 2 }}
              >
                <ReceiptTextIcon size={22} />
                <Typography sx={{ fontWeight: 700 }}>คำขอลาพนักงาน</Typography>
              </Stack>
              {leaveRequests.isLoading ? (
                <Skeleton variant="rounded" height={56} />
              ) : leaveRequests.error ? (
                <DataLoadNotice />
              ) : (leaveRequests.data ?? []).length === 0 ? (
                <Typography color="text.secondary">ยังไม่มีคำขอลา</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {leaveRequests.data?.map((item) => (
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
    </Box>
  );
}
