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
vi.mock('@stackbuild/management/pages/employees', () => ({
  EmployeesManagementPage: () => <div />,
}));
vi.mock('@stackbuild/management/pages/ingredients', () => ({
  IngredientsManagementPage: () => <div />,
}));
vi.mock('@stackbuild/management/pages/products', () => ({
  ProductsManagementPage: () => <div />,
}));
vi.mock('@stackbuild/management/pages/stock', () => ({
  StockManagementPage: () => <div />,
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
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('redirects a size S franchise away from postal stock opened by a direct URL', async () => {
    render(
      <MemoryRouter initialEntries={['/postal-stock']}>
        <FranchiseDashboard logout={vi.fn()} plan="S" />
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
        <FranchiseDashboard logout={vi.fn()} plan="M" />
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
});
