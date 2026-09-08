import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { DashboardMain, coffeeIngredientsImage } from '@stackbuild/ui';
import {
  EmployeesSkeleton,
  AttendanceSkeleton,
  LeaveRequestsSkeleton,
  IngredientsSkeleton,
  ProductsSkeleton,
  StockSkeleton,
  BranchesSidebar,
  type Branch,
} from '@stackbuild/management';
import { adminSidebarNavigation } from '../../components/sidebar/adminSidebarNavigation';
import { AdminDashboardLayout } from '../../layouts/AdminDashboardLayout';
import { AdminOverviewSkeleton } from '../../components/skeletons/AdminOverviewSkeleton';
import { AdminAuditSkeleton } from '../../components/skeletons/AdminAuditSkeleton';
import { AdminBranchesSkeleton } from '../../components/skeletons/AdminBranchesSkeleton';
import { AdminOrdersSkeleton } from '../../components/skeletons/AdminOrdersSkeleton';
import { AdminFranchiseBranchesSkeleton } from '../../components/skeletons/AdminFranchiseBranchesSkeleton';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { listBranches, type Branch as ApiBranch } from '../../api/branches';
import {
  adminPageFromPath,
  adminPagePaths,
  type AdminPage,
} from '../../routes/adminRoutes';
import { EmployeesManagementPage as AdminEmployeesPage } from '../../pages/dashboard/management';
const AdminBranchesPage = lazy(() =>
  import('../../pages/dashboard/AdminBranchesPage').then((module) => ({
    default: module.AdminBranchesPage,
  })),
);
const AdminFranchiseBranchesPage = lazy(() =>
  import('../../pages/dashboard/AdminFranchiseBranchesPage').then((module) => ({
    default: module.AdminFranchiseBranchesPage,
  })),
);
const AdminAttendancePage = lazy(() =>
  import('../../pages/dashboard/management').then((module) => ({
    default: module.AttendanceManagementPage,
  })),
);
const AdminLeaveRequestsPage = lazy(() =>
  import('../../pages/dashboard/management').then((module) => ({
    default: module.LeaveRequestsManagementPage,
  })),
);
const AdminIngredientsPage = lazy(() =>
  import('../../pages/dashboard/management').then((module) => ({
    default: module.IngredientsManagementPage,
  })),
);
const AdminOrdersPage = lazy(() =>
  import('../../pages/dashboard/AdminOrdersPage').then((module) => ({
    default: module.AdminOrdersPage,
  })),
);
const AdminAuditPage = lazy(() =>
  import('../../pages/dashboard/AdminAuditPage').then((module) => ({
    default: module.AdminAuditPage,
  })),
);
const AdminOverviewPage = lazy(() =>
  import('../../pages/dashboard/AdminOverviewPage').then((module) => ({
    default: module.AdminOverviewPage,
  })),
);
const AdminProductsPage = lazy(() =>
  import('../../pages/dashboard/management').then((module) => ({
    default: module.ProductsManagementPage,
  })),
);
const AdminStockPage = lazy(() =>
  import('../../pages/dashboard/management').then((module) => ({
    default: module.StockManagementPage,
  })),
);

function DashboardPageSkeleton({ page }: { page: AdminPage }) {
  const skeleton =
    page === 'ภาพรวม' ? (
      <AdminOverviewSkeleton />
    ) : page === 'สาขา SBC' ? (
      <AdminBranchesSkeleton />
    ) : page === 'คำสั่งซื้อ' ? (
      <AdminOrdersSkeleton />
    ) : page === 'ประวัติการทำรายการ' ? (
      <AdminAuditSkeleton />
    ) : page === 'สต๊อก' ? (
      <StockSkeleton />
    ) : page === 'เมนูและสินค้า' ? (
      <ProductsSkeleton />
    ) : page === 'วัตถุดิบ' ? (
      <IngredientsSkeleton />
    ) : page === 'ตารางพนักงาน' ? (
      <EmployeesSkeleton showHeader />
    ) : page === 'ลงเวลาพนักงาน' ? (
      <AttendanceSkeleton />
    ) : page === 'คำขอลาพนักงาน' ? (
      <LeaveRequestsSkeleton />
    ) : page === 'สาขาแฟรนไชส์' ? (
      <AdminFranchiseBranchesSkeleton />
    ) : (
      <AdminBranchesSkeleton />
    );
  return <DashboardMain>{skeleton}</DashboardMain>;
}

