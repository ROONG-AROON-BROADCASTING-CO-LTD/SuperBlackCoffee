import type { ReactNode } from 'react';
import { useState } from 'react';
import { Box } from '@mui/material';
import {
  DashboardMobileMenu,
  DashboardSidebar,
  DashboardTopbar,
} from '@stackbuild/ui';
import type { FranchisePlan } from '../components/sidebar/franchiseSidebarNavigation';
import { navigationForPlan } from '../components/sidebar/franchiseSidebarNavigation';

export function FranchiseDashboardLayout({
  activePage,
  plan,
  onNavigate,
  onLogout,
  collapsed,
  onToggle,
  children,
}: {
  activePage: string;
  plan: FranchisePlan;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const usesCompactPersonnelSidebar =
    activePage === 'ตารางพนักงาน' || activePage === 'ลงเวลาพนักงาน';
  const compact = collapsed || usesCompactPersonnelSidebar;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigation = navigationForPlan(plan);
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
          width: compact ? 96 : 230,
          flexShrink: 0,
        }}
      >
        <DashboardSidebar
          activePage={activePage}
          navigation={navigation}
          onNavigate={onNavigate}
          onLogout={onLogout}
          selectedColor="#3c2d24"
          activeBackground="#fbfaf8"
          accentColor="#bf9576"
          collapsed={compact}
          hideToggle={usesCompactPersonnelSidebar}
          onToggle={onToggle}
        />
      </Box>
      <DashboardMobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activePage={activePage}
        navigation={navigation}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      <DashboardTopbar
        title={activePage}
        initials="FC"
        name="Franchise account"
        role="Franchise partner"
        sidebarWidth={compact ? 96 : 230}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />
      {children}
    </Box>
  );
}
