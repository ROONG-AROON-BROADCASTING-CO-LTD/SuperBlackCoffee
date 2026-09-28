import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import {
  DashboardMobileMenu,
  DashboardSidebar,
  DashboardTopbar,
} from '@stackbuild/ui';

type NavigationItem = {
  id?: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  group?: string;
};

export function AdminDashboardLayout({
  activePage,
  activeNavigationKey = activePage,
  navigation,
  onNavigate,
  onLogout,
  children,
  pageTitle,
  forceSidebarCollapsed = false,
  secondarySidebar,
  secondarySidebarVisible = false,
  mobileBranchSelector,
}: {
  activePage: string;
  activeNavigationKey?: string;
  navigation: NavigationItem[];
  onNavigate: (page: string) => void;
  onLogout: () => void;
  children: ReactNode;
  pageTitle?: string;
  forceSidebarCollapsed?: boolean;
  secondarySidebar?: ReactNode;
  secondarySidebarVisible?: boolean;
  mobileBranchSelector?: {
    value: string;
    options: readonly string[];
    allBranchLabel?: string;
    onChange: (branch: string) => void;
  };
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [forceCollapsedManuallyExpanded, setForceCollapsedManuallyExpanded] =
    useState(false);
  useEffect(() => {
    // Each compact page starts with the compact rail, while retaining the
    // visible round toggle so the user can expand it again when needed.
    setForceCollapsedManuallyExpanded(false);
  }, [forceSidebarCollapsed, activePage]);
  const primarySidebarCollapsed = forceSidebarCollapsed
    ? !forceCollapsedManuallyExpanded
    : sidebarCollapsed;
  return (
    <Box
      sx={{
        display: 'flex',
        height: { xs: '100dvh', md: '100vh' },
        overflow: 'hidden',
        '@media (max-width:899.95px)': {
          '& main': { height: 'calc(100dvh - 72px)' },
        },
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          width: primarySidebarCollapsed ? 96 : 230,
          flexShrink: 0,
        }}
      >
        <DashboardSidebar
          activePage={activeNavigationKey}
          navigation={navigation}
          onNavigate={onNavigate}
          onLogout={onLogout}
          selectedColor="#3c2d24"
          activeBackground="#fbfaf8"
          accentColor="#bf9576"
          collapsed={primarySidebarCollapsed}
          onToggle={() => {
            if (forceSidebarCollapsed) {
              setForceCollapsedManuallyExpanded((value) => !value);
              return;
            }
            setSidebarCollapsed((value) => !value);
          }}
          attachedPanel={secondarySidebar}
        />
      </Box>
      <DashboardMobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activePage={activeNavigationKey}
        navigation={navigation}
        onNavigate={onNavigate}
        onLogout={onLogout}
        branchSelector={mobileBranchSelector}
      />
      <Box
        sx={{
          width: { xs: 0, md: secondarySidebarVisible ? 160 : 0 },
          flexShrink: 0,
        }}
      />
      <DashboardTopbar
        title={pageTitle ?? activePage}
        initials="AP"
        name="Arthit P."
        role="Store manager"
        sidebarWidth={primarySidebarCollapsed ? 96 : 230}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />
      {children}
    </Box>
  );
}
