import type { ReactNode } from 'react';
import { useState } from 'react';
import { Box } from '@mui/material';
import { DashboardSidebar, DashboardTopbar } from '@stackbuild/ui';
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
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
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
      </Box>
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <DashboardTopbar
          title={title}
          initials={username.slice(0, 1).toUpperCase()}
          name={username}
          role={`พนักงานสาขา${branchName}`}
          sidebarWidth={0}
          disableSidebarTransition
        />
      </Box>
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <DashboardTopbar
          title={title}
          initials={username.slice(0, 1).toUpperCase()}
          name={username}
          role={`พนักงานสาขา${branchName}`}
          sidebarWidth={sidebarCollapsed ? 96 : 230}
        />
      </Box>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: '100dvh',
          pb: {
            xs: 'calc(var(--attendance-mobile-nav-height, 82px) + env(safe-area-inset-bottom))',
            md: 0,
          },
        }}
      >
        <Box
          sx={{
            maxWidth: 1260,
            mt: '72px',
            p: { xs: '20px 16px 28px', md: '32px 40px 48px' },
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
      <MobileNavigation page={page} onPage={onPage} onLogout={onLogout} />
    </Box>
  );
}
