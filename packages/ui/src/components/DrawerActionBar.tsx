import { Box, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

export type DrawerActionBarProps = {
  children: ReactNode;
  sx?: SxProps<Theme>;
};

/**
 * Shared action footer for bottom drawers. It stays in the document flow and
 * sticks to the lower edge while its scroll container is active, so it never
 * covers form controls that appear after it on smaller screens.
 */
export function DrawerActionBar({ children, sx }: DrawerActionBarProps) {
  return (
    <Box
      sx={[
        {
          display: 'flex',
          justifyContent: { xs: 'stretch', sm: 'flex-end' },
          alignItems: 'center',
          gap: 1.25,
          position: 'sticky',
          width: { xs: '100%', sm: 'fit-content' },
          maxWidth: '100%',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          gridColumn: 'auto',
          gridRow: 'auto',
          bottom: 0,
          mt: 1.5,
          alignSelf: { xs: 'stretch', sm: 'end' },
          zIndex: 1301,
          px: 1.5,
          py: 1.25,
          pb: { xs: 'calc(10px + env(safe-area-inset-bottom))', sm: 1.25 },
          bgcolor: '#fffaf7',
          border: '1px solid #e8ddd5',
          borderRadius: { xs: 0, sm: '14px 14px 0 0' },
          boxShadow: 'none',
          '& > button': { flex: { xs: '1 1 auto', sm: '0 0 auto' } },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
        // Keep the footer in its intended grid cell when rendered in a form.
        { gridColumn: 'auto', gridRow: 'auto' },
      ]}
    >
      {children}
    </Box>
  );
}
