import { lazy, Suspense, useEffect, useState } from 'react';
import { DashboardMain } from '@stackbuild/ui';
import { useLocation, useNavigate } from 'react-router-dom';
import { EmployeesSkeleton } from '@stackbuild/management/skeletons/employees';
import { IngredientsSkeleton } from '@stackbuild/management/skeletons/ingredients';
import { ProductsSkeleton } from '@stackbuild/management/skeletons/products';
import { StockSkeleton } from '@stackbuild/management/skeletons/stock';
import { EmployeesManagementPage } from '@stackbuild/management/pages/employees';
import { IngredientsManagementPage } from '@stackbuild/management/pages/ingredients';
import { ProductsManagementPage } from '@stackbuild/management/pages/products';
import { StockManagementPage } from '@stackbuild/management/pages/stock';
import {
  AttendanceSkeleton,
  LeaveRequestsSkeleton,
} from '@stackbuild/management';
import {
  franchiseBranch,
  pageAvailableForPlan,
  type FranchisePlan,
} from '../../components/sidebar/franchiseSidebarNavigation';
import { FranchiseOverviewSkeleton } from '../../components/skeletons/FranchiseOverviewSkeleton';
import { FranchiseDashboardLayout } from '../../layouts/FranchiseDashboardLayout';
import {
  franchisePageFromPath,
  franchisePagePaths,
} from '../../routes/franchiseRoutes';

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
      <EmployeesSkeleton franchiseMode showHeader />
    ) : page === 'วัตถุดิบ' ? (
      <IngredientsSkeleton readOnly allowOrdering />
    ) : page === 'เมนูและสินค้า' ? (
      <ProductsSkeleton readOnly />
    ) : page === 'สต๊อกอุปกรณ์เครื่องดื่ม' ||
      page === 'สต๊อกอุปกรณ์ไปรษณีย์' ? (
      <StockSkeleton readOnly />
    ) : page === 'ลงเวลาพนักงาน' ? (
      <AttendanceSkeleton franchiseMode />
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
  const requestedPage = franchisePageFromPath(location.pathname);
  const activePage = pageAvailableForPlan(plan, requestedPage)
    ? requestedPage
    : 'ภาพรวม';
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
  useEffect(() => {
    if (!pageAvailableForPlan(plan, requestedPage)) {
      routerNavigate('/', { replace: true });
    }
  }, [plan, requestedPage, routerNavigate]);
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
        ) : activePage === 'สต๊อกอุปกรณ์เครื่องดื่ม' ? (
          <StockManagementPage
            activeBranch={franchiseBranch}
            readOnly
            allowOrdering
            stockCategory="drink_equipment"
            stockLabel="สต๊อกอุปกรณ์เครื่องดื่ม"
            onRequestCreated={() => navigate('คำขอวัตถุดิบ')}
          />
        ) : activePage === 'สต๊อกอุปกรณ์ไปรษณีย์' ? (
          <StockManagementPage
            activeBranch={franchiseBranch}
            readOnly
            stockCategory="postal_equipment"
            stockLabel="สต๊อกอุปกรณ์ไปรษณีย์"
          />
        ) : activePage === 'ตารางพนักงาน' ? (
          <EmployeesManagementPage franchiseMode />
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
