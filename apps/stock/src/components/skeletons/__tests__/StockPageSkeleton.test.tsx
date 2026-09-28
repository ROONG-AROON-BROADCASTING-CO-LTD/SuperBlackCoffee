import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StockPageSkeleton } from '../StockPageSkeleton';

afterEach(cleanup);

describe('StockPageSkeleton', () => {
  it.each(['sales', 'count', 'promotions'] as const)(
    'keeps the %s loading cards in the same two-column grid as the page',
    (page) => {
      const { container } = render(<StockPageSkeleton page={page} />);
      const cards = container.querySelectorAll('.MuiCard-root');

      expect(cards).toHaveLength(6);
      expect(
        container.querySelectorAll('.MuiCard-root .MuiSkeleton-root'),
      ).not.toHaveLength(0);
      expect(screen.getByLabelText('กำลังโหลดข้อมูลสต๊อก')).toBeTruthy();
    },
  );

  it('includes the sales tabs, search and Excel import block', () => {
    const { container } = render(<StockPageSkeleton page="sales" />);

    expect(
      container.querySelectorAll('.MuiPaper-root:not(.MuiCard-root)'),
    ).toHaveLength(2);
    expect(container.querySelectorAll('.MuiCard-root')).toHaveLength(6);
  });

  it('includes both stock-count actions in each card', () => {
    const { container } = render(<StockPageSkeleton page="count" />);

    expect(
      container
        .querySelectorAll('.MuiCard-root')[0]
        .querySelectorAll('.MuiSkeleton-root'),
    ).toHaveLength(6);
  });

  it('keeps history as movement rows instead of product cards', () => {
    const { container } = render(<StockPageSkeleton page="history" />);

    expect(screen.getByLabelText('กำลังโหลดประวัติสต๊อก')).toBeTruthy();
    expect(container.querySelectorAll('.MuiCard-root')).toHaveLength(0);
    expect(container.querySelectorAll('.MuiPaper-root')).toHaveLength(4);
  });
});
