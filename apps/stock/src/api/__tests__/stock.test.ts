import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  adjustInventory,
  createExpenseRequest,
  createStockRequest,
  consumeStockFromMenus,
  listInventory,
  listMenuItems,
  listMyStockMovements,
  loginStock,
  logoutStock,
  restoreStockSession,
  setupStockPIN,
} from '../stock';

describe('stock mutation API contracts', () => {
  afterEach(() => vi.restoreAllMocks());

  it('records a counted adjustment with its staff-entered reason', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, data: { id: 9, quantity: 12 } }),
          { status: 200 },
        ),
      );

    await expect(adjustInventory(9, 12, 'ตรวจนับสิ้นกะ')).resolves.toEqual({
      id: 9,
      quantity: 12,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/inventory/9/adjust'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ quantity: 12, note: 'ตรวจนับสิ้นกะ' }),
        credentials: 'include',
      }),
    );
  });

  it('uses the capped movement history and menu endpoints for the signed-in branch', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
        }),
      );

    await expect(listMyStockMovements()).resolves.toEqual([]);
    await expect(listMenuItems()).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/stock-movements?limit=100'),
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/menu-items'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('loads a stock category without allowing the client to select another branch', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
      }),
    );

    await expect(listInventory('stock', 'postal_equipment')).resolves.toEqual(
      [],
    );

    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain(
      '/inventory?kind=stock&stockCategory=postal_equipment',
    );
    expect(String(url)).not.toContain('branch');
    expect(new Headers(options?.headers).get('X-SBC-Session-Role')).toBe(
      'stock',
    );
  });

  it('submits an order request without letting stock staff choose another branch or destination', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { id: 15, status: 'pending' },
        }),
        { status: 201 },
      ),
    );

    await expect(
      createStockRequest({
        note: 'ขอเติมสินค้าเข้าสต๊อก',
        items: [
          {
            inventoryItemId: 8,
            name: 'นมสด',
            quantity: 2,
            unit: 'กล่อง',
          },
        ],
      }),
    ).resolves.toEqual({ id: 15, status: 'pending' });

    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('/stock-requests');
    expect(options?.method).toBe('POST');
    expect(options?.body).toBe(
      JSON.stringify({
        note: 'ขอเติมสินค้าเข้าสต๊อก',
        items: [
          {
            inventoryItemId: 8,
            name: 'นมสด',
            quantity: 2,
            unit: 'กล่อง',
          },
        ],
      }),
    );
    expect(String(options?.body)).not.toContain('branchId');
    expect(String(options?.body)).not.toContain('destination');
  });

  it('submits an external expense request on the stock session without a client-selected branch', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { id: 24, status: 'pending' } }),
        {
          status: 201,
        },
      ),
    );

    await expect(
      createExpenseRequest({
        title: 'ค่าซ่อมเครื่องชง',
        category: 'maintenance',
        estimatedAmount: 2500,
        note: 'ช่างประเมินราคา',
      }),
    ).resolves.toEqual({ id: 24, status: 'pending' });

    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('/expense-requests');
    expect(options?.method).toBe('POST');
    expect(options?.credentials).toBe('include');
    expect(JSON.parse(String(options?.body))).toEqual({
      title: 'ค่าซ่อมเครื่องชง',
      category: 'maintenance',
      estimatedAmount: 2500,
      note: 'ช่างประเมินราคา',
    });
    expect(String(options?.body)).not.toContain('branchId');
    expect(new Headers(options?.headers).get('X-SBC-Session-Role')).toBe(
      'stock',
    );
  });

  it('consumes menu stock for the selected channel without accepting a client branch', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { menuCount: 2, salesTotal: 150 },
        }),
        { status: 200 },
      ),
    );

    await expect(
      consumeStockFromMenus(
        [{ menuItemId: 12, quantity: 2, channel: 'lineman' }],
        'ขายผ่าน LINE MAN',
        'lineman',
      ),
    ).resolves.toEqual({ menuCount: 2, salesTotal: 150 });

    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('/stock/consume');
    expect(options?.method).toBe('POST');
    expect(options?.credentials).toBe('include');
    expect(JSON.parse(String(options?.body))).toEqual({
      items: [{ menuItemId: 12, quantity: 2, channel: 'lineman' }],
      note: 'ขายผ่าน LINE MAN',
      channel: 'lineman',
    });
    expect(String(options?.body)).not.toContain('branchId');
    expect(new Headers(options?.headers).get('X-SBC-Session-Role')).toBe(
      'stock',
    );
  });

  it('keeps stock login, session restoration, and logout on the dedicated cookie scope', async () => {
    const successResponse = () =>
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
      });
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(successResponse())
      .mockResolvedValueOnce(successResponse())
      .mockResolvedValueOnce(successResponse());

    await loginStock('cashier.aya', '123456');
    await restoreStockSession();
    await logoutStock();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/stock/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'cashier.aya', pin: '123456' }),
        credentials: 'include',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/stock/session'),
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/stock/logout'),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    for (const [, options] of fetchMock.mock.calls) {
      expect(new Headers(options?.headers).get('X-SBC-Session-Role')).toBe(
        'stock',
      );
    }
  });

  it('uses the dedicated endpoint to set a first-time Stock PIN', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
      }),
    );

    await setupStockPIN('new_stock_user', '123456');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/stock/setup-pin'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'new_stock_user', pin: '123456' }),
        credentials: 'include',
      }),
    );
  });
});
