import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DashboardMain, PageIntro } from '@stackbuild/ui';
import { ActionSnackbar, type ActionNotice } from '@stackbuild/management';
import {
  getFranchiseAccountSettings,
  updateFranchiseAccountPassword,
} from '../../api/account';

const detailLabelSx = {
  color: '#8a7060',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 12,
  fontWeight: 600,
} as const;

const detailValueSx = {
  color: '#342821',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 15,
} as const;

export function FranchiseSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState<ActionNotice | null>(null);
  const settings = useQuery({
    queryKey: ['franchise-account-settings'],
    queryFn: getFranchiseAccountSettings,
  });
  const changePassword = useMutation({
    mutationFn: updateFranchiseAccountPassword,
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice({ message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
    },
    onError: (error) => {
      setNotice({
        message:
          error instanceof Error
            ? error.message
            : 'ไม่สามารถเปลี่ยนรหัสผ่านได้',
        severity: 'error',
      });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (changePassword.isPending) return;
    if (!currentPassword || newPassword.length < 8) {
      setNotice({
        message: !currentPassword
          ? 'กรุณาระบุรหัสผ่านปัจจุบัน'
          : 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร',
        severity: 'error',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice({ message: 'ยืนยันรหัสผ่านใหม่ไม่ตรงกัน', severity: 'error' });
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };
  const data = settings.data;

  return (
    <DashboardMain>
      <PageIntro
        title="ตั้งค่าระบบ"
        description="ตรวจสอบข้อมูลบัญชีแฟรนไชส์และเปลี่ยนรหัสผ่านสำหรับเข้าสู่ระบบ"
      />
      {settings.isError ? (
        <Alert severity="error" sx={{ mb: 2, fontFamily: 'Kanit, sans-serif' }}>
          ไม่สามารถโหลดข้อมูลการตั้งค่าระบบได้ กรุณาลองใหม่อีกครั้ง
        </Alert>
      ) : null}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(0, 1.2fr) minmax(330px, 0.8fr)',
          },
          gap: 2,
          maxWidth: 1120,
        }}
      >
        <Card
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: '18px',
            borderColor: '#e8ddd5',
            boxShadow: 'none',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Kanit, sans-serif',
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            ข้อมูลบัญชีและสาขา
          </Typography>
          <Typography
            sx={{
              mt: 0.35,
              color: 'text.secondary',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 13,
            }}
          >
            ข้อมูลส่วนนี้ดูได้อย่างเดียว หากต้องการแก้ไข โปรดติดต่อผู้ดูแลระบบ
          </Typography>
          <Divider sx={{ my: 2.25, borderColor: '#eee6e0' }} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            {[
              ['ชื่อบัญชี', data?.accountName],
              ['Username', data?.username],
              ['อีเมล', data?.email],
              ['ชื่อแฟรนไชส์', data?.franchiseName],
              ['สาขา', data?.branchName],
              ['รหัสสาขา', data?.branchCode],
              ['แพ็กเกจ', data ? `แพ็กเกจ ${data.plan}` : undefined],
            ].map(([label, value]) => (
              <Box key={label}>
                <Typography sx={detailLabelSx}>{label}</Typography>
                <Typography sx={{ ...detailValueSx, mt: 0.4 }}>
                  {settings.isLoading ? 'กำลังโหลด…' : value || '—'}
                </Typography>
              </Box>
            ))}
          </Box>
        </Card>
        <Card
          variant="outlined"
          component="form"
          onSubmit={submit}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: '18px',
            borderColor: '#e8ddd5',
            boxShadow: 'none',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Kanit, sans-serif',
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            เปลี่ยนรหัสผ่าน
          </Typography>
          <Typography
            sx={{
              mt: 0.35,
              color: 'text.secondary',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 13,
            }}
          >
            ยืนยันรหัสผ่านปัจจุบันก่อนตั้งรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร
          </Typography>
          <Stack sx={{ mt: 2.25, gap: 1.5 }}>
            <TextField
              required
              label="รหัสผ่านปัจจุบัน"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <TextField
              required
              label="รหัสผ่านใหม่"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <TextField
              required
              label="ยืนยันรหัสผ่านใหม่"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={
                changePassword.isPending ||
                newPassword.length < 8 ||
                newPassword !== confirmPassword
              }
              sx={{
                alignSelf: 'flex-end',
                minHeight: 40,
                borderRadius: '12px',
                bgcolor: '#201914',
                fontFamily: 'Kanit, sans-serif',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
              }}
            >
              {changePassword.isPending
                ? 'กำลังบันทึก...'
                : 'บันทึกรหัสผ่านใหม่'}
            </Button>
          </Stack>
        </Card>
      </Box>
      <ActionSnackbar notice={notice} onClose={() => setNotice(null)} />
    </DashboardMain>
  );
}
