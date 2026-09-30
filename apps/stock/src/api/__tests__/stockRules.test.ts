import { describe, expect, it } from 'vitest';
import { isCountableStockItem, isStockSession } from '../stock';

describe('stock authorization and counting rules', () => {
  it.each([
    [
      {
        user: {
          id: 7,
          branchId: 3,
          branchName: 'อยุธยา',
          role: 'cashier',
          isFranchise: false,
        },
      },
      true,
    ],
    [{ user: { name: 'พนักงาน' } }, false],
    [{ user: { id: 7, branchId: 3 } }, false],
  ] as const)(
    'recognizes a complete stock session but not a PIN or staff challenge',
    (result, expected) => {
      expect(
        isStockSession(result as Parameters<typeof isStockSession>[0]),
      ).toBe(expected);
    },
  );

  it.each([
    [{ status: 'ready', trackStock: true }, true],
    [{ status: 'low' }, true],
    [{ status: 'cost_only' }, false],
    [{ status: 'ready', trackStock: false }, false],
    [{ status: 'cost_only', trackStock: true }, false],
  ] as const)(
    'excludes non-stock recipe costs from count and order flows',
    (item, expected) => {
      expect(isCountableStockItem(item)).toBe(expected);
    },
  );
});
