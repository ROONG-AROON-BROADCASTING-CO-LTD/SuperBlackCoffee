import { lazy, Suspense, useState } from 'react';
import { DashboardMain } from '@stackbuild/ui';
import { useLocation, useNavigate } from 'react-router-dom';
import { EmployeesSkeleton } from '@stackbuild/management/skeletons/employees';
import { IngredientsSkeleton } from '@stackbuild/management/skeletons/ingredients';
import { ProductsSkeleton } from '@stackbuild/management/skeletons/products';
import { StockSkeleton } from '@stackbuild/management/skeletons/stock';
import { LeaveRequestsSkeleton } from '@stackbuild/management';
import {
  franchiseBranch,
  type FranchisePlan,
} from '../../components/sidebar/franchiseSidebarNavigation';
import { FranchiseOverviewSkeleton } from '../../components/skeletons/FranchiseOverviewSkeleton';
import { FranchiseDashboardLayout } from '../../layouts/FranchiseDashboardLayout';
import {
  franchisePageFromPath,
  franchisePagePaths,
} from '../../routes/franchiseRoutes';

const ProductsManagementPage = lazy(() =>
  import('@stackbuild/management/pages/products').then((module) => ({
    default: module.ProductsManagementPage,
  })),
);
const IngredientsManagementPage = lazy(() =>
  import('@stackbuild/management/pages/ingredients').then((module) => ({
    default: module.IngredientsManagementPage,
  })),
);
const StockManagementPage = lazy(() =>
  import('@stackbuild/management/pages/stock').then((module) => ({
    default: module.StockManagementPage,
  })),
);
const EmployeesManagementPage = lazy(() =>
  import('@stackbuild/management/pages/employees').then((module) => ({
    default: module.EmployeesManagementPage,
  })),
);
const AttendanceManagementPage = lazy(() =>
  import('@stackbuild/management/pages/attendance').then((module) => ({
    default: module.AttendanceManagementPage,
  })),
);
const LeaveRequestsManagementPage = lazy(() =>
  import('@stackbuild/management/pages/leave-requests').then((module) => ({
    default: module.LeaveRequestsManagementPage,
  })),
);
const FranchiseIngredientRequestsPage = lazy(() =>
  import('../../pages/dashboard/FranchiseIngredientRequestsPage').then(
    (module) => ({
      default: module.FranchiseIngredientRequestsPage,
    }),
  ),
);
const FranchiseOverviewPage = lazy(() =>
  import('../../pages/dashboard/FranchiseOverviewPage').then((module) => ({
    default: module.FranchiseOverviewPage,
  })),
);

function FranchisePageSkeleton({ page }: { page: string }) {
  const skeleton =
    page === 'ตารางพนักงาน' ? (
      <EmployeesSkeleton franchiseMode />
    ) : page === 'วัตถุดิบ' ? (
      <IngredientsSkeleton />
    ) : page === 'เมนูและสินค้า' ? (
      <ProductsSkeleton />
    ) : page === 'สต๊อก' ? (
      <StockSkeleton />
    ) : page === 'คำขอลาพนักงาน' ? (
      <LeaveRequestsSkeleton />
    ) : (
      <FranchiseOverviewSkeleton />
    );
  return <DashboardMain>{skeleton}</DashboardMain>;
}

export function FranchiseDashboard({
  logout,
  plan,
}: {
  logout: () => void;
  plan: FranchisePlan;
}) {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const activePage = franchisePageFromPath(location.pathname);
  const [collapsed, setCollapsed] = useState(
    () => sessionStorage.getItem('sbc-franchise-sidebar-collapsed') === 'true',
  );
  const navigate = (page: string) => {
    const path =
      franchisePagePaths[page as keyof typeof franchisePagePaths] ?? '/';
    if (path === location.pathname) return;
    sessionStorage.setItem('sbc-franchise-active-page', page);
    routerNavigate(path);
  };
  return (
    <FranchiseDashboardLayout
      activePage={activePage}
      plan={plan}
      onNavigate={navigate}
      onLogout={logout}
      collapsed={collapsed}
      onToggle={() =>
        setCollapsed((value) => {
          const next = !value;
          sessionStorage.setItem(
            'sbc-franchise-sidebar-collapsed',
            String(next),
          );
          return next;
        })
      }
    >
      <Suspense fallback={<FranchisePageSkeleton page={activePage} />}>
        {activePage === 'เมนูและสินค้า' ? (
          <ProductsManagementPage
            activeBranch={franchiseBranch}
            franchisePlan={plan}
            readOnly
          />
        ) : activePage === 'วัตถุดิบ' ? (
          <IngredientsManagementPage
            activeBranch={franchiseBranch}
            franchisePlan={plan}
            readOnly
            allowOrdering
            onRequestCreated={() => navigate('คำขอวัตถุดิบ')}
          />
        ) : activePage === 'คำขอวัตถุดิบ' ? (
          <FranchiseIngredientRequestsPage />
        ) : activePage === 'สต๊อก' ? (
          <StockManagementPage activeBranch={franchiseBranch} readOnly />
        ) : activePage === 'ตารางพนักงาน' ? (
          <EmployeesManagementPage franchiseMode suppressLoadingHeader />
        ) : activePage === 'ลงเวลาพนักงาน' ? (
          <AttendanceManagementPage franchiseMode />
        ) : activePage === 'คำขอลาพนักงาน' ? (
          <LeaveRequestsManagementPage franchiseMode />
        ) : (
          <DashboardMain>
            <FranchiseOverviewPage plan={plan} onNavigate={navigate} />
          </DashboardMain>
        )}
      </Suspense>
    </FranchiseDashboardLayout>
  );
}
