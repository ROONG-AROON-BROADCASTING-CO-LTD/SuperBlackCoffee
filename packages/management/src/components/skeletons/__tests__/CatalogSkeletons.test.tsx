import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IngredientsSkeleton } from '../IngredientsSkeleton';
import { ProductsSkeleton } from '../ProductsSkeleton';
import { StockSkeleton } from '../StockSkeleton';
import { LeaveRequestsSkeleton } from '../LeaveRequestsSkeleton';

describe('management skeleton fidelity', () => {
  it.each([
    ['เมนูและสินค้า', <ProductsSkeleton readOnly cardColumns={5} />],
    ['วัตถุดิบ', <IngredientsSkeleton readOnly cardColumns={5} />],
    ['สต๊อก', <StockSkeleton readOnly cardColumns={5} />],
  ])('uses the five-column Admin card layout for %s', (label, skeleton) => {
    const { container } = render(skeleton);

    expect(screen.getByLabelText(`กำลังโหลด${label}`)).toBeTruthy();
    expect(container.querySelectorAll('.MuiCard-root')).toHaveLength(5);
  });

  it('mirrors both leave-request summary and list panels', () => {
    const { container } = render(<LeaveRequestsSkeleton />);

    expect(screen.getByLabelText('กำลังโหลดคำขอลาพนักงาน')).toBeTruthy();
    expect(container.querySelectorAll('.MuiPaper-root')).toHaveLength(2);
  });
});
