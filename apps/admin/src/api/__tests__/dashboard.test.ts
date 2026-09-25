import { afterEach, describe, expect, it, vi } from 'vitest';

const secured = vi.hoisted(() => vi.fn());

vi.mock('../client', () => ({ secured }));

import {
  getDashboardSummary,
  getDashboardTrend,
  getSalesTrend,
  getTopSellingMenus,
} from '../dashboard';

describe('dashboard API', () => {
  afterEach(() => vi.clearAllMocks());

  it('requests the all-branch summary without a branch query parameter', () => {
    getDashboardSummary();

    expect(secured).toHaveBeenCalledWith('/dashboard');
  });

  it('encodes the selected branch in summary and trend requests', () => {
    getDashboardSummary('SBC AYA/01', 'sbc');
    getDashboardTrend('month', 'SBC AYA/01');

    expect(secured).toHaveBeenNthCalledWith(
      1,
      '/dashboard?branchCode=SBC+AYA%2F01&scope=sbc',
    );
    expect(secured).toHaveBeenNthCalledWith(
      2,
      '/dashboard/trend?period=month&branchCode=SBC+AYA%2F01',
    );
  });

  it('adds the requested reporting scope to aggregate dashboard requests', () => {
    getDashboardSummary(undefined, 'franchise');

    expect(secured).toHaveBeenCalledWith('/dashboard?scope=franchise');
  });

  it('keeps aggregate sales separate from branch-scoped top-menu requests', () => {
    getSalesTrend('year');
    getTopSellingMenus('SBC AYA/01');

    expect(secured).toHaveBeenNthCalledWith(
      1,
      '/dashboard/sales-trend?period=year',
    );
    expect(secured).toHaveBeenNthCalledWith(
      2,
      '/dashboard/top-menus?period=today&branchCode=SBC+AYA%2F01',
    );
  });
});
