import { useEffect, useState } from 'react';
import { Alert, Box, Snackbar } from '@mui/material';
import { BadgeAlertIcon } from '@stackbuild/ui';

const retrySeconds = 10;

export function AutoRetrySnackbar({ open }: { open: boolean }) {
  const [secondsRemaining, setSecondsRemaining] = useState(retrySeconds);

  useEffect(() => {
    if (!open) return;
    setSecondsRemaining(retrySeconds);
    const interval = window.setInterval(() => {
      setSecondsRemaining((seconds) =>
        seconds <= 1 ? retrySeconds : seconds - 1,
      );
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [open]);

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ mb: 2 }}
    >
      <Alert
        severity="error"
        variant="filled"
        icon={<BadgeAlertIcon animate={open} />}
        sx={{ fontFamily: 'Kanit, sans-serif' }}
      >
        เชื่อมต่อระบบไม่ได้ จะลองใหม่ใน{' '}
        <Box
          component="span"
          sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}
        >
          {secondsRemaining}
        </Box>{' '}
        วินาที
      </Alert>
    </Snackbar>
  );
}
