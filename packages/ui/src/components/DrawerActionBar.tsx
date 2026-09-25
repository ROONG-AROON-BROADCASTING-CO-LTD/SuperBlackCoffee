import { Box, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

export type DrawerActionBarProps = {
  children: ReactNode;
  sx?: SxProps<Theme>;
};

/**
 * Shared action footer for bottom drawers. It keeps primary actions visible
 * at the lower-right edge while long drawer content is being scrolled.
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
          mt: 1,
          pt: 1.5,
          pb: 0.5,
          position: 'sticky',
          bottom: 0,
          zIndex: 2,
          bgcolor: '#fffaf7',
          borderTop: '1px solid #e8ddd5',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
