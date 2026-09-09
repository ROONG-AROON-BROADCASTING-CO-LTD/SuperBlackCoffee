import type { ReactNode } from 'react';
import { useState } from 'react';
import { Box } from '@mui/material';
import { DashboardSidebar, DashboardTopbar } from '@stackbuild/ui';

type NavigationItem = {
  label: string;
  icon: ReactNode;
  badge?: number;
  group?: string;
};

export function AdminDashboardLayout({
  activePage,
  navigation,
  onNavigate,
  onLogout,
  children,
  pageTitle,
  forceSidebarCollapsed = false,
  secondarySidebar,
  secondarySidebarVisible = false,
}: {
  activePage: string;
  navigation: NavigationItem[];
  onNavigate: (page: string) => void;
  onLogout: () => void;
  children: ReactNode;
  pageTitle?: string;
  forceSidebarCollapsed?: boolean;
  secondarySidebar?: ReactNode;
  secondarySidebarVisible?: boolean;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Match Franchise's sidebar state flow: route-driven compact pages and a
  // user-triggered collapse both feed the same shared sidebar transition.
  const primarySidebarCollapsed = forceSidebarCollapsed || sidebarCollapsed;
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <DashboardSidebar
        activePage={activePage}
        navigation={navigation}
        onNavigate={onNavigate}
        onLogout={onLogout}
        selectedColor="#3c2d24"
        activeBackground="#fbfaf8"
        accentColor="#bf9576"
        collapsed={primarySidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        hideToggle={forceSidebarCollapsed}
        attachedPanel={secondarySidebar}
      />
      <Box
        sx={{
          width: secondarySidebarVisible ? 160 : 0,
          flexShrink: 0,
        }}
      />
      <DashboardTopbar
        title={pageTitle ?? activePage}
        initials="AP"
        name="Arthit P."
        role="Store manager"
        sidebarWidth={primarySidebarCollapsed ? 96 : 230}
      />
      {children}
    </Box>
  );
}
