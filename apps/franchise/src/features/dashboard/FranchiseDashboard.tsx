import { lazy, Suspense, useEffect, useState } from 'react';
import { DashboardMain } from '@stackbuild/ui';
import { useLocation, useNavigate } from 'react-router-dom';
import { EmployeesSkeleton } from '@stackbuild/management/skeletons/employees';
import { IngredientsSkeleton } from '@stackbuild/management/skeletons/ingredients';
import { ProductsSkeleton } from '@stackbuild/management/skeletons/products';
import { StockSkeleton } from '@stackbuild/management/skeletons/stock';
import { PromotionsSkeleton } from '@stackbuild/management/skeletons/promotions';
import { EmployeesManagementPage } from '@stackbuild/management/pages/employees';
import { IngredientsManagementPage } from '@stackbuild/management/pages/ingredients';
import { ProductsManagementPage } from '@stackbuild/management/pages/products';
import { StockManagementPage } from '@stackbuild/management/pages/stock';
import {
  AttendanceSkeleton,
  CompanyDocumentsPage,
  LeaveRequestsSkeleton,
} from '@stackbuild/management';
import {
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
const FranchiseMaintenancePage = lazy(() =>
  import('../../pages/dashboard/FranchiseMaintenancePage').then((module) => ({
    default: module.FranchiseMaintenancePage,
  })),
);
const FranchiseOverviewPage = lazy(() =>
  import('../../pages/dashboard/FranchiseOverviewPage').then((module) => ({
    default: module.FranchiseOverviewPage,
  })),
);
const PromotionsManagementPage = lazy(() =>
  import('@stackbuild/management/pages/promotions').then((module) => ({
    default: module.PromotionsManagementPage,
  })),
);

function FranchisePageSkeleton({
  page,
  branchName,
}: {
  page: string;
  branchName: string;
}) {
  const skeleton =
    page === 'ตารางพนักงาน' ? (
      <EmployeesSkeleton franchiseMode showHeader />
    ) : page === 'วัตถุดิบ' || page === 'วัตถุดิบของสด' ? (
      <IngredientsSkeleton readOnly allowOrdering />
    ) : page === 'เมนูและสินค้า' ? (
      <ProductsSkeleton readOnly />
    ) : page === 'โปรโมชั่น' ? (
      <PromotionsSkeleton readOnly showHeader branchName={branchName} />
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
  branchName,
  branchCode,
}: {
  logout: () => void;
  plan: FranchisePlan;
  branchName: string;
  branchCode: string;
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
      <Suspense
        fallback={
          <FranchisePageSkeleton page={activePage} branchName={branchName} />
        }
      >
        {activePage === 'เมนูและสินค้า' ? (
          <ProductsManagementPage
            activeBranch={branchName}
            branchCodes={{ [branchName]: branchCode }}
            franchisePlan={plan}
            readOnly
          />
        ) : activePage === 'วัตถุดิบ' || activePage === 'วัตถุดิบของสด' ? (
          <IngredientsManagementPage
            activeBranch={branchName}
            branchCodes={{ [branchName]: branchCode }}
            franchisePlan={plan}
            readOnly
            allowOrdering
            ingredientScope={
              activePage === 'วัตถุดิบของสด' ? 'fresh' : 'regular'
            }
            onRequestCreated={() => navigate('คำขอวัตถุดิบ')}
          />
        ) : activePage === 'โปรโมชั่น' ? (
          <PromotionsManagementPage mode="franchise" branchName={branchName} />
        ) : activePage === 'คำขอวัตถุดิบ' ? (
          <FranchiseIngredientRequestsPage />
        ) : activePage === 'แจ้งซ่อม / งานช่าง' ? (
          <FranchiseMaintenancePage />
        ) : activePage === 'สต๊อกอุปกรณ์เครื่องดื่ม' ? (
          <StockManagementPage
            activeBranch={branchName}
            branchCodes={{ [branchName]: branchCode }}
            readOnly
            allowOrdering
            stockCategory="drink_equipment"
            stockLabel="สต๊อกอุปกรณ์เครื่องดื่ม"
            onRequestCreated={() => navigate('คำขอวัตถุดิบ')}
          />
        ) : activePage === 'สต๊อกอุปกรณ์ไปรษณีย์' ? (
          <StockManagementPage
            activeBranch={branchName}
            branchCodes={{ [branchName]: branchCode }}
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
        ) : activePage === 'เอกสารส่วนกลาง' ? (
          <CompanyDocumentsPage readOnly />
        ) : (
          <DashboardMain>
            <FranchiseOverviewPage
              plan={plan}
              branchName={branchName}
              branchCode={branchCode}
              onNavigate={navigate}
            />
          </DashboardMain>
        )}
      </Suspense>
    </FranchiseDashboardLayout>
  );
}
