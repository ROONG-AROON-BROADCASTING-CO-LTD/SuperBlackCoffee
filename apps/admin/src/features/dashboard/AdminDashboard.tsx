import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { DashboardMain, PageIntro } from '@stackbuild/ui';
import {
  EmployeesSkeleton,
  AttendanceSkeleton,
  LeaveRequestsSkeleton,
  IngredientsSkeleton,
  ProductsSkeleton,
  PromotionsSkeleton,
  StockSkeleton,
  CompanyDocumentsSkeleton,
  CompanyDocumentsPage,
  BranchesSidebar,
  branchCodeByBranch,
  useAutoRetry,
  type Branch,
} from '@stackbuild/management';
import { adminSidebarNavigation } from '../../components/sidebar/adminSidebarNavigation';
import { AdminDashboardLayout } from '../../layouts/AdminDashboardLayout';
import { AdminOverviewSkeleton } from '../../components/skeletons/AdminOverviewSkeleton';
import { AdminOperationsPage } from '../../pages/dashboard/AdminOperationsPage';
import { AdminAuditSkeleton } from '../../components/skeletons/AdminAuditSkeleton';
import { AdminBranchesSkeleton } from '../../components/skeletons/AdminBranchesSkeleton';
import { AdminOrdersSkeleton } from '../../components/skeletons/AdminOrdersSkeleton';
import { AdminFranchiseBranchesSkeleton } from '../../components/skeletons/AdminFranchiseBranchesSkeleton';
import { AdminCentralCatalogSkeleton } from '../../components/skeletons/AdminCentralCatalogSkeleton';
import { AdminOperationsSkeleton } from '../../components/skeletons/AdminOperationsSkeleton';
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
  import('@stackbuild/management/pages/attendance').then((module) => ({
    default: module.AttendanceManagementPage,
  })),
);
const AdminLeaveRequestsPage = lazy(() =>
  import('@stackbuild/management/pages/leave-requests').then((module) => ({
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
const PromotionsManagementPage = lazy(() =>
  import('@stackbuild/management/pages/promotions').then((module) => ({
    default: module.PromotionsManagementPage,
  })),
);
const AdminCentralCatalogPage = lazy(() =>
  import('../../pages/dashboard/AdminCentralCatalogPage').then((module) => ({
    default: module.AdminCentralCatalogPage,
  })),
);

const centralCatalogSkeletonContent: Partial<
  Record<
    AdminPage,
    {
      section:
        | 'menus'
        | 'ingredients'
        | 'fresh-ingredients'
        | 'drink-equipment'
        | 'postal-equipment'
        | 'branches';
      title: string;
      description: string;
    }
  >
> = {
  สินค้าและคลังกลาง: {
    section: 'menus',
    title: 'เมนูและสินค้ากลาง',
    description:
      'จัดการเมนู ราคา และสูตรกลาง พร้อมเลือกขนาดสาขา S / M / L ที่ใช้',
  },
  เมนูและสินค้ากลาง: {
    section: 'menus',
    title: 'เมนูและสินค้ากลาง',
    description:
      'จัดการเมนู ราคา และสูตรกลาง พร้อมเลือกขนาดสาขา S / M / L ที่ใช้',
  },
  วัตถุดิบกลาง: {
    section: 'ingredients',
    title: 'วัตถุดิบกลาง',
    description:
      'จัดการวัตถุดิบทั่วไป ต้นทุน และจุดแจ้งเตือนสำหรับแต่ละขนาดสาขา',
  },
  วัตถุดิบของสดกลาง: {
    section: 'fresh-ingredients',
    title: 'วัตถุดิบของสดกลาง',
    description: 'จัดการวัตถุดิบของสดที่ใช้ในข้อมูลกลาง',
  },
  อุปกรณ์เครื่องดื่มกลาง: {
    section: 'drink-equipment',
    title: 'อุปกรณ์เครื่องดื่มกลาง',
    description: 'จัดการอุปกรณ์เครื่องดื่มที่ใช้ในข้อมูลกลาง',
  },
  อุปกรณ์ไปรษณีย์กลาง: {
    section: 'postal-equipment',
    title: 'อุปกรณ์ไปรษณีย์กลาง',
    description: 'จัดการอุปกรณ์ไปรษณีย์ที่ใช้ในข้อมูลกลาง',
  },
  รายการสาขาและแฟรนไชส์: {
    section: 'branches',
    title: 'รายการสาขาและแฟรนไชส์',
    description:
      'เลือกรายการที่ใช้ในสาขา SBC และแฟรนไชส์ พร้อมตรวจผลกระทบก่อนซิงก์ข้อมูลกลาง',
  },
  กระจายข้อมูลกลาง: {
    section: 'branches',
    title: 'รายการสาขาและแฟรนไชส์',
    description:
      'เลือกรายการที่ใช้ในสาขา SBC และแฟรนไชส์ พร้อมตรวจผลกระทบก่อนซิงก์ข้อมูลกลาง',
  },
};

function DashboardPageSkeleton({ page }: { page: AdminPage }) {
  const centralCatalog = centralCatalogSkeletonContent[page];
  if (centralCatalog) {
    return (
      <DashboardMain>
        <PageIntro
          title={centralCatalog.title}
          description={centralCatalog.description}
        />
        <AdminCentralCatalogSkeleton section={centralCatalog.section} />
      </DashboardMain>
    );
  }
  const skeleton =
    page === 'ภาพรวม' ? (
      <AdminOverviewSkeleton />
    ) : page === 'สาขา SBC' ? (
      <AdminBranchesSkeleton />
    ) : page === 'คำสั่งซื้อ' ? (
      <AdminOrdersSkeleton />
    ) : page === 'โปรโมชั่น' ? (
      <PromotionsSkeleton showHeader />
    ) : page === 'ประวัติการทำรายการ' ? (
      <AdminAuditSkeleton />
    ) : page === 'เอกสารส่วนกลาง' ? (
      <CompanyDocumentsSkeleton />
    ) : page === 'สต๊อกอุปกรณ์เครื่องดื่ม' ||
      page === 'สต๊อกอุปกรณ์ไปรษณีย์' ? (
      <StockSkeleton readOnly cardColumns={5} />
    ) : page === 'เมนูและสินค้า' ? (
      <ProductsSkeleton readOnly cardColumns={5} />
    ) : page === 'วัตถุดิบ' || page === 'วัตถุดิบของสด' ? (
      <IngredientsSkeleton readOnly cardColumns={5} />
    ) : page === 'ตารางพนักงาน' ? (
      <EmployeesSkeleton showHeader />
    ) : page === 'ลงเวลาพนักงาน' ? (
      <AttendanceSkeleton />
    ) : page === 'คำขอลาพนักงาน' ? (
      <LeaveRequestsSkeleton />
    ) : page === 'สาขาแฟรนไชส์' ? (
      <AdminFranchiseBranchesSkeleton />
    ) : page === 'ตรวจมาตรฐานและบริการ' ? (
      <AdminOperationsSkeleton />
    ) : (
      <AdminBranchesSkeleton />
    );
  return <DashboardMain>{skeleton}</DashboardMain>;
}

const centralCatalogPages = {
  สินค้าและคลังกลาง: { section: 'menus', navigation: 'central-menus' },
  เมนูและสินค้ากลาง: { section: 'menus', navigation: 'central-menus' },
  วัตถุดิบกลาง: {
    section: 'ingredients',
    navigation: 'central-ingredients',
  },
  วัตถุดิบของสดกลาง: {
    section: 'fresh-ingredients',
    navigation: 'central-fresh-ingredients',
  },
  อุปกรณ์เครื่องดื่มกลาง: {
    section: 'drink-equipment',
    navigation: 'central-drink-equipment',
  },
  อุปกรณ์ไปรษณีย์กลาง: {
    section: 'postal-equipment',
    navigation: 'central-postal-equipment',
  },
  รายการสาขาและแฟรนไชส์: {
    section: 'branches',
    navigation: 'central-branches',
  },
  กระจายข้อมูลกลาง: { section: 'branches', navigation: 'central-branches' },
} as const;

const centralCatalogNavigation: Record<string, AdminPage> = {
  'central-catalog': 'เมนูและสินค้ากลาง',
  'central-menus': 'เมนูและสินค้ากลาง',
  'central-ingredients': 'วัตถุดิบกลาง',
  'central-fresh-ingredients': 'วัตถุดิบของสดกลาง',
  'central-drink-equipment': 'อุปกรณ์เครื่องดื่มกลาง',
  'central-postal-equipment': 'อุปกรณ์ไปรษณีย์กลาง',
  'central-branches': 'รายการสาขาและแฟรนไชส์',
  'central-sync': 'รายการสาขาและแฟรนไชส์',
};

export function AdminDashboard({ logout }: { logout: () => void }) {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activePage = adminPageFromPath(location.pathname);
  const branchParam = searchParams.get('branch');
  const [branchDirectory, setBranchDirectory] = useState<ApiBranch[]>([]);
  const firstCompanyBranch = branchDirectory.find(
    (branch) => !branch.franchiseeId,
  );
  const selectedBranch =
    branchParam ||
    (activePage === 'เมนูและสินค้า' ? firstCompanyBranch?.name : undefined) ||
    'ทุกสาขา';
  const activeBranch = (
    selectedBranch === 'แฟรนไชส์ทั้งหมด' ? 'ทุกสาขา' : selectedBranch
  ) as Branch;
  const activeOrderTab =
    searchParams.get('tab') === 'franchise' ? 'franchise' : 'sbc';
  const [branchLoadError, setBranchLoadError] = useState(false);
  const [branchReloadKey, setBranchReloadKey] = useState(0);
  const scrollbarTimeoutRef = useRef<number | undefined>(undefined);
  useAutoRetry(branchLoadError, () =>
    setBranchReloadKey((current) => current + 1),
  );
  useEffect(() => {
    let active = true;
    void listBranches()
      .then((branches) => {
        if (!active) return;
        setBranchDirectory(branches);
        setBranchLoadError(false);
      })
      .catch(() => {
        if (!active) return;
        setBranchDirectory([]);
        setBranchLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [branchReloadKey]);
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
    if (navigationTarget in centralCatalogNavigation) {
      const destination = centralCatalogNavigation[navigationTarget];
      if (activePage === destination) return;
      routerNavigate(adminPagePaths[destination]);
      return;
    }
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
      'fresh-ingredients': 'วัตถุดิบของสด',
    };
    const destinationPage = catalogPageByTarget[nextPage] ?? nextPage;
    const nextBranch = isFranchiseCatalogTarget
      ? destinationPage === 'เมนูและสินค้า'
        ? (branchDirectory.find((branch) => Boolean(branch.franchiseeId))
            ?.name ?? 'แฟรนไชส์ทั้งหมด')
        : 'แฟรนไชส์ทั้งหมด'
      : undefined;
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
  const isIngredientPage =
    activePage === 'วัตถุดิบ' || activePage === 'วัตถุดิบของสด';
  const isFreshIngredientsPage = activePage === 'วัตถุดิบของสด';
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
  const centralCatalogPage =
    centralCatalogPages[activePage as keyof typeof centralCatalogPages];
  const activeNavigationKey = centralCatalogPage
    ? centralCatalogPage.navigation
    : isCatalogPage
      ? `${isFranchiseCatalogSelection ? 'franchise' : 'sbc'}-${
          activePage === 'เมนูและสินค้า'
            ? 'products'
            : activePage === 'วัตถุดิบ'
              ? 'ingredients'
              : activePage === 'วัตถุดิบของสด'
                ? 'fresh-ingredients'
                : activePage === 'สต๊อกอุปกรณ์เครื่องดื่ม'
                  ? 'drink-stock'
                  : 'postal-stock'
        }`
      : activePage;
  const catalogBranchCodes = useMemo(
    () => ({
      ...branchCodeByBranch,
      ...Object.fromEntries(
        branchDirectory.map((branch) => [branch.name, branch.code]),
      ),
      ...(activePage === 'เมนูและสินค้า' &&
      branchDirectory.some(
        (branch) =>
          branch.name === selectedBranch &&
          branch.code === searchParams.get('branchCode'),
      )
        ? { [selectedBranch]: searchParams.get('branchCode') as string }
        : {}),
    }),
    [activePage, branchDirectory, searchParams, selectedBranch],
  );
  const sbcBranchOptions = useMemo(
    () =>
      branchDirectory
        .filter((branch) => !branch.franchiseeId)
        .map((branch) => branch.name),
    [branchDirectory],
  );
  const catalogBranchOptions = useMemo(
    () => [
      'ทุกสาขา',
      ...(selectedBranch === 'แฟรนไชส์ทั้งหมด'
        ? franchiseBranchOptions
        : sbcBranchOptions),
    ],
    [franchiseBranchOptions, sbcBranchOptions, selectedBranch],
  );
  const pageContent = isIngredientPage ? (
    <AdminIngredientsPage
      activeBranch={activeBranch}
      branchOptions={catalogBranchOptions}
      branchCodes={catalogBranchCodes}
      ingredientScope={isFreshIngredientsPage ? 'fresh' : 'regular'}
      readOnly
      allowEditing
      cardColumns={5}
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
  ) : activePage === 'โปรโมชั่น' ? (
    <PromotionsManagementPage mode="admin" />
  ) : activePage === 'ประวัติการทำรายการ' ? (
    <AdminAuditPage />
  ) : activePage === 'เอกสารส่วนกลาง' ? (
    <CompanyDocumentsPage />
  ) : centralCatalogPage ? (
    <AdminCentralCatalogPage section={centralCatalogPage.section} />
  ) : isStockPage ? (
    <AdminStockPage
      activeBranch={activeBranch}
      stockCategory="drink_equipment"
      stockLabel="สต๊อกอุปกรณ์เครื่องดื่ม"
      branchOptions={catalogBranchOptions}
      branchCodes={catalogBranchCodes}
      readOnly
      allowEditing
      cardColumns={5}
    />
  ) : isPostalStockPage ? (
    <AdminStockPage
      activeBranch={activeBranch}
      stockCategory="postal_equipment"
      stockLabel="สต๊อกอุปกรณ์ไปรษณีย์"
      branchOptions={catalogBranchOptions}
      branchCodes={catalogBranchCodes}
      readOnly
      allowEditing
      cardColumns={5}
    />
  ) : activePage === 'เมนูและสินค้า' ? (
    <AdminProductsPage
      activeBranch={activeBranch}
      branchOptions={catalogBranchOptions}
      branchCodes={catalogBranchCodes}
      summaryScope={isFranchiseCatalogSelection ? 'franchise' : 'sbc'}
      onSelectBranch={(branch, branchCode) =>
        setSearchParams((current) => {
          current.set('branch', branch);
          current.set('branchCode', branchCode);
          return current;
        })
      }
      readOnly
      cardColumns={5}
    />
  ) : activePage === 'สาขาแฟรนไชส์' ? (
    <AdminFranchiseBranchesPage />
  ) : activePage === 'ตารางพนักงาน' ? (
    <AdminEmployeesPage />
  ) : activePage === 'ลงเวลาพนักงาน' ? (
    <AdminAttendancePage />
  ) : activePage === 'คำขอลาพนักงาน' ? (
    <AdminLeaveRequestsPage />
  ) : activePage === 'ตรวจมาตรฐานและบริการ' ? (
    <AdminOperationsPage />
  ) : (
    <AdminBranchesPage />
  );
  const pageTitle = isIngredientPage
    ? activeBranch === 'ทุกสาขา'
      ? selectedBranch === 'แฟรนไชส์ทั้งหมด'
        ? `${isFreshIngredientsPage ? 'วัตถุดิบของสด' : 'วัตถุดิบ'} ทุกแฟรนไชส์`
        : `${isFreshIngredientsPage ? 'วัตถุดิบของสด' : 'วัตถุดิบ'} ทุกสาขา`
      : `${isFreshIngredientsPage ? 'วัตถุดิบของสด' : 'วัตถุดิบ'} สาขา${activeBranch}`
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
                if (branch === 'ทุกสาขา' && activePage !== 'เมนูและสินค้า')
                  current.delete('branch');
                else current.set('branch', branch);
                current.delete('branchCode');
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
