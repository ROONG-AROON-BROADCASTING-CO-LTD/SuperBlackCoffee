import type { FormEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import superBlackLogo from '../../assets/superblack-logo.png';
import { LoaderCircleIcon } from '../icons/LoaderCircleIcon';
import { LogInIcon, type LogInIconHandle } from '../icons/LogInIcon';

export function LoginScreen({
  headline,
  description,
  submitLabel,
  onSubmit,
}: {
  eyebrow?: string;
  headline: ReactNode;
  description: string;
  submitLabel: string;
  onSubmit: (username: string, password: string) => void | Promise<void>;
}) {
  const iconRef = useRef<LogInIconHandle>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setIsSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 550));
    try {
      await onSubmit(
        String(data.get('username') ?? ''),
        String(data.get('password') ?? ''),
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        bgcolor: 'primary.main',
      }}
    >
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: '#fff',
          p: { xs: 4, md: '8vw' },
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Box
          component="img"
          src={superBlackLogo}
          alt="Super Black logo"
          sx={{
            width: 'min(42vw, 260px)',
            maxHeight: 260,
            objectFit: 'contain',
            mb: 3,
          }}
        />
        <Typography
          variant="h2"
          sx={{
            mt: 1,
            fontFamily: '"SBC Sans", Arial, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(2.5rem, 4.2vw, 4.4rem)',
            lineHeight: 1.08,
          }}
        >
          {headline}
        </Typography>
        <Typography sx={{ color: '#b7ada5', mt: 2 }}>{description}</Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 6 },
          m: '60px 60px 60px 0',
          borderRadius: '28px',
          bgcolor: '#fff',
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          autoComplete="off"
          sx={{ width: '100%', maxWidth: 380 }}
        >
          <Typography
            variant="h3"
            sx={{ textAlign: 'center', fontSize: { xs: '2rem', md: '2.4rem' } }}
          >
            เข้าสู่ระบบ
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ textAlign: 'center', mt: 1, mb: 4 }}
          >
            เข้าสู่ระบบเพื่อไปยังแดชบอร์ดของคุณ
          </Typography>
          <Stack spacing={2}>
            <TextField
              name="username"
              label="ชื่อผู้ใช้งาน"
              type="text"
              autoComplete="off"
              fullWidth
              required
            />
            <TextField
              name="password"
              label="รหัสผ่าน"
              type="password"
              autoComplete="off"
              fullWidth
              required
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isSubmitting}
              onMouseEnter={() => iconRef.current?.startAnimation()}
              onMouseLeave={() => iconRef.current?.stopAnimation()}
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
                {isSubmitting ? (
                  <LoaderCircleIcon size={20} style={{ display: 'flex' }} />
                ) : (
                  <LogInIcon
                    ref={iconRef}
                    size={20}
                    style={{ display: 'flex' }}
                  />
                )}
                <Box component="span">
                  {isSubmitting ? 'กำลังเข้าสู่ระบบ' : submitLabel}
                </Box>
              </Box>
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
