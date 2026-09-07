import { useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import {
  DeleteIcon,
  type DeleteIconHandle,
  FingerprintIcon,
  LogInIcon,
  type LogInIconHandle,
  LoaderCircleIcon,
  superBlackLogo,
} from '@stackbuild/ui';

type LoginStep = 'username' | 'pin' | 'setup-pin' | 'confirm-pin';

const isValidPIN = (value: string) => /^\d{6}$/.test(value);
const pinKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function AttendanceLoginPage({
  onUsername,
  onPIN,
  onSetupPIN,
  onClearError,
  error,
  loading,
}: {
  onUsername: (name: string) => Promise<'pin' | 'setup-pin'>;
  onPIN: (name: string, pin: string) => Promise<void>;
  onSetupPIN: (name: string, pin: string) => Promise<void>;
  onClearError?: () => void;
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
  const [isPINSubmitting, setIsPINSubmitting] = useState(false);
  const [pinHasError, setPinHasError] = useState(false);
  const deleteIconRef = useRef<DeleteIconHandle>(null);
  const loginIconRef = useRef<LogInIconHandle>(null);

  useEffect(() => {
    if (error && step !== 'username') setPinHasError(true);
  }, [error, step]);

  const submitPIN = async (value: string) => {
    if (!isValidPIN(value) || isPINSubmitting) return;
    setValidationError('');
    setPinHasError(false);
    setIsPINSubmitting(true);
    const name = username.trim();
    try {
      if (step === 'pin') {
        await onPIN(name, value);
        window.sessionStorage.setItem('sbc-attendance-username', name);
        return;
      }
      if (step === 'setup-pin') {
        setFirstPIN(value);
        setPIN('');
        setStep('confirm-pin');
        return;
      }
      if (value !== firstPIN) {
        setValidationError('PIN ทั้งสองครั้งไม่ตรงกัน');
        setPinHasError(true);
        return;
      }
      await onSetupPIN(name, value);
      window.sessionStorage.setItem('sbc-attendance-username', name);
    } catch {
      // Parent displays the API error in the shared error slot.
    } finally {
      setIsPINSubmitting(false);
    }
  };

  const updatePIN = (value: string) => {
    const nextPIN = value.replace(/\D/g, '').slice(0, 6);
    setPIN(nextPIN);
    setValidationError('');
    setPinHasError(false);
    if (nextPIN.length === 6) void submitPIN(nextPIN);
  };

  const appendPIN = (digit: string) => {
    if (isPINSubmitting) return;
    updatePIN(`${pin}${digit}`);
  };

  const removeLastPINCharacter = () => {
    deleteIconRef.current?.startAnimation();
    window.setTimeout(() => deleteIconRef.current?.stopAnimation(), 260);
    setPIN((currentPIN) =>
      pinHasError && currentPIN.length === 6 ? '' : currentPIN.slice(0, -1),
    );
    setValidationError('');
    setPinHasError(false);
  };

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
        setPinHasError(true);
        return;
      }
      await submitPIN(pin);
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
    ? 'ใช้ชื่อผู้ใช้ของคุณเพื่อเช็กอิน เช็กเอาต์\nและส่งคำขอลา'
    : isPINSetup
      ? 'ตั้งรหัส PIN ตัวเลข 6 หลักสำหรับใช้เข้า Attendance ในครั้งถัดไป'
      : `สวัสดี ${username.trim()} กรุณากรอก PIN 6 หลัก`;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100dvh',
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        p: 3,
        overflow: 'hidden',
        overscrollBehavior: 'none',
        touchAction: 'pan-y',
        background: '#171411',
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
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box
            component="img"
            src={superBlackLogo}
            alt="Super Black Coffee"
            sx={{ width: 64, height: 64, objectFit: 'contain' }}
          />
        </Box>
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.2,
            textAlign: 'center',
          }}
        >
          {heading}
        </Typography>
        {(isUsernameStep || isPINSetup) && (
          <Typography
            color="text.secondary"
            sx={{ textAlign: 'center', whiteSpace: 'pre-line' }}
          >
            {description}
          </Typography>
        )}
        {isUsernameStep ? (
          <TextField
            autoFocus
            fullWidth
            label="ชื่อผู้ใช้"
            placeholder="กรอกชื่อผู้ใช้"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setValidationError('');
              onClearError?.();
            }}
            slotProps={{ htmlInput: { autoCapitalize: 'none' } }}
          />
        ) : (
          <Box
            role="group"
            aria-label="แป้นพิมพ์ PIN 6 หลัก"
            sx={{ position: 'relative', display: 'grid', gap: 3 }}
          >
            <TextField
              fullWidth
              label="PIN 6 หลัก"
              type="password"
              value={pin}
              onChange={(event) => updatePIN(event.target.value)}
              slotProps={{
                htmlInput: {
                  inputMode: 'numeric',
                  maxLength: 6,
                  autoComplete: isPINSetup
                    ? 'new-password'
                    : 'current-password',
                  'aria-label': 'PIN 6 หลัก',
                },
              }}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 1,
                height: 1,
                opacity: 0,
                overflow: 'hidden',
                clipPath: 'inset(50%)',
                pointerEvents: 'none',
              }}
            />
            <Box
              aria-live="polite"
              aria-invalid={pinHasError || undefined}
              aria-label={`กรอก PIN แล้ว ${pin.length} จาก 6 หลัก`}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 1,
                '@keyframes sbc-pin-shake': {
                  '0%, 100%': { transform: 'translateX(0)' },
                  '20%, 60%': { transform: 'translateX(-7px)' },
                  '40%, 80%': { transform: 'translateX(7px)' },
                },
                animation: pinHasError
                  ? 'sbc-pin-shake 380ms cubic-bezier(.36,.07,.19,.97)'
                  : 'none',
              }}
            >
              {Array.from({ length: 6 }, (_, index) => (
                <Box
                  key={index}
                  aria-hidden="true"
                  sx={{
                    aspectRatio: '1 / 1',
                    display: 'grid',
                    placeItems: 'center',
                    border: '1px solid',
                    borderColor: pinHasError
                      ? '#d92d2d'
                      : index < pin.length
                        ? 'primary.main'
                        : '#ddd5cf',
                    borderRadius: '12px',
                    bgcolor: pinHasError
                      ? '#fff1f0'
                      : index < pin.length
                        ? '#f5eee8'
                        : '#fffdfb',
                    color: pinHasError ? '#d92d2d' : 'text.primary',
                    fontSize: '24px !important',
                    fontWeight: '700 !important',
                    lineHeight: 1,
                  }}
                >
                  {index < pin.length ? (
                    <FingerprintIcon
                      animate={index === pin.length - 1}
                      size={22}
                    />
                  ) : null}
                </Box>
              ))}
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1,
              }}
            >
              {pinKeys.map((digit) => (
                <Button
                  key={digit}
                  type="button"
                  variant="outlined"
                  aria-label={`เลข ${digit}`}
                  onClick={() => appendPIN(digit)}
                  disabled={isPINSubmitting}
                  sx={{
                    minHeight: '56px !important',
                    py: '12px !important',
                    fontSize: '24px !important',
                    fontWeight: '700 !important',
                  }}
                >
                  {digit}
                </Button>
              ))}
              <Box />
              <Button
                type="button"
                variant="outlined"
                aria-label="เลข 0"
                onClick={() => appendPIN('0')}
                disabled={isPINSubmitting}
                sx={{
                  minHeight: '56px !important',
                  py: '12px !important',
                  fontSize: '24px !important',
                  fontWeight: '700 !important',
                }}
              >
                0
              </Button>
              <Button
                type="button"
                variant="text"
                aria-label={
                  pinHasError && pin.length === 6
                    ? 'ล้าง PIN ทั้งหมด'
                    : 'ลบตัวเลข'
                }
                onClick={removeLastPINCharacter}
                disabled={!pin}
                sx={{
                  minHeight: '56px !important',
                  py: '12px !important',
                  fontSize: 24,
                  fontWeight: 600,
                  color: pin ? 'error.main' : 'action.disabled',
                  '&:hover': { color: 'error.dark' },
                }}
              >
                <DeleteIcon ref={deleteIconRef} size={22} />
              </Button>
            </Box>
          </Box>
        )}
        {isUsernameStep ? (
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={!username.trim() || loading}
            onMouseEnter={() => loginIconRef.current?.startAnimation()}
            onMouseLeave={() => loginIconRef.current?.stopAnimation()}
            sx={{
              width: '100%',
              height: 56,
              minHeight: 56,
              justifyContent: 'center',
            }}
          >
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                lineHeight: 1,
              }}
            >
              {loading ? (
                <LoaderCircleIcon size={20} style={{ display: 'flex' }} />
              ) : (
                <LogInIcon
                  ref={loginIconRef}
                  size={20}
                  style={{ display: 'flex' }}
                />
              )}
              <Box component="span">
                {loading ? 'กำลังดำเนินการ...' : 'ดำเนินการต่อ'}
              </Box>
            </Box>
          </Button>
        ) : null}
        {!isUsernameStep ? (
          <Button
            variant="outlined"
            onClick={() => {
              setPIN('');
              setValidationError('');
              setPinHasError(false);
              onClearError?.();
              setStep('username');
            }}
            sx={{
              width: '100%',
              mt: 0.5,
              height: 56,
              minHeight: '56px !important',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            เปลี่ยนชื่อผู้ใช้
          </Button>
        ) : null}
        {isUsernameStep && (validationError || error) ? (
          <Typography color="error">{validationError || error}</Typography>
        ) : null}
      </Paper>
    </Box>
  );
}
