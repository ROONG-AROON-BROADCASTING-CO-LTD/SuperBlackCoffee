import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FranchiseDashboard } from '../FranchiseDashboard';

vi.mock('@stackbuild/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@stackbuild/ui')>();
  return {
    ...actual,
    DashboardMain: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});
vi.mock('@stackbuild/management', () => ({
  AttendanceSkeleton: () => <div />,
  LeaveRequestsSkeleton: () => <div />,
}));
vi.mock('@stackbuild/management/skeletons/employees', () => ({
  EmployeesSkeleton: () => <div />,
}));
vi.mock('@stackbuild/management/skeletons/ingredients', () => ({
  IngredientsSkeleton: () => <div />,
}));
vi.mock('@stackbuild/management/skeletons/products', () => ({
  ProductsSkeleton: () => <div />,
}));
vi.mock('@stackbuild/management/skeletons/stock', () => ({
  StockSkeleton: () => <div />,
}));
vi.mock('@stackbuild/management/skeletons/promotions', () => ({
  PromotionsSkeleton: () => <div />,
}));
vi.mock('@stackbuild/management/pages/employees', () => ({
  EmployeesManagementPage: () => <div />,
}));
vi.mock('@stackbuild/management/pages/ingredients', () => ({
  IngredientsManagementPage: ({
    activeBranch,
    franchisePlan,
    readOnly,
    allowOrdering,
    ingredientScope,
    branchCodes,
  }: {
    activeBranch: string;
    franchisePlan: string;
    readOnly: boolean;
    allowOrdering: boolean;
    ingredientScope: string;
    branchCodes: Record<string, string>;
  }) => (
    <output data-testid="ingredients-page">
      {`${activeBranch}:${branchCodes[activeBranch]}:${franchisePlan}:${String(readOnly)}:${String(allowOrdering)}:${ingredientScope}`}
    </output>
  ),
}));
vi.mock('@stackbuild/management/pages/products', () => ({
  ProductsManagementPage: ({
    activeBranch,
    franchisePlan,
    readOnly,
    branchCodes,
  }: {
    activeBranch: string;
    franchisePlan: string;
    readOnly: boolean;
    branchCodes: Record<string, string>;
  }) => (
    <output data-testid="products-page">
      {`${activeBranch}:${branchCodes[activeBranch]}:${franchisePlan}:${String(readOnly)}`}
    </output>
  ),
}));
vi.mock('@stackbuild/management/pages/stock', () => ({
  StockManagementPage: ({
    activeBranch,
    readOnly,
    allowOrdering,
    stockCategory,
    branchCodes,
  }: {
    activeBranch: string;
    readOnly: boolean;
    allowOrdering?: boolean;
    stockCategory: string;
    branchCodes: Record<string, string>;
  }) => (
    <output data-testid="stock-page">
      {`${activeBranch}:${branchCodes[activeBranch]}:${String(readOnly)}:${String(allowOrdering ?? false)}:${stockCategory}`}
    </output>
  ),
}));
vi.mock('@stackbuild/management/pages/promotions', () => ({
  PromotionsManagementPage: ({
    mode,
    branchName,
  }: {
    mode: string;
    branchName: string;
  }) => (
    <output data-testid="promotions-page">{`${mode}:${branchName}`}</output>
  ),
}));
vi.mock('../../../layouts/FranchiseDashboardLayout', () => ({
  FranchiseDashboardLayout: ({
    activePage,
    children,
  }: {
    activePage: string;
    children: React.ReactNode;
  }) => (
    <>
      <output data-testid="active-page">{activePage}</output>
      {children}
    </>
  ),
}));
vi.mock('../../../pages/dashboard/FranchiseOverviewPage', () => ({
  FranchiseOverviewPage: () => <div>franchise-overview</div>,
}));

function CurrentPath() {
  return <output data-testid="current-path">{useLocation().pathname}</output>;
}

describe('FranchiseDashboard plan restrictions', () => {
  const branchProps = {
    branchName: 'สุพรรณบุรี S',
    branchCode: 'FR-SUP-001-S',
  };
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('redirects a size S franchise away from postal stock opened by a direct URL', async () => {
    render(
      <MemoryRouter initialEntries={['/postal-stock']}>
        <FranchiseDashboard logout={vi.fn()} plan="S" {...branchProps} />
        <CurrentPath />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('active-page').textContent).toBe('ภาพรวม');
    await waitFor(() =>
      expect(screen.getByTestId('current-path').textContent).toBe('/'),
    );
  });

  it('keeps postal stock available for a size M franchise', () => {
    render(
      <MemoryRouter initialEntries={['/postal-stock']}>
        <FranchiseDashboard logout={vi.fn()} plan="M" {...branchProps} />
        <CurrentPath />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('active-page').textContent).toBe(
      'สต๊อกอุปกรณ์ไปรษณีย์',
    );
    expect(screen.getByTestId('current-path').textContent).toBe(
      '/postal-stock',
    );
  });

  it('loads the promotion page with the franchise branch scope', async () => {
    render(
      <MemoryRouter initialEntries={['/promotions']}>
        <FranchiseDashboard logout={vi.fn()} plan="S" {...branchProps} />
      </MemoryRouter>,
    );

    expect((await screen.findByTestId('promotions-page')).textContent).toBe(
      'franchise:สุพรรณบุรี S',
    );
  });

  it.each([
    {
      path: '/products',
      plan: 'L' as const,
      page: 'products-page',
      scope: 'สุพรรณบุรี S:FR-SUP-001-S:L:true',
    },
    {
      path: '/ingredients',
      plan: 'M' as const,
      page: 'ingredients-page',
      scope: 'สุพรรณบุรี S:FR-SUP-001-S:M:true:true:regular',
    },
    {
      path: '/fresh-ingredients',
      plan: 'S' as const,
      page: 'ingredients-page',
      scope: 'สุพรรณบุรี S:FR-SUP-001-S:S:true:true:fresh',
    },
    {
      path: '/stock',
      plan: 'M' as const,
      page: 'stock-page',
      scope: 'สุพรรณบุรี S:FR-SUP-001-S:true:true:drink_equipment',
    },
    {
      path: '/postal-stock',
      plan: 'L' as const,
      page: 'stock-page',
      scope: 'สุพรรณบุรี S:FR-SUP-001-S:true:false:postal_equipment',
    },
  ])(
    'keeps $path branch-scoped and read-only for a franchise workspace',
    async ({ path, plan, page, scope }) => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <FranchiseDashboard logout={vi.fn()} plan={plan} {...branchProps} />
        </MemoryRouter>,
      );

      expect((await screen.findByTestId(page)).textContent).toBe(scope);
    },
  );
});
