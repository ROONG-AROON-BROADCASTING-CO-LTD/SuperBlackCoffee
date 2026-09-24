import { type ReactNode, useEffect, useState } from 'react';
import { Alert, type AlertColor, Snackbar, useMediaQuery } from '@mui/material';
import { BadgeAlertIcon } from './icons/BadgeAlertIcon';
import { CircleCheckIcon } from './icons/CircleCheckIcon';
import {
  snackbarAnchorOrigin,
  snackbarBelowTopbarSx,
  snackbarBottomSx,
  tabletOrSmallerMediaQuery,
} from './responsiveSnackbar';

export type ActionNotice = {
  message: string;
  severity?: AlertColor;
};

export function ActionSnackbar({
  notice,
  onClose,
  topOnTablet = true,
  autoHideDuration = 3_500,
  action,
  icon,
  content,
  desktopSx,
  alertSx,
}: {
  notice: ActionNotice | null;
  onClose: () => void;
  topOnTablet?: boolean;
  autoHideDuration?: number | null;
  action?: ReactNode;
  icon?: ReactNode;
  content?: ReactNode;
  desktopSx?: Record<string, string | number | undefined>;
  alertSx?: Record<string, unknown>;
}) {
  const [displayedNotice, setDisplayedNotice] = useState<ActionNotice | null>(
    notice,
  );

  useEffect(() => {
    if (notice) setDisplayedNotice(notice);
  }, [notice]);

  const activeNotice = displayedNotice ?? notice;
  const severity = activeNotice?.severity ?? 'success';
  const isSuccess = severity === 'success';
  // Keep the notice state alive until the exit transition completes so the
  // icon continues its looping animation while the Snackbar closes.
  const shouldAnimateIcon = activeNotice !== null;
  const isTabletOrSmaller = useMediaQuery(tabletOrSmallerMediaQuery);
  const showBelowTopbar = topOnTablet && isTabletOrSmaller;

  return (
    <Snackbar
      open={notice !== null}
      autoHideDuration={autoHideDuration}
      anchorOrigin={snackbarAnchorOrigin(showBelowTopbar)}
      onClose={onClose}
      sx={
        showBelowTopbar
          ? snackbarBelowTopbarSx
          : { ...snackbarBottomSx, ...desktopSx }
      }
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
        severity={severity}
        icon={
          icon ??
          (isSuccess ? (
            <CircleCheckIcon animate={shouldAnimateIcon} />
          ) : (
            <BadgeAlertIcon animate={shouldAnimateIcon} />
          ))
        }
        action={action}
        sx={{
          fontFamily: 'Kanit, sans-serif',
          fontWeight: 500,
          fontSize: '14px',
          ...alertSx,
        }}
      >
        {content ?? activeNotice?.message}
      </Alert>
    </Snackbar>
  );
}
