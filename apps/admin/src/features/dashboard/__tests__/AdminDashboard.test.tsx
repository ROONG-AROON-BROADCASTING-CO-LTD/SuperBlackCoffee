import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listBranches } from '../../../api/branches';
import { AdminDashboard } from '../AdminDashboard';

vi.mock('../../../api/branches', () => ({ listBranches: vi.fn() }));
vi.mock('../../../layouts/AdminDashboardLayout', () => ({
  AdminDashboardLayout: ({ children }: { children: React.ReactNode }) =>
    children,
}));
vi.mock('../../../pages/dashboard/management', () => ({
  EmployeesManagementPage: () => null,
  IngredientsManagementPage: () => null,
  StockManagementPage: () => null,
  ProductsManagementPage: (props: {
    activeBranch: string;
    summaryScope: string;
    branchCodes: Record<string, string>;
    excludedSummaryBranchCodes: string[];
    branchOptions: string[];
  }) => <output data-testid="catalog-scope">{JSON.stringify(props)}</output>,
}));
function CurrentURL() {
  const location = useLocation();
  return (
    <output data-testid="url">
      {location.pathname}
      {location.search}
    </output>
  );
}
function scope() {
  return JSON.parse(screen.getByTestId('catalog-scope').textContent ?? '{}');
}
function open(search: string) {
  render(
    <MemoryRouter initialEntries={[`/products${search}`]}>
      <AdminDashboard logout={vi.fn()} />
      <CurrentURL />
    </MemoryRouter>,
  );
}

describe('AdminDashboard catalog branch boundaries', () => {
  beforeEach(() => {
    vi.mocked(listBranches).mockResolvedValue([
      { id: 1, name: 'สำนักงานใหญ่', code: 'HQ', isHeadquarters: true },
      { id: 2, name: 'บริษัท', code: 'SBC-REAL', isHeadquarters: false },
      {
        id: 3,
        name: 'แฟรนไชส์',
        code: 'FR-REAL',
        franchiseeId: 10,
        isHeadquarters: false,
      },
    ] as Awaited<ReturnType<typeof listBranches>>);
  });
  afterEach(() => cleanup());

  it('resolves a selected branch from the directory instead of trusting a forged branchCode', async () => {
    open(`?branch=${encodeURIComponent('บริษัท')}&branchCode=FOREIGN`);
    await waitFor(() => expect(scope().branchCodes['บริษัท']).toBe('SBC-REAL'));
    expect(scope().activeBranch).toBe('บริษัท');
    expect(scope().summaryScope).toBe('sbc');
    expect(scope().excludedSummaryBranchCodes).toEqual(['HQ']);
    expect(scope().branchOptions).toEqual(['ทุกสาขา', 'บริษัท']);
  });

  it('removes headquarters from catalog scope without deleting unrelated query parameters', async () => {
    open(
      `?branch=${encodeURIComponent('สำนักงานใหญ่')}&branchCode=HQ&tab=keep`,
    );
    await waitFor(() =>
      expect(screen.getByTestId('url').textContent).toBe('/products?tab=keep'),
    );
    expect(scope().activeBranch).toBe('ทุกสาขา');
    expect(scope().branchOptions).not.toContain('สำนักงานใหญ่');
  });

  it('provides only franchise branches for the all-franchise catalog', async () => {
    open(`?branch=${encodeURIComponent('แฟรนไชส์ทั้งหมด')}`);
    await waitFor(() =>
      expect(scope().branchOptions).toEqual(['ทุกสาขา', 'แฟรนไชส์']),
    );
    expect(scope().summaryScope).toBe('franchise');
    expect(scope().activeBranch).toBe('ทุกสาขา');
    expect(scope().branchOptions).not.toContain('บริษัท');
  });
});
