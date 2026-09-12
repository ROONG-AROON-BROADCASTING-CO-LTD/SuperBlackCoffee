import type { ReactNode } from 'react';
import { useState } from 'react';
import { Box } from '@mui/material';
import { DashboardSidebar, DashboardTopbar } from '@stackbuild/ui';
import {
  StockMobileNavigation,
  stockNavigation,
} from '../components/StockNavigation';
import type { StockPage } from '../types/stock';

type StockAppLayoutProps = {
  page: StockPage;
  onPage: (page: StockPage) => void;
  onLogout: () => void;
  name: string;
  branchName: string;
  title: string;
  children: ReactNode;
};

export function StockAppLayout({
  page,
  onPage,
  onLogout,
  name,
  branchName,
  title,
  children,
}: StockAppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: '#fbfaf8' }}>
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <DashboardSidebar
          activePage={title}
          navigation={stockNavigation.map(({ label, icon, group }) => ({
            label,
            icon,
            group,
          }))}
          onNavigate={(label) => {
            const item = stockNavigation.find(
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
          initials={name.slice(0, 1).toUpperCase()}
          name={name}
          role={`พนักงานสาขา${branchName}`}
          sidebarWidth={0}
          disableSidebarTransition
        />
      </Box>
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <DashboardTopbar
          title={title}
          initials={name.slice(0, 1).toUpperCase()}
          name={name}
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
            xs: 'calc(var(--stock-mobile-nav-height, 82px) + env(safe-area-inset-bottom))',
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
      <StockMobileNavigation page={page} onPage={onPage} onLogout={onLogout} />
    </Box>
  );
}
