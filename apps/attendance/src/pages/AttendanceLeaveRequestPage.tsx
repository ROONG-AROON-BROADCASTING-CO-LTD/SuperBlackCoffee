import { useRef, useState } from 'react';
import {
  Box,
  Button,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AmbulanceIcon,
  CalendarDaysIcon,
  type CalendarDaysIconHandle,
  PlusIcon,
  SendIcon,
  UsersIcon,
} from '@stackbuild/ui';
import type { LeaveType } from '../types/attendance';

export function AttendanceLeaveRequestPage({
  onSuccess,
}: {
  onSuccess: (input: {
    leaveDate: string;
    leaveType: 'sick' | 'personal' | 'other';
    reason: string;
  }) => Promise<void>;
}) {
  const [leaveType, setLeaveType] = useState<LeaveType>('ลาป่วย');
  const [reason, setReason] = useState('');
  const [leaveDate, setLeaveDate] = useState('2026-09-07');
  const leaveDateInputRef = useRef<HTMLInputElement>(null);
  const calendarIconRef = useRef<CalendarDaysIconHandle>(null);
  const leaveTypeApi = {
    ลาป่วย: 'sick',
    ลากิจ: 'personal',
    ลาอื่นๆ: 'other',
  } as const;

  const openLeaveDatePicker = () => {
    calendarIconRef.current?.startAnimation();
    window.setTimeout(() => calendarIconRef.current?.stopAnimation(), 950);
    leaveDateInputRef.current?.showPicker?.();
  };

  return (
    <Stack
      spacing={{ xs: 0, md: 2.5 }}
      sx={{
        height: {
          xs: 'calc(100dvh - 72px - var(--attendance-mobile-nav-height, 82px) - env(safe-area-inset-bottom) - 48px)',
          md: 'auto',
        },
      }}
    >
      <Typography
        sx={{
          display: { xs: 'none', md: 'block' },
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1.2,
        }}
      >
        คำขอลา
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          width: '100%',
          p: { xs: 2.5, sm: 3.5 },
          flex: { xs: 1, md: 'initial' },
          minHeight: 0,
          display: 'flex',
          borderColor: '#e8ddd5',
          borderRadius: '15px',
          bgcolor: '#fffdfb',
        }}
      >
        <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
          <Typography color="text.secondary">
            เลือกประเภทการลาและระบุรายละเอียดเพื่อให้ผู้จัดการพิจารณา
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 2,
            }}
          >
            {(['ลาป่วย', 'ลากิจ', 'ลาอื่นๆ'] as LeaveType[]).map((type) => (
              <Button
                key={type}
                variant={leaveType === type ? 'contained' : 'outlined'}
                onClick={() => setLeaveType(type)}
                sx={{
                  minHeight: 78,
                  display: 'grid',
                  alignContent: 'center',
                  gap: 0.5,
                  minWidth: 0,
                  fontSize: { xs: 12, sm: 14 },
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
            ))}
          </Box>
          <TextField
            label="วันที่ลา"
            type="date"
            inputRef={leaveDateInputRef}
            onClick={openLeaveDatePicker}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                endAdornment: (
                  <InputAdornment position="end" sx={{ pointerEvents: 'none' }}>
                    <CalendarDaysIcon ref={calendarIconRef} size={22} />
                  </InputAdornment>
                ),
              },
            }}
            value={leaveDate}
            onChange={(event) => setLeaveDate(event.target.value)}
            fullWidth
            sx={{
              '& input::-webkit-calendar-picker-indicator': {
                display: 'none',
              },
            }}
          />
          <TextField
            label="เหตุผลการลา"
            multiline
            minRows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            fullWidth
            sx={{
              flex: { xs: 1, md: 'initial' },
              minHeight: 0,
              '& .MuiInputBase-root': {
                height: { xs: '100%', md: 'auto' },
                alignItems: 'flex-start',
              },
            }}
          />
          <Button
            variant="contained"
            disabled={!reason.trim()}
            onClick={() =>
              void onSuccess({
                leaveDate,
                leaveType: leaveTypeApi[leaveType],
                reason: reason.trim(),
              })
            }
            endIcon={<SendIcon size={24} />}
            sx={{
              width: '100%',
              height: 64,
              minHeight: 64,
              justifyContent: 'center',
              fontSize: '18px !important',
              fontWeight: '500 !important',
              '& .MuiButton-endIcon': { ml: 1.25 },
              '&.Mui-disabled': { bgcolor: '#e6e2df', color: '#a6a09d' },
            }}
          >
            ส่งคำขอลา
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
