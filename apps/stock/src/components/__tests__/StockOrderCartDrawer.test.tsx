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
  it('disables repeat submissions while the request is pending', async () => {
    let finish!: () => void;
    const create = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const close = vi.fn();
    render(
      <StockOrderCartDrawer
        open
        pendingItem={ingredient}
        isFranchise={false}
        onOpenChange={close}
        onPendingItemAdded={vi.fn()}
        onItemCountChange={vi.fn()}
        onCreateRequest={create}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำสั่งซื้อ' }));
    const sending = screen.getByRole('button', { name: 'กำลังส่งคำสั่งซื้อ…' });
    expect((sending as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(sending);
    expect(create).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    finish();
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
  });
  it('retains an order after failure and clears it only after a successful retry', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(undefined);
    const close = vi.fn();
    const count = vi.fn();
    render(
      <StockOrderCartDrawer
        open
        pendingItem={ingredient}
        isFranchise={false}
        onOpenChange={close}
        onPendingItemAdded={vi.fn()}
        onItemCountChange={count}
        onCreateRequest={create}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'เพิ่มจำนวน เมล็ดกาแฟ' }),
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'หมายเหตุ' }), {
      target: { value: '  urgent stock  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำสั่งซื้อ' }));
    await screen.findByText('Network unavailable');
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByText('เมล็ดกาแฟ')).toBeTruthy();
    expect(create).toHaveBeenNthCalledWith(
      1,
      [{ inventoryItemId: 1, name: 'เมล็ดกาแฟ', quantity: 2, unit: 'ถุง' }],
      'urgent stock',
    );
    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำสั่งซื้อ' }));
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    expect(create).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('เมล็ดกาแฟ')).toBeNull();
    await waitFor(() => expect(count).toHaveBeenLastCalledWith(0));
  });

  it('rejects whitespace-only notes without creating an order', async () => {
    const create = vi.fn();
    render(
      <StockOrderCartDrawer
        open
        pendingItem={ingredient}
        isFranchise={false}
        onOpenChange={vi.fn()}
        onPendingItemAdded={vi.fn()}
        onItemCountChange={vi.fn()}
        onCreateRequest={create}
      />,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'หมายเหตุ' }), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำสั่งซื้อ' }));
    await screen.findByText('ระบุหมายเหตุสำหรับคำสั่งซื้อ');
    expect(create).not.toHaveBeenCalled();
  });
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
