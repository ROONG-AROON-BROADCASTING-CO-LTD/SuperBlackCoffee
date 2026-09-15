import { useEffect, useState } from 'react';
import { Alert, Box, Snackbar, useMediaQuery } from '@mui/material';
import { BadgeAlertIcon } from './icons/BadgeAlertIcon';
import {
  snackbarAnchorOrigin,
  snackbarBelowTopbarSx,
  snackbarBottomSx,
  tabletOrSmallerMediaQuery,
} from './responsiveSnackbar';

const retrySeconds = 10;

/** The shared offline/retrying notice used as the visual Snackbar baseline. */
export function ConnectionRetrySnackbar({ open }: { open: boolean }) {
  const [secondsRemaining, setSecondsRemaining] = useState(retrySeconds);
  const isTabletOrSmaller = useMediaQuery(tabletOrSmallerMediaQuery);

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
      anchorOrigin={snackbarAnchorOrigin(isTabletOrSmaller)}
      sx={isTabletOrSmaller ? snackbarBelowTopbarSx : snackbarBottomSx}
    >
      <Alert
        severity="error"
        variant="filled"
        icon={<BadgeAlertIcon animate={open} />}
        sx={{ fontFamily: 'Kanit, sans-serif', fontWeight: 500 }}
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
