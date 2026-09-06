import { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AmbulanceIcon, PlusIcon, SendIcon, UsersIcon } from '@stackbuild/ui';
import type { LeaveType } from '../types/attendance';

export function AttendanceLeaveRequestPage({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [leaveType, setLeaveType] = useState<LeaveType>('ลาป่วย');
  const [reason, setReason] = useState('');

  return (
    <Stack spacing={2.5}>
      <Typography variant="h4">คำขอลา</Typography>
      <Paper
        variant="outlined"
        sx={{
          maxWidth: 700,
          p: { xs: 2.5, sm: 3.5 },
          borderColor: '#e2d3c7',
          borderRadius: 2.25,
          bgcolor: '#fffdfb',
        }}
      >
        <Stack spacing={2} sx={{ maxWidth: 580 }}>
          <Typography color="text.secondary">
            เลือกประเภทการลาและระบุรายละเอียดเพื่อให้ผู้จัดการพิจารณา
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: { xs: 0.75, sm: 1.25 },
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
            slotProps={{ inputLabel: { shrink: true } }}
            defaultValue="2026-09-07"
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
          <Button
            variant="contained"
            disabled={!reason.trim()}
            onClick={onSuccess}
            endIcon={<SendIcon size={20} />}
          >
            ส่งคำขอลา
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