export function AdminDashboard({ logout }: { logout: () => void }) {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activePage = adminPageFromPath(location.pathname);
  const branchParam = searchParams.get('branch');
  const activeBranch = (branchParam || 'ทุกสาขา') as Branch;
  const activeOrderTab =
    searchParams.get('tab') === 'franchise' ? 'franchise' : 'sbc';
  const [branchDirectory, setBranchDirectory] = useState<ApiBranch[]>([]);
  const scrollbarTimeoutRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const ingredientImage = new Image();
    ingredientImage.src = coffeeIngredientsImage;
    void ingredientImage.decode().catch(() => undefined);
  }, []);
  useEffect(() => {
    void listBranches()
      .then(setBranchDirectory)
      .catch(() => setBranchDirectory([]));
  }, []);
  useEffect(() => {
    const revealScrollbars = () => {
      document.documentElement.classList.add('sbc-is-scrolling');
      window.clearTimeout(scrollbarTimeoutRef.current);
      scrollbarTimeoutRef.current = window.setTimeout(
        () => document.documentElement.classList.remove('sbc-is-scrolling'),
        700,
      );
    };
    window.addEventListener('scroll', revealScrollbars, true);
    return () => {
      window.removeEventListener('scroll', revealScrollbars, true);
      window.clearTimeout(scrollbarTimeoutRef.current);
      document.documentElement.classList.remove('sbc-is-scrolling');
    };
  }, []);
  const navigate = (page: string) => {
    const nextPage = page as AdminPage;
    if (nextPage === activePage) return;
    routerNavigate(adminPagePaths[nextPage]);
  };
  const isIngredientPage = activePage === 'วัตถุดิบ';
  const isStockPage = activePage === 'สต๊อก';
  const usesCompactPersonnelSidebar =
    activePage === 'ตารางพนักงาน' || activePage === 'ลงเวลาพนักงาน';
  const hasBranchSidebar =
    isIngredientPage ||
    isStockPage ||
    activePage === 'เมนูและสินค้า' ||
    activePage === 'คำสั่งซื้อ';
  const pageContent = isIngredientPage ? (
    <AdminIngredientsPage activeBranch={activeBranch} />
  ) : activePage === 'ภาพรวม' ? (
    <AdminOverviewPage onNavigate={navigate} />
  ) : activePage === 'คำสั่งซื้อ' ? (
    <AdminOrdersPage
      activeBranch={activeBranch}
      activeTab={activeOrderTab}
      onTabChange={(tab) => {
        setSearchParams(
          (current) => {
            current.set('tab', tab);
            current.delete('branch');
            return current;
          },
          { replace: true },
        );
      }}
    />
  ) : activePage === 'ประวัติการทำรายการ' ? (
    <AdminAuditPage />
  ) : isStockPage ? (
    <AdminStockPage activeBranch={activeBranch} />
  ) : activePage === 'เมนูและสินค้า' ? (
    <AdminProductsPage activeBranch={activeBranch} />
  ) : activePage === 'สาขาแฟรนไชส์' ? (
    <AdminFranchiseBranchesPage />
  ) : activePage === 'ตารางพนักงาน' ? (
    <AdminEmployeesPage />
  ) : activePage === 'ลงเวลาพนักงาน' ? (
    <AdminAttendancePage />
  ) : activePage === 'คำขอลาพนักงาน' ? (
    <AdminLeaveRequestsPage />
  ) : (
    <AdminBranchesPage />
  );
  const pageTitle = isIngredientPage
    ? activeBranch === 'ทุกสาขา'
      ? 'วัตถุดิบ ทุกสาขา'
      : `วัตถุดิบ สาขา${activeBranch}`
    : isStockPage
      ? activeBranch === 'ทุกสาขา'
        ? 'สต๊อก ทุกสาขา'
        : `สต๊อก สาขา${activeBranch}`
      : activePage === 'เมนูและสินค้า'
        ? activeBranch === 'ทุกสาขา'
          ? 'เมนูและสินค้า ทุกสาขา'
          : `เมนูและสินค้า สาขา${activeBranch}`
        : activePage === 'คำสั่งซื้อ'
          ? activeBranch === 'ทุกสาขา'
            ? activeOrderTab === 'franchise'
              ? 'คำสั่งซื้อ แฟรนไชส์ทั้งหมด'
              : 'คำสั่งซื้อ ทุกสาขา'
            : activeOrderTab === 'franchise'
              ? `คำสั่งซื้อ แฟรนไชส์ ${activeBranch}`
              : `คำสั่งซื้อ สาขา${activeBranch}`
          : activePage === 'สาขา SBC'
            ? 'สาขา Super Black Coffee'
            : activePage;
  return (
    <AdminDashboardLayout
      activePage={activePage}
      pageTitle={pageTitle}
      navigation={adminSidebarNavigation}
      onNavigate={navigate}
      onLogout={logout}
      forceSidebarCollapsed={hasBranchSidebar || usesCompactPersonnelSidebar}
      secondarySidebarVisible={hasBranchSidebar}
      secondarySidebar={
        <BranchesSidebar
          activeBranch={activeBranch}
          onBranchChange={(branch) => {
            setSearchParams(
              (current) => {
                if (branch === 'ทุกสาขา') current.delete('branch');
                else current.set('branch', branch);
                return current;
              },
              { replace: true },
            );
          }}
          branchOptions={
            activePage === 'คำสั่งซื้อ'
              ? [
                  'ทุกสาขา',
                  ...branchDirectory
                    .filter((branch) =>
                      activeOrderTab === 'franchise'
                        ? Boolean(branch.franchiseeId)
                        : !branch.franchiseeId,
                    )
                    .map((branch) => branch.name),
                ]
              : undefined
          }
          allBranchLabel={
            activePage === 'คำสั่งซื้อ' && activeOrderTab === 'franchise'
              ? 'ทุกแฟรนไชส์'
              : 'ทุกสาขา'
          }
          visible={hasBranchSidebar}
        />
      }
    >
      <Suspense fallback={<DashboardPageSkeleton page={activePage} />}>
        {pageContent}
      </Suspense>
    </AdminDashboardLayout>
  );
}
