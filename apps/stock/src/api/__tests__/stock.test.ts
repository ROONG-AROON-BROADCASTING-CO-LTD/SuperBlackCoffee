import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  adjustInventory,
  createStockRequest,
  listInventory,
  listMenuItems,
  listMyStockMovements,
  loginStock,
  logoutStock,
  restoreStockSession,
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
});
