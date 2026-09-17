import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StockOrderCartDrawer } from '../StockOrderCartDrawer';

const ingredient = {
  id: 1,
  name: 'เมล็ดกาแฟ',
  category: 'coffee',
  kind: 'ingredient' as const,
  quantity: 5,
  unit: 'ถุง',
  reorderLevel: 3,
  status: 'low' as const,
};

describe('StockOrderCartDrawer', () => {
  it('uses the main cart shell for a pending ingredient order', () => {
    const onPendingItemAdded = vi.fn();
    render(
      <StockOrderCartDrawer
        open
        pendingItem={ingredient}
        isFranchise={false}
        onOpenChange={vi.fn()}
        onPendingItemAdded={onPendingItemAdded}
        onItemCountChange={vi.fn()}
        onCreateRequest={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'วัตถุดิบ' })).toBeTruthy();
    expect(screen.getByText('เมล็ดกาแฟ')).toBeTruthy();
    expect(onPendingItemAdded).toHaveBeenCalledOnce();
  });
});
