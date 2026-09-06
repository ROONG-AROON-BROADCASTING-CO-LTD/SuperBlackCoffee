import { useState } from 'react';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import { LogInIcon, superBlackLogo } from '@stackbuild/ui';

export function AttendanceLoginPage({
  onLogin,
}: {
  onLogin: (name: string) => void;
}) {
  const [username, setUsername] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = username.trim();
    if (value) onLogin(value);
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        p: 3,
        background:
          'radial-gradient(circle at top right, #ead8c7, transparent 38%), #171411',
      }}
    >
      <Paper
        component="form"
        onSubmit={submit}
        sx={{
          width: 'min(100%, 430px)',
          p: { xs: 3, sm: 4.5 },
          display: 'grid',
          gap: 2.5,
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            component="img"
            src={superBlackLogo}
            alt="Super Black Coffee"
            sx={{ width: 44, height: 44, objectFit: 'contain' }}
          />
          <Typography sx={{ fontWeight: 700 }}>SUPER BLACK COFFEE</Typography>
        </Box>
        <Typography variant="h4">เข้างานให้ตรงเวลา</Typography>
        <Typography color="text.secondary">
          ใช้ชื่อผู้ใช้ของคุณเพื่อเช็กอิน เช็กเอาต์ และส่งคำขอลา
        </Typography>
        <TextField
          autoFocus
          fullWidth
          label="ชื่อผู้ใช้"
          placeholder="กรอกชื่อผู้ใช้"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          slotProps={{ htmlInput: { autoCapitalize: 'none' } }}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!username.trim()}
          startIcon={<LogInIcon size={20} />}
        >
          เข้าสู่ระบบ
        </Button>
      </Paper>
    </Box>
  );
}
