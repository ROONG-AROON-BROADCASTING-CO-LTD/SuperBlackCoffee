import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { DashboardSidebar, DashboardTopbar } from '@stackbuild/ui';
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
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <DashboardSidebar
        activePage={activePage}
        navigation={navigationForPlan(plan)}
        onNavigate={onNavigate}
        onLogout={onLogout}
        selectedColor="#3c2d24"
        activeBackground="#fbfaf8"
        accentColor="#bf9576"
        collapsed={compact}
        hideToggle={usesCompactPersonnelSidebar}
        onToggle={onToggle}
      />
      <DashboardTopbar
        title={activePage}
        initials="FC"
        name="Franchise account"
        role="Franchise partner"
        sidebarWidth={compact ? 96 : 230}
      />
      {children}
    </Box>
  );
}
