import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ActionSnackbar,
  AmbulanceIcon,
  DateField,
  PlusIcon,
  UsersIcon,
} from '@stackbuild/ui';
import type { LeaveType } from '../types/attendance';

const leaveTypeApi = {
  ลาป่วย: 'sick',
  ลากิจ: 'personal',
  ลาพักร้อน: 'vacation',
  ลาอื่นๆ: 'other',
} as const;

const defaultLeaveDate = (() => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
})();

function nextCalendarDay(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

export function AttendanceLeaveRequestPage({
  onSuccess,
}: {
  onSuccess: (input: {
    leaveDate: string;
    leaveEndDate: string;
    leaveType: 'sick' | 'personal' | 'vacation' | 'other';
    reason: string;
    contactPhone: string;
    additionalDetails: string;
    attachments: File[];
  }) => Promise<{ id: number; status: string }>;
}) {
  const [leaveType, setLeaveType] = useState<LeaveType>('ลาป่วย');
  const [reason, setReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [leaveDate, setLeaveDate] = useState(defaultLeaveDate);
  const [leaveEndDate, setLeaveEndDate] = useState(() =>
    nextCalendarDay(defaultLeaveDate),
  );
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewError, setPreviewError] = useState('');
  const submit = async () => {
    try {
      await onSuccess({
        leaveDate,
        leaveEndDate,
        leaveType: leaveTypeApi[leaveType],
        reason: reason.trim(),
        contactPhone: contactPhone.trim(),
        additionalDetails: additionalDetails.trim(),
        attachments,
      });
      setReason('');
      setAdditionalDetails('');
      setContactPhone('');
      setAttachments([]);
    } catch {
      setPreviewError(
        'ไม่สามารถส่งคำขอลาได้ กรุณาตรวจสอบวันที่ลาแล้วลองใหม่อีกครั้ง',
      );
    }
  };

  const addAttachments = (files: FileList | null) => {
    if (!files) return;
    setAttachments((current) => [...current, ...Array.from(files)].slice(0, 5));
  };

  return (
    <Stack spacing={{ xs: 0, md: 2.5 }}>
      <Typography
        sx={{
          display: { xs: 'none', md: 'block' },
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        คำขอลา
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderColor: '#e8ddd5',
          borderRadius: '15px',
          bgcolor: '#fffdfb',
        }}
      >
        <Stack spacing={2.25}>
          <Typography color="text.secondary">
            กรอกรายละเอียดตามใบลาหยุดงาน ระบบจะสร้างเอกสาร PDF
            ให้ดูได้หลังส่งคำขอ
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(4, 1fr)',
              },
              gap: 1.25,
            }}
          >
            {(['ลาป่วย', 'ลากิจ', 'ลาพักร้อน', 'ลาอื่นๆ'] as LeaveType[]).map(
              (type) => (
                <Button
                  key={type}
                  variant="outlined"
                  onClick={() => setLeaveType(type)}
                  sx={{
                    height: 72,
                    minHeight: '72px !important',
                    boxSizing: 'border-box',
                    display: 'grid',
                    alignContent: 'center',
                    gap: 0.5,
                    minWidth: 0,
                    fontSize: { xs: 12, sm: 14 },
                    borderColor:
                      leaveType === type ? '#171411' : 'rgba(23, 20, 17, .4)',
                    bgcolor: leaveType === type ? '#171411' : 'transparent',
                    color: leaveType === type ? '#fff' : 'text.primary',
                    transition:
                      'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
                    '&:hover': {
                      borderColor: '#171411',
                      bgcolor:
                        leaveType === type
                          ? '#171411'
                          : 'rgba(23, 20, 17, .04)',
                    },
                    '&:active': { transform: 'none' },
                  }}
                >
                  {type === 'ลาป่วย' ? (
                    <AmbulanceIcon size={22} />
                  ) : type === 'ลากิจ' ? (
                    <UsersIcon size={22} />
                  ) : (
                    <PlusIcon size={22} />
                  )}
                  {type}
                </Button>
              ),
            )}
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <DateField
              label="ตั้งแต่วันที่"
              value={leaveDate}
              onChange={(event) => {
                setLeaveDate(event.target.value);
                if (event.target.value >= leaveEndDate)
                  setLeaveEndDate(nextCalendarDay(event.target.value));
              }}
            />
            <DateField
              label="ถึงวันที่"
              min={nextCalendarDay(leaveDate)}
              value={leaveEndDate}
              onChange={(event) => setLeaveEndDate(event.target.value)}
            />
          </Box>
          <TextField
            label="เบอร์โทรติดต่อระหว่างลา"
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
            fullWidth
          />
          <TextField
            label="เหตุผลการลา"
            multiline
            minRows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            fullWidth
          />
          <TextField
            label="รายละเอียดเพิ่มเติม / เอกสารประกอบ (ถ้ามี)"
            multiline
            minRows={2}
            value={additionalDetails}
            onChange={(event) => setAdditionalDetails(event.target.value)}
            fullWidth
          />
          <Stack spacing={1} sx={{ mt: -2.25 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 1,
                flexWrap: 'nowrap',
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  เอกสารแนบ (ถ้ามี)
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  รองรับ JPG, PNG, WEBP และ PDF
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  สูงสุด 5 ไฟล์ ไฟล์ละ 5 MB
                </Typography>
              </Box>
              <Stack spacing={1} sx={{ ml: 'auto', flexShrink: 0 }}>
                <Button
                  component="label"
                  variant="outlined"
                  disabled={attachments.length >= 5}
                >
                  เลือกไฟล์
                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    multiple
                    onChange={(event) => {
                      addAttachments(event.target.files);
                      event.target.value = '';
                    }}
                  />
                </Button>
                <Button
                  component="label"
                  variant="outlined"
                  disabled={attachments.length >= 5}
                >
                  ถ่ายรูป
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => {
                      addAttachments(event.target.files);
                      event.target.value = '';
                    }}
                  />
                </Button>
              </Stack>
            </Box>
            {attachments.length ? (
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {attachments.map((file, index) => (
                  <Chip
                    key={`${file.name}-${index}`}
                    label={`${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`}
                    onDelete={() =>
                      setAttachments((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                  />
                ))}
              </Box>
            ) : null}
          </Stack>
          <Button
            variant="contained"
            disabled={!reason.trim() || leaveEndDate < leaveDate}
            onClick={() => void submit()}
            sx={{
              width: '100%',
              height: 58,
              fontSize: '17px !important',
              fontWeight: '500 !important',
              '&.Mui-disabled': { bgcolor: '#e6e2df', color: '#a6a09d' },
            }}
          >
            ส่งคำขอลาและสร้างใบลา PDF
          </Button>
        </Stack>
      </Paper>
      <ActionSnackbar
        notice={
          previewError ? { message: previewError, severity: 'error' } : null
        }
        onClose={() => setPreviewError('')}
      />
    </Stack>
  );
}
