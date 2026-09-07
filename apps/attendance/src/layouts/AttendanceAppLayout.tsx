import type { ReactNode } from 'react';
import { useState } from 'react';
import { Box, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { DashboardSidebar } from '@stackbuild/ui';
import {
  MobileNavigation,
  attendanceNavigation,
} from '../components/AttendanceNavigation';
import type { StaffPage } from '../types/attendance';

type AttendanceAppLayoutProps = {
  username: string;
  branchName: string;
  page: StaffPage;
  title: string;
  onPage: (page: StaffPage) => void;
  onLogout: () => void;
  children: ReactNode;
};

export function AttendanceAppLayout({
  username,
  branchName,
  page,
  title,
  onPage,
  onLogout,
  children,
}: AttendanceAppLayoutProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeNavigationItem = attendanceNavigation.find(
    (item) => item.page === page,
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100dvh',
        bgcolor: '#fbfaf8',
      }}
    >
      {isDesktop ? (
        <DashboardSidebar
          activePage={
            activeNavigationItem?.label ?? attendanceNavigation[0].label
          }
          navigation={attendanceNavigation.map(({ label, icon, group }) => ({
            label,
            icon,
            group,
          }))}
          onNavigate={(label) => {
            const item = attendanceNavigation.find(
              (navigationItem) => navigationItem.label === label,
            );
            if (item) onPage(item.page);
          }}
          onLogout={onLogout}
          selectedColor="#3c2d24"
          activeBackground="#fbfaf8"
          accentColor="#bf9576"
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((value) => !value)}
        />
      ) : null}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: '100dvh',
          pb: { xs: 9.5, md: 0 },
        }}
      >
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: { xs: 0, md: sidebarCollapsed ? 96 : 230 },
            right: 0,
            zIndex: 1100,
            height: { xs: 64, md: 72 },
            px: { xs: 2.5, md: 5 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'rgba(255,255,255,.94)',
            borderBottom: '1px solid #e8ddd5',
            backdropFilter: 'blur(12px)',
            transition: 'left .28s cubic-bezier(.2,.8,.2,1)',
          }}
        >
          <Typography sx={{ fontSize: { xs: 18, md: 22 }, fontWeight: 700 }}>
            {title}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                display: 'grid',
                placeItems: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: '#ede2d8',
                color: '#805637',
                fontWeight: 700,
              }}
            >
              {username.slice(0, 1).toUpperCase()}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600 }}>{username}</Typography>
              <Typography variant="caption" color="text.secondary">
                พนักงานสาขา{branchName}
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Box
          sx={{
            maxWidth: 1260,
            mt: { xs: '64px', md: '72px' },
            p: { xs: '20px 16px 28px', md: '32px 40px 48px' },
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
      <MobileNavigation page={page} onPage={onPage} />
    </Box>
  );
}
