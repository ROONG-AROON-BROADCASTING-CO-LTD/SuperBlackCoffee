import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { DashboardMain } from '@stackbuild/ui';
import {
  EmployeesSkeleton,
  AttendanceSkeleton,
  LeaveRequestsSkeleton,
  IngredientsSkeleton,
  ProductsSkeleton,
  StockSkeleton,
  BranchesSidebar,
  branchCodeByBranch,
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
import {
  EmployeesManagementPage as AdminEmployeesPage,
  IngredientsManagementPage as AdminIngredientsPage,
  ProductsManagementPage as AdminProductsPage,
  StockManagementPage as AdminStockPage,
} from '../../pages/dashboard/management';
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
    ) : page === 'สต๊อกอุปกรณ์เครื่องดื่ม' ||
      page === 'สต๊อกอุปกรณ์ไปรษณีย์' ? (
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
  const selectedBranch = branchParam || 'ทุกสาขา';
  const activeBranch = (
    selectedBranch === 'แฟรนไชส์ทั้งหมด' ? 'ทุกสาขา' : selectedBranch
  ) as Branch;
  const activeOrderTab =
    searchParams.get('tab') === 'franchise' ? 'franchise' : 'sbc';
  const [branchDirectory, setBranchDirectory] = useState<ApiBranch[]>([]);
  const scrollbarTimeoutRef = useRef<number | undefined>(undefined);
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
  const navigate = (navigationTarget: string) => {
    const isFranchiseCatalogTarget = navigationTarget.startsWith('franchise-');
    const nextPage = (
      isFranchiseCatalogTarget
        ? navigationTarget.replace('franchise-', '')
        : navigationTarget.replace('sbc-', '')
    ) as AdminPage;
    const catalogPageByTarget: Record<string, AdminPage> = {
      products: 'เมนูและสินค้า',
      'drink-stock': 'สต๊อกอุปกรณ์เครื่องดื่ม',
      'postal-stock': 'สต๊อกอุปกรณ์ไปรษณีย์',
      ingredients: 'วัตถุดิบ',
    };
    const destinationPage = catalogPageByTarget[nextPage] ?? nextPage;
    const nextBranch = isFranchiseCatalogTarget ? 'แฟรนไชส์ทั้งหมด' : undefined;
    const alreadyAtDestination =
      activePage === destinationPage &&
      (nextBranch
        ? selectedBranch === nextBranch
        : selectedBranch === 'ทุกสาขา');
    if (alreadyAtDestination) return;
    routerNavigate({
      pathname: adminPagePaths[destinationPage],
      search: nextBranch ? `?branch=${encodeURIComponent(nextBranch)}` : '',
    });
  };
  const isIngredientPage = activePage === 'วัตถุดิบ';
  const isStockPage = activePage === 'สต๊อกอุปกรณ์เครื่องดื่ม';
  const isPostalStockPage = activePage === 'สต๊อกอุปกรณ์ไปรษณีย์';
  const franchiseBranchOptions = useMemo(
    () =>
      branchDirectory
        .filter((branch) => Boolean(branch.franchiseeId))
        .map((branch) => branch.name),
    [branchDirectory],
  );
  const usesCompactPersonnelSidebar =
    activePage === 'ตารางพนักงาน' || activePage === 'ลงเวลาพนักงาน';
  const hasBranchSidebar =
    isIngredientPage ||
    isStockPage ||
    isPostalStockPage ||
    activePage === 'เมนูและสินค้า' ||
    activePage === 'คำสั่งซื้อ';
  const isCatalogPage =
    isIngredientPage ||
    isStockPage ||
    isPostalStockPage ||
    activePage === 'เมนูและสินค้า';
  const isFranchiseCatalogSelection =
    isCatalogPage &&
    (selectedBranch === 'แฟรนไชส์ทั้งหมด' ||
      franchiseBranchOptions.includes(selectedBranch));
  const activeNavigationKey = isCatalogPage
    ? `${isFranchiseCatalogSelection ? 'franchise' : 'sbc'}-${
        activePage === 'เมนูและสินค้า'
          ? 'products'
          : activePage === 'วัตถุดิบ'
            ? 'ingredients'
            : activePage === 'สต๊อกอุปกรณ์เครื่องดื่ม'
              ? 'drink-stock'
              : 'postal-stock'
      }`
    : activePage;
  const catalogBranchOptions = useMemo(
    () =>
      selectedBranch === 'แฟรนไชส์ทั้งหมด'
        ? ['ทุกสาขา', ...franchiseBranchOptions]
        : undefined,
    [franchiseBranchOptions, selectedBranch],
  );
  const catalogBranchCodes = useMemo(
    () => ({
      ...branchCodeByBranch,
      ...Object.fromEntries(
        branchDirectory.map((branch) => [branch.name, branch.code]),
      ),
    }),
    [branchDirectory],
  );
  const sbcBranchOptions = useMemo(
    () =>
      branchDirectory
        .filter((branch) => !branch.franchiseeId)
        .map((branch) => branch.name),
    [branchDirectory],
  );
  const pageContent = isIngredientPage ? (
    <AdminIngredientsPage
      activeBranch={activeBranch}
      branchOptions={catalogBranchOptions}
      branchCodes={catalogBranchCodes}
    />
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
    <AdminStockPage
      activeBranch={activeBranch}
      stockCategory="drink_equipment"
      stockLabel="สต๊อกอุปกรณ์เครื่องดื่ม"
      branchOptions={catalogBranchOptions}
      branchCodes={catalogBranchCodes}
    />
  ) : isPostalStockPage ? (
    <AdminStockPage
      activeBranch={activeBranch}
      stockCategory="postal_equipment"
      stockLabel="สต๊อกอุปกรณ์ไปรษณีย์"
      branchOptions={catalogBranchOptions}
      branchCodes={catalogBranchCodes}
    />
  ) : activePage === 'เมนูและสินค้า' ? (
    <AdminProductsPage
      activeBranch={activeBranch}
      branchOptions={catalogBranchOptions}
      branchCodes={catalogBranchCodes}
    />
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
      ? selectedBranch === 'แฟรนไชส์ทั้งหมด'
        ? 'วัตถุดิบ ทุกแฟรนไชส์'
        : 'วัตถุดิบ ทุกสาขา'
      : `วัตถุดิบ สาขา${activeBranch}`
    : isStockPage || isPostalStockPage
      ? activeBranch === 'ทุกสาขา'
        ? `${activePage} ${selectedBranch === 'แฟรนไชส์ทั้งหมด' ? 'ทุกแฟรนไชส์' : 'ทุกสาขา'}`
        : `${activePage} สาขา${activeBranch}`
      : activePage === 'เมนูและสินค้า'
        ? activeBranch === 'ทุกสาขา'
          ? selectedBranch === 'แฟรนไชส์ทั้งหมด'
            ? 'เมนูและสินค้า ทุกแฟรนไชส์'
            : 'เมนูและสินค้า ทุกสาขา'
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
      activeNavigationKey={activeNavigationKey}
      pageTitle={pageTitle}
      navigation={adminSidebarNavigation}
      onNavigate={navigate}
      onLogout={logout}
      forceSidebarCollapsed={hasBranchSidebar || usesCompactPersonnelSidebar}
      secondarySidebarVisible={hasBranchSidebar}
      secondarySidebar={
        <BranchesSidebar
          activeBranch={selectedBranch}
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
              : isCatalogPage
                ? isFranchiseCatalogSelection
                  ? ['แฟรนไชส์ทั้งหมด', ...franchiseBranchOptions]
                  : ['ทุกสาขา', ...sbcBranchOptions]
                : undefined
          }
          allBranchLabel={
            (activePage === 'คำสั่งซื้อ' && activeOrderTab === 'franchise') ||
            isFranchiseCatalogSelection
              ? 'ทุกแฟรนไชส์'
              : isCatalogPage
                ? 'ทุกสาขา SBC'
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
