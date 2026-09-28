import type { ReactNode } from 'react';
import { useEffect } from 'react';
import {
  Box,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Typography,
  useMediaQuery,
} from '@mui/material';

type NavigationItem = {
  id?: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  group?: string;
};

export function DashboardMobileMenu({
  open,
  onClose,
  activePage,
  navigation,
  onNavigate,
  onLogout,
  branchSelector,
}: {
  open: boolean;
  onClose: () => void;
  activePage: string;
  navigation: NavigationItem[];
  onNavigate: (page: string) => void;
  onLogout: () => void;
  branchSelector?: {
    value: string;
    options: readonly string[];
    allBranchLabel?: string;
    onChange: (branch: string) => void;
  };
}) {
  const desktop = useMediaQuery('(min-width:900px)');
  useEffect(() => {
    if (desktop && open) onClose();
  }, [desktop, open, onClose]);
  let previousGroup: string | undefined;

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        display: { xs: 'block', md: 'none' },
        '& .MuiDrawer-paper': {
          width: 'min(320px, 88vw)',
          maxWidth: '100%',
          maxHeight: '100dvh',
          bgcolor: '#171310',
          color: '#fff',
          boxSizing: 'border-box',
          display: 'flex',
        },
      }}
    >
      <Box sx={{ p: 2.5, borderBottom: '1px solid #3c3029' }}>
        <Typography sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
          SUPER BLACK COFFEE
        </Typography>
      </Box>
      {branchSelector && (
        <Box sx={{ px: 2, pt: 2 }}>
          <Typography sx={{ color: '#b7aaa0', fontSize: 12, mb: 0.75 }}>
            เลือกสาขา
          </Typography>
          <Select
            fullWidth
            size="small"
            aria-label="เลือกสาขา"
            value={branchSelector.value}
            onChange={(event) => {
              branchSelector.onChange(event.target.value);
              onClose();
            }}
            sx={{ bgcolor: '#fff', borderRadius: 2 }}
          >
            {branchSelector.options.map((branch) => (
              <MenuItem key={branch} value={branch}>
                {branch === 'ทุกสาขา'
                  ? (branchSelector.allBranchLabel ?? branch)
                  : branch}
              </MenuItem>
            ))}
          </Select>
        </Box>
      )}
      <List sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1 }}>
        {navigation.map((item) => {
          const showGroup = item.group !== previousGroup;
          previousGroup = item.group;
          const selected = (item.id ?? item.label) === activePage;
          return (
            <Box key={item.id ?? item.label}>
              {showGroup && item.group && (
                <Typography
                  sx={{
                    px: 1.5,
                    pt: 2,
                    pb: 0.5,
                    color: '#b7aaa0',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {item.group}
                </Typography>
              )}
              <ListItemButton
                selected={selected}
                onClick={() => {
                  onNavigate(item.id ?? item.label);
                  onClose();
                }}
                sx={{
                  borderRadius: 2,
                  minHeight: 44,
                  color: selected ? '#3c2d24' : '#eee8e3',
                  '&.Mui-selected, &.Mui-selected:hover': {
                    bgcolor: '#fbfaf8',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { sx: { fontSize: 14 } } }}
                />
                {!!item.badge && (
                  <Typography sx={{ fontSize: 12 }}>{item.badge}</Typography>
                )}
              </ListItemButton>
            </Box>
          );
        })}
      </List>
      <Box
        sx={{
          p: 2,
          pb: 'calc(16px + env(safe-area-inset-bottom))',
          borderTop: '1px solid #3c3029',
        }}
      >
        <Button
          fullWidth
          variant="contained"
          color="error"
          onClick={() => {
            onClose();
            onLogout();
          }}
        >
          ออกจากระบบ
        </Button>
      </Box>
    </Drawer>
  );
}
