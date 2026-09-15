import type { SnackbarOrigin } from '@mui/material';

export const tabletOrSmallerMediaQuery = '(max-width:899.95px)';

export const snackbarBelowTopbarSx = {
  top: 'calc(72px + env(safe-area-inset-top) + 12px)',
} as const;

export const snackbarBottomSx = { mb: 2 } as const;

export const snackbarAnchorOrigin = (
  isTabletOrSmaller: boolean,
): SnackbarOrigin => ({
  vertical: isTabletOrSmaller ? 'top' : 'bottom',
  horizontal: 'center',
});
