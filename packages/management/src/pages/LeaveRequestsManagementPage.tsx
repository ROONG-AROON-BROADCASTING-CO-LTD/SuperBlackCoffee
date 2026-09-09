import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardMain, ReceiptTextIcon } from '@stackbuild/ui';
import {
  listManagedLeaveRequests,
  getManagedLeaveRequestAttachment,
  getManagedLeaveRequestPdf,
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
  vacation: 'ลาพักร้อน',
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
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
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
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );
  const pendingCount = requests.filter(
    (item) => item.status === 'pending',
  ).length;
  const openAttachment = async (
    leaveRequestID: number,
    attachmentID: number,
  ) => {
    try {
      const url = URL.createObjectURL(
        await getManagedLeaveRequestAttachment(leaveRequestID, attachmentID),
      );
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setActionNotice({
        message:
          error instanceof Error ? error.message : 'ไม่สามารถเปิดไฟล์แนบได้',
        severity: 'error',
      });
    }
  };
  const previewLeavePdf = async (
    leaveRequestID: number,
    employeeName: string,
  ) => {
    try {
      const url = URL.createObjectURL(
        await getManagedLeaveRequestPdf(leaveRequestID),
      );
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
      setPreviewTitle(`ใบลาของ ${employeeName}`);
    } catch (error) {
      setActionNotice({
        message:
          error instanceof Error ? error.message : 'ไม่สามารถเปิดใบลา PDF ได้',
        severity: 'error',
      });
    }
  };

  return (
    <DashboardMain>
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
                      <Box sx={{ flex: 1, minWidth: 260 }}>
                        <Typography sx={{ fontWeight: 700 }}>
                          {item.name} · {leaveTypeLabels[item.leaveType]}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ยื่นเมื่อ{' '}
                          {dateFormatter.format(new Date(item.createdAt))}
                        </Typography>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                              xs: '1fr',
                              sm: 'repeat(2, minmax(0, 1fr))',
                            },
                            gap: 1,
                            mt: 1.25,
                          }}
                        >
                          <LeaveDetail
                            label="ช่วงวันลา"
                            value={`${dateFormatter.format(new Date(`${item.leaveDate}T00:00:00`))} – ${dateFormatter.format(new Date(`${item.leaveEndDate ?? item.leaveDate}T00:00:00`))}`}
                          />
                          <LeaveDetail
                            label="สาขา / ตำแหน่ง"
                            value={`${item.branchName} / ${item.position || '-'}${item.employeeCode ? ` (${item.employeeCode})` : ''}`}
                          />
                          <LeaveDetail
                            label="เหตุผลการลา"
                            value={item.reason}
                          />
                          <LeaveDetail
                            label="เบอร์โทรระหว่างลา"
                            value={item.contactPhone || '-'}
                          />
                          <LeaveDetail
                            label="รายละเอียดเพิ่มเติม"
                            value={item.additionalDetails || '-'}
                          />
                          <LeaveDetail
                            label="เอกสารแนบ"
                            value={
                              (item.attachments ?? []).length
                                ? (item.attachments ?? [])
                                    .map((attachment) => attachment.name)
                                    .join(', ')
                                : 'ไม่มีไฟล์แนบ'
                            }
                          />
                        </Box>
                        {(item.attachments ?? []).some(
                          (attachment) =>
                            attachment.contentType === 'application/pdf',
                        ) ? (
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{
                              mt: 1,
                              flexWrap: 'wrap',
                              rowGap: 0.75,
                              alignItems: 'center',
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              เปิดเอกสาร:
                            </Typography>
                            {(item.attachments ?? [])
                              .filter(
                                (attachment) =>
                                  attachment.contentType === 'application/pdf',
                              )
                              .map((attachment) => (
                                <Button
                                  key={attachment.id}
                                  size="small"
                                  variant="outlined"
                                  onClick={() =>
                                    void openAttachment(item.id, attachment.id)
                                  }
                                >
                                  {attachment.name}
                                </Button>
                              ))}
                          </Stack>
                        ) : null}
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
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            void previewLeavePdf(item.id, item.name)
                          }
                        >
                          ดูใบลา PDF
                        </Button>
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
      <Dialog
        open={Boolean(previewUrl)}
        onClose={() => setPreviewUrl('')}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{previewTitle}</DialogTitle>
        <DialogContent sx={{ height: '75vh', p: 0 }}>
          {previewUrl ? (
            <iframe
              title={previewTitle}
              src={previewUrl}
              style={{ width: '100%', height: 'calc(100% - 56px)', border: 0 }}
            />
          ) : null}
          {previewUrl ? (
            <Box
              sx={{
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                px: 2,
              }}
            >
              <Button
                component="a"
                href={previewUrl}
                download="leave-request.pdf"
                variant="contained"
              >
                ดาวน์โหลด PDF
              </Button>
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>
    </DashboardMain>
  );
}

function LeaveDetail({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ borderLeft: '2px solid #eadfd7', pl: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}
      >
        {value}
      </Typography>
    </Box>
  );
}
