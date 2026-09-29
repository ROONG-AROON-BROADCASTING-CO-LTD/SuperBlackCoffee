import { useEffect, useState } from 'react';
import {
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
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
          borderRadius: '0 0 15px 15px',
          bgcolor: '#fffdfb',
        }}
      >
        <Stack spacing={1.75}>
          <Typography
            sx={{ fontSize: 18, fontWeight: 700, px: { xs: 0, sm: 0.5 } }}
          >
            ใบลาของฉัน
          </Typography>
          {requests.length === 0 ? (
            <Typography
              color="text.secondary"
              sx={{ px: { xs: 0, sm: 0.5 }, pb: 0.5 }}
            >
              ยังไม่มีคำขอลา
            </Typography>
          ) : (
            <TableContainer
              sx={{ border: '1px solid #eee3dc', borderRadius: '10px' }}
            >
              <Table
                size="small"
                sx={{
                  minWidth: { xs: 0, sm: 680 },
                  tableLayout: { xs: 'fixed', sm: 'auto' },
                }}
                aria-label="รายการใบลาของฉัน"
              >
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f7f3f0' }}>
                    {['วันที่ลา', 'ประเภท', 'สถานะ', 'เอกสาร'].map(
                      (label, index) => (
                        <TableCell
                          key={label}
                          sx={{
                            borderColor: '#eee3dc',
                            color: '#76675d',
                            display: {
                              xs: index === 1 ? 'none' : 'table-cell',
                            },
                            fontSize: { xs: 12, sm: 14 },
                            fontWeight: 700,
                            py: 1.25,
                            width: {
                              xs:
                                index === 0
                                  ? '43%'
                                  : index === 2
                                    ? '22%'
                                    : '35%',
                              sm: 'auto',
                            },
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {label}
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id} hover>
                      <TableCell sx={tableCellStyle}>
                        {request.leaveDate === request.leaveEndDate
                          ? request.leaveDate
                          : `${request.leaveDate} ถึง ${request.leaveEndDate}`}
                      </TableCell>
                      <TableCell
                        sx={{
                          ...tableCellStyle,
                          display: { xs: 'none', sm: 'table-cell' },
                        }}
                      >
                        {leaveTypeLabel(request.leaveType)}
                      </TableCell>
                      <TableCell sx={tableCellStyle}>
                        {statusLabel[request.status]}
                      </TableCell>
                      <TableCell sx={tableCellStyle}>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: 'center', whiteSpace: 'nowrap' }}
                        >
                          <Button
                            component="a"
                            href={leaveRequestPdfUrl(request.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="ดูใบลา PDF"
                            variant="outlined"
                            size="small"
                            startIcon={<ReceiptTextIcon size={16} />}
                          >
                            <span className="desktop-label">ดูใบลา PDF</span>
                            <span className="mobile-label">PDF</span>
                          </Button>
                          {request.status === 'pending' ? (
                            <Button
                              color="error"
                              size="small"
                              aria-label="ยกเลิกคำขอ"
                              disabled={cancellingRequest === request.id}
                              onClick={() => void cancelRequest(request)}
                            >
                              ยกเลิก
                            </Button>
                          ) : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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

const tableCellStyle = {
  borderColor: '#eee3dc',
  color: '#2a221d',
  fontSize: { xs: 12, sm: 14 },
  py: 1.5,
  whiteSpace: 'nowrap',
  '& .mobile-label': { display: { xs: 'inline', sm: 'none' } },
  '& .desktop-label': { display: { xs: 'none', sm: 'inline' } },
};

function leaveTypeLabel(value: MyLeaveRequest['leaveType']) {
  return {
    sick: 'ลาป่วย',
    personal: 'ลากิจ',
    vacation: 'ลาพักร้อน',
    other: 'ลาอื่นๆ',
  }[value];
}
