import { useEffect, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { ActionSnackbar, ReceiptTextIcon } from '@stackbuild/ui';
import {
  cancelLeaveRequest,
  leaveRequestPdfUrl,
  listMyLeaveRequests,
  type MyLeaveRequest,
} from '../api/attendance';

const statusLabel: Record<MyLeaveRequest['status'], string> = {
  pending: 'รอพิจารณา',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
};

export function MyLeaveRequests() {
  const [requests, setRequests] = useState<MyLeaveRequest[]>([]);
  const [cancellingRequest, setCancellingRequest] = useState<number | null>(
    null,
  );
  const [error, setError] = useState('');

  useEffect(() => {
    void listMyLeaveRequests()
      .then(setRequests)
      .catch(() => {
        // The work history remains available if leave documents cannot load.
      });
  }, []);

  const cancelRequest = async (request: MyLeaveRequest) => {
    if (
      !window.confirm(
        'ต้องการยกเลิกคำขอลานี้ใช่หรือไม่? คำขอและไฟล์แนบทั้งหมดจะถูกลบ',
      )
    )
      return;

    setCancellingRequest(request.id);
    try {
      await cancelLeaveRequest(request.id);
      setRequests((current) =>
        current.filter((item) => item.id !== request.id),
      );
      setError('');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'ไม่สามารถยกเลิกคำขอลาได้',
      );
    } finally {
      setCancellingRequest(null);
    }
  };

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderColor: '#e8ddd5',
          borderRadius: '15px',
          bgcolor: '#fffdfb',
        }}
      >
        <Stack spacing={1.5}>
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
            ใบลาของฉัน
          </Typography>
          {requests.length === 0 ? (
            <Typography color="text.secondary">ยังไม่มีคำขอลา</Typography>
          ) : (
            requests.map((request) => (
              <Box
                key={request.id}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  border: '1px solid #eee3dc',
                  borderRadius: '10px',
                  p: 1.5,
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>
                    {request.leaveDate} ถึง {request.leaveEndDate}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {leaveTypeLabel(request.leaveType)} ·{' '}
                    {statusLabel[request.status]}
                  </Typography>
                  {(request.attachments ?? []).length ? (
                    <Typography variant="body2" color="text.secondary">
                      แนบแล้ว {(request.attachments ?? []).length} ไฟล์:{' '}
                      {(request.attachments ?? [])
                        .map((attachment) => attachment.name)
                        .join(', ')}
                    </Typography>
                  ) : null}
                </Box>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', ml: 'auto' }}
                >
                  <Button
                    component="a"
                    href={leaveRequestPdfUrl(request.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    size="small"
                    startIcon={<ReceiptTextIcon size={18} />}
                  >
                    ดูใบลา PDF
                  </Button>
                  {request.status === 'pending' ? (
                    <Button
                      color="error"
                      size="small"
                      disabled={cancellingRequest === request.id}
                      onClick={() => void cancelRequest(request)}
                    >
                      ยกเลิกคำขอ
                    </Button>
                  ) : null}
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </Paper>
      <ActionSnackbar
        notice={error ? { message: error, severity: 'error' } : null}
        onClose={() => setError('')}
      />
    </>
  );
}

function leaveTypeLabel(value: MyLeaveRequest['leaveType']) {
  return {
    sick: 'ลาป่วย',
    personal: 'ลากิจ',
    vacation: 'ลาพักร้อน',
    other: 'ลาอื่นๆ',
  }[value];
}
