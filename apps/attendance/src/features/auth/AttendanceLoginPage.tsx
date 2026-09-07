import { useState } from 'react';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import { LogInIcon, superBlackLogo } from '@stackbuild/ui';

type LoginStep = 'username' | 'pin' | 'setup-pin' | 'confirm-pin';

const isValidPIN = (value: string) => /^\d{6}$/.test(value);

export function AttendanceLoginPage({
  onUsername,
  onPIN,
  onSetupPIN,
  error,
  loading,
}: {
  onUsername: (name: string) => Promise<'pin' | 'setup-pin'>;
  onPIN: (name: string, pin: string) => Promise<void>;
  onSetupPIN: (name: string, pin: string) => Promise<void>;
  error?: string;
  loading?: boolean;
}) {
  const [username, setUsername] = useState(
    () => window.sessionStorage.getItem('sbc-attendance-username') ?? '',
  );
  const [pin, setPIN] = useState('');
  const [firstPIN, setFirstPIN] = useState('');
  const [step, setStep] = useState<LoginStep>(() =>
    window.sessionStorage.getItem('sbc-attendance-username')
      ? 'pin'
      : 'username',
  );
  const [validationError, setValidationError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setValidationError('');
    const name = username.trim();
    try {
      if (step === 'username' && name) {
        const nextStep = await onUsername(name);
        setStep(nextStep);
        return;
      }
      if (!isValidPIN(pin)) {
        setValidationError('PIN ต้องเป็นตัวเลข 6 หลัก');
        return;
      }
      if (step === 'pin') {
        await onPIN(name, pin);
        window.sessionStorage.setItem('sbc-attendance-username', name);
        return;
      }
      if (step === 'setup-pin') {
        setFirstPIN(pin);
        setPIN('');
        setStep('confirm-pin');
        return;
      }
      if (pin !== firstPIN) {
        setValidationError('PIN ทั้งสองครั้งไม่ตรงกัน');
        return;
      }
      await onSetupPIN(name, pin);
      window.sessionStorage.setItem('sbc-attendance-username', name);
    } catch {
      // Parent displays the API error in the shared error slot.
    }
  };

  const isUsernameStep = step === 'username';
  const isPINSetup = step === 'setup-pin' || step === 'confirm-pin';
  const heading = isUsernameStep
    ? 'เข้างานให้ตรงเวลา'
    : isPINSetup
      ? step === 'setup-pin'
        ? 'ตั้ง PIN ของคุณ'
        : 'ยืนยัน PIN อีกครั้ง'
      : 'กรอก PIN เพื่อเข้าใช้งาน';
  const description = isUsernameStep
    ? 'ใช้ชื่อผู้ใช้ของคุณเพื่อเช็กอิน เช็กเอาต์ และส่งคำขอลา'
    : isPINSetup
      ? 'ตั้งรหัส PIN ตัวเลข 6 หลักสำหรับใช้เข้า Attendance ในครั้งถัดไป'
      : `สวัสดี ${username.trim()} กรุณากรอก PIN 6 หลัก`;

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
          borderRadius: '15px',
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
        <Typography sx={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
          {heading}
        </Typography>
        <Typography color="text.secondary">{description}</Typography>
        {isUsernameStep ? (
          <TextField
            autoFocus
            fullWidth
            label="ชื่อผู้ใช้"
            placeholder="กรอกชื่อผู้ใช้"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            slotProps={{ htmlInput: { autoCapitalize: 'none' } }}
          />
        ) : (
          <TextField
            autoFocus
            fullWidth
            label="PIN 6 หลัก"
            type="password"
            value={pin}
            onChange={(event) =>
              setPIN(event.target.value.replace(/\D/g, '').slice(0, 6))
            }
            slotProps={{
              htmlInput: {
                inputMode: 'numeric',
                maxLength: 6,
                autoComplete: isPINSetup ? 'new-password' : 'current-password',
              },
            }}
          />
        )}
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={
            (isUsernameStep ? !username.trim() : !isValidPIN(pin)) || loading
          }
          startIcon={<LogInIcon size={20} />}
        >
          {loading
            ? 'กำลังดำเนินการ...'
            : isUsernameStep
              ? 'ดำเนินการต่อ'
              : step === 'setup-pin'
                ? 'ตั้ง PIN'
                : step === 'confirm-pin'
                  ? 'ยืนยันและเข้าใช้งาน'
                  : 'เข้าสู่ระบบ'}
        </Button>
        {!isUsernameStep ? (
          <Button
            variant="text"
            onClick={() => {
              setPIN('');
              setValidationError('');
              setStep('username');
            }}
          >
            เปลี่ยนชื่อผู้ใช้
          </Button>
        ) : null}
        {validationError || error ? (
          <Typography color="error">{validationError || error}</Typography>
        ) : null}
      </Paper>
    </Box>
  );
}
