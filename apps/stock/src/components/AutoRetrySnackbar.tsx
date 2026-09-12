import { useEffect, useState } from 'react';
import { Alert, Box, Snackbar, useMediaQuery } from '@mui/material';
import { BadgeAlertIcon } from '@stackbuild/ui';

const retrySeconds = 10;

export function AutoRetrySnackbar({ open }: { open: boolean }) {
  const [secondsRemaining, setSecondsRemaining] = useState(retrySeconds);
  const isTabletOrSmaller = useMediaQuery('(max-width:899.95px)');

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
      anchorOrigin={{
        vertical: isTabletOrSmaller ? 'top' : 'bottom',
        horizontal: 'center',
      }}
      sx={
        isTabletOrSmaller
          ? { top: 'calc(72px + env(safe-area-inset-top) + 12px)' }
          : { mb: 2 }
      }
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
