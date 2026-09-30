import {
  Box,
  Button,
  Divider,
  Drawer,
  type SxProps,
  type Theme,
  Typography,
  type DrawerProps,
} from '@mui/material';
import type { ReactNode } from 'react';
import { XIcon } from '../icons/XIcon';

type DashboardFormDrawerProps = {
  open: boolean;
  onClose: DrawerProps['onClose'];
  children: ReactNode;
  paperSx?: SxProps<Theme>;
  transitionDuration?: DrawerProps['transitionDuration'];
  modalProps?: DrawerProps['ModalProps'];
  onTransitionExited?: () => void;
  zIndex?: number;
};

/** The shared bottom-sheet shell used by dashboard create/edit forms. */
export function DashboardFormDrawer({
  open,
  onClose,
  children,
  paperSx,
  transitionDuration = { enter: 360, exit: 280 },
  modalProps,
  onTransitionExited,
  zIndex = 1300,
}: DashboardFormDrawerProps) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      transitionDuration={transitionDuration}
      ModalProps={modalProps}
      sx={{ zIndex }}
      slotProps={{
        transition: { onExited: onTransitionExited },
        paper: {
          sx: [
            {
              left: { xs: 0, md: '254px' },
              width: { xs: '100%', md: 'calc(100% - 278px)' },
              height: { xs: '88dvh', sm: 'calc(100dvh - 72px)' },
              maxHeight: {
                xs: 'calc(100dvh - env(safe-area-inset-top))',
                md: 'none',
              },
              overflow: 'hidden',
              borderRadius: '16px 16px 0 0',
              bgcolor: '#fffaf7',
              '& form': {
                pb: { xs: 'calc(96px + env(safe-area-inset-bottom))', sm: 12 },
              },
            },
            ...(Array.isArray(paperSx) ? paperSx : paperSx ? [paperSx] : []),
          ],
        },
      }}
    >
      {children}
    </Drawer>
  );
}

export function DashboardDrawerHandle({ sx }: { sx?: SxProps<Theme> } = {}) {
  return (
    <Box
      aria-hidden="true"
      sx={[
        {
          width: 44,
          height: 5,
          mx: 'auto',
          mb: 2.5,
          flexShrink: 0,
          borderRadius: 99,
          bgcolor: '#d8c8bd',
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
}

type DashboardDrawerHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  closeDisabled?: boolean;
  closeIcon?: ReactNode;
  onCloseMouseEnter?: () => void;
  onCloseMouseLeave?: () => void;
};

export function DashboardDrawerHeader({
  title,
  description,
  onClose,
  closeLabel = 'ปิด',
  closeDisabled = false,
  closeIcon,
  onCloseMouseEnter,
  onCloseMouseLeave,
}: DashboardDrawerHeaderProps) {
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h2"
            sx={{
              color: '#201914',
              fontFamily: 'Kanit, sans-serif',
              fontSize: { xs: 18, sm: 20, md: 22 },
              fontWeight: 600,
              overflowWrap: 'anywhere',
            }}
          >
            {title}
          </Typography>
          {description ? (
            <Typography
              sx={{
                mt: 0.25,
                color: 'text.secondary',
                fontFamily: 'Kanit, sans-serif',
                fontSize: { xs: 12, sm: 13, md: 14 },
                overflowWrap: 'anywhere',
              }}
            >
              {description}
            </Typography>
          ) : null}
        </Box>
        <Button
          type="button"
          aria-label={closeLabel}
          disabled={closeDisabled}
          onClick={onClose}
          onMouseEnter={onCloseMouseEnter}
          onMouseLeave={onCloseMouseLeave}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: '0 0 40px',
            minWidth: 40,
            width: 40,
            height: 40,
            p: 0,
            borderRadius: '12px',
            bgcolor: '#f7eee8',
            color: '#5f4b3d',
            '&:hover': { bgcolor: '#f1e4da' },
          }}
        >
          {closeIcon ?? <XIcon size={20} />}
        </Button>
      </Box>
      <Divider
        sx={{
          mt: 2.25,
          mx: { xs: -2.5, sm: -4 },
          borderColor: '#e8ddd5',
          flexShrink: 0,
        }}
      />
    </>
  );
}
