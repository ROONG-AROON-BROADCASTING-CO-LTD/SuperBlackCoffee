import { useEffect, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { BadgeAlertIcon } from '@stackbuild/ui';

export type ActionNotice = {
  message: string;
  severity?: 'success' | 'error';
};

export function ActionSnackbar({
  notice,
  onClose,
}: {
  notice: ActionNotice | null;
  onClose: () => void;
}) {
  const [displayedNotice, setDisplayedNotice] = useState<ActionNotice | null>(
    notice,
  );

  useEffect(() => {
    if (notice) setDisplayedNotice(notice);
  }, [notice]);

  const activeNotice = displayedNotice ?? notice;

  return (
    <Snackbar
      key={activeNotice?.message ?? 'action-notice'}
      open={notice !== null}
      autoHideDuration={3_500}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      onClose={onClose}
      sx={{ mb: 2 }}
      slotProps={{
        transition: {
          onExited: () => {
            if (notice === null) setDisplayedNotice(null);
          },
        },
      }}
    >
      <Alert
        variant="filled"
        severity={activeNotice?.severity ?? 'success'}
        icon={
          activeNotice?.severity === 'error' ? (
            <BadgeAlertIcon animate={notice !== null} />
          ) : undefined
        }
        sx={{
          fontFamily: 'Kanit, sans-serif',
          fontWeight: 500,
          '@keyframes sbc-success-notice-icon': {
            '0%': { opacity: 0, transform: 'scale(0.6)' },
            '65%': { opacity: 1, transform: 'scale(1.18)' },
            '100%': { opacity: 1, transform: 'scale(1)' },
          },
          ...(activeNotice?.severity !== 'error'
            ? {
                '& .MuiAlert-icon': {
                  animation: 'sbc-success-notice-icon 420ms ease-out',
                },
              }
            : {}),
        }}
      >
        {activeNotice?.message}
      </Alert>
    </Snackbar>
  );
}
