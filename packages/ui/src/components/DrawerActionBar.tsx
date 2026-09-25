import { Box, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

export type DrawerActionBarProps = {
  children: ReactNode;
  sx?: SxProps<Theme>;
};

/**
 * Shared action footer for bottom drawers. It remains fixed at the lower-right
 * edge while long drawer content is being scrolled.
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
          position: 'fixed',
          right: { xs: 20, sm: 32 },
          bottom: 0,
          zIndex: 1301,
          px: 1.5,
          py: 1.25,
          bgcolor: '#fffaf7',
          border: '1px solid #e8ddd5',
          borderRadius: '14px 14px 0 0',
          boxShadow: '0 -8px 24px rgba(67, 45, 33, .10)',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
