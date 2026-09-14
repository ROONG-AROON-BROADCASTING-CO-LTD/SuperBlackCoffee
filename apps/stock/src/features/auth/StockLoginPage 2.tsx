import { useState } from 'react';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import { superBlackLogo } from '@stackbuild/ui';

export function StockLoginPage({
  onLogin,
  error,
  loading,
}: {
  onLogin: (username: string, pin: string) => Promise<void>;
  error: string;
  loading: boolean;
}) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        p: 3,
        bgcolor: '#171411',
      }}
    >
      <Paper
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          void onLogin(username.trim(), pin);
        }}
        sx={{
          width: 'min(100%, 430px)',
          p: { xs: 3, sm: 4 },
          borderRadius: 4,
          display: 'grid',
          gap: 2.25,
        }}
      >
        <Box
          component="img"
          src={superBlackLogo}
          alt="Super Black Coffee"
          sx={{ width: 64, height: 64, mx: 'auto' }}
        />
        <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center' }}>
          ตรวจนับและตัดสต๊อก
        </Typography>
        <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
          บันทึกจำนวนคงเหลือจริงของสาขา
          <br />
          ก่อนปิดกะหรือเมื่อมีการใช้งาน
        </Typography>
        <TextField
          required
          autoFocus
          label="ชื่อผู้ใช้"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <TextField
          required
          label="PIN 6 หลัก"
          type="password"
          value={pin}
          onChange={(event) =>
            setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
          }
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
        />
        {error && (
          <Typography color="error" sx={{ fontSize: 14 }}>
            {error}
          </Typography>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={loading || pin.length !== 6 || !username.trim()}
          sx={{ py: 1.25, bgcolor: '#3c2d24' }}
        >
          เข้าสู่ระบบ
        </Button>
      </Paper>
    </Box>
  );
}
