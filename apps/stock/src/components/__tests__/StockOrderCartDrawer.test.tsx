import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => cleanup());
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

  it('drops a cost-only pending item instead of adding it to a branch order', () => {
    const onPendingItemAdded = vi.fn();
    render(
      <StockOrderCartDrawer
        open
        pendingItem={{
          ...ingredient,
          name: 'น้ำสกัดกาแฟ',
          status: 'cost_only',
        }}
        isFranchise={false}
        onOpenChange={vi.fn()}
        onPendingItemAdded={onPendingItemAdded}
        onItemCountChange={vi.fn()}
        onCreateRequest={vi.fn()}
      />,
    );

    expect(screen.queryByText('น้ำสกัดกาแฟ')).toBeNull();
    expect(onPendingItemAdded).toHaveBeenCalledOnce();
  });

  it('submits an external expense request without adding it to inventory', async () => {
    const onCreateExpenseRequest = vi.fn().mockResolvedValue(undefined);
    render(
      <StockOrderCartDrawer
        open
        pendingItem={null}
        isFranchise={false}
        onOpenChange={vi.fn()}
        onPendingItemAdded={vi.fn()}
        onItemCountChange={vi.fn()}
        onCreateRequest={vi.fn()}
        onCreateExpenseRequest={onCreateExpenseRequest}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'ขอเบิกค่าใช้จ่ายภายนอก' }),
    );
    const form = screen.getByRole('dialog', {
      name: 'ขอเบิกค่าใช้จ่ายภายนอก',
      hidden: true,
    });
    fireEvent.change(
      within(form).getByRole('textbox', { name: /ชื่อรายการ/, hidden: true }),
      {
        target: { value: 'ซ่อมเครื่องชงกาแฟ' },
      },
    );
    fireEvent.change(
      within(form).getByRole('spinbutton', {
        name: /ยอดประมาณการ/,
        hidden: true,
      }),
      {
        target: { value: '2500' },
      },
    );
    fireEvent.change(
      within(form).getByRole('textbox', { name: /รายละเอียด/, hidden: true }),
      {
        target: { value: 'แรงดันน้ำไม่คงที่' },
      },
    );
    fireEvent.click(
      within(form).getByRole('button', { name: 'ส่งคำขอ', hidden: true }),
    );

    await waitFor(() =>
      expect(onCreateExpenseRequest).toHaveBeenCalledWith({
        title: 'ซ่อมเครื่องชงกาแฟ',
        category: 'other',
        estimatedAmount: 2500,
        note: 'แรงดันน้ำไม่คงที่',
      }),
    );
  });
});
