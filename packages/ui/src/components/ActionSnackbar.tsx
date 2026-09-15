import { useEffect, useState } from 'react';
import { Alert, type AlertColor, Snackbar } from '@mui/material';
import { BadgeAlertIcon } from './icons/BadgeAlertIcon';
import { CircleCheckIcon } from './icons/CircleCheckIcon';

export type ActionNotice = {
  message: string;
  severity?: AlertColor;
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
  const isSuccess = (activeNotice?.severity ?? 'success') === 'success';

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
          isSuccess ? (
            <CircleCheckIcon animate={notice !== null} />
          ) : (
            <BadgeAlertIcon animate={notice !== null} />
          )
        }
        sx={{ fontFamily: 'Kanit, sans-serif', fontWeight: 500 }}
      >
        {activeNotice?.message}
      </Alert>
    </Snackbar>
  );
}
