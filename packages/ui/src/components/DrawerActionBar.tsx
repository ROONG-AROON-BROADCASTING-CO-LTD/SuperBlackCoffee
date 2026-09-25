import { Box, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

export type DrawerActionBarProps = {
  children: ReactNode;
  sx?: SxProps<Theme>;
};

/**
 * Shared action footer for bottom drawers. It is anchored to the drawer itself
 * so it remains at the lower-right edge without separating during transitions.
 */
export function DrawerActionBar({ children, sx }: DrawerActionBarProps) {
  return (
    <Box
      sx={[
        {
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 1.25,
          position: 'absolute',
          right: { xs: 20, sm: 32 },
          bottom: 0,
          zIndex: 1301,
          px: 1.5,
          py: 1.25,
          bgcolor: '#fffaf7',
          border: '1px solid #e8ddd5',
          borderRadius: '14px 14px 0 0',
          boxShadow: 'none',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
