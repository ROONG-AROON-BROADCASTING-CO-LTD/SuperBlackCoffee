import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, request } from '../client';
import { consumeStockFromMenus, listInventory } from '../stock';

describe('stock API client', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses the staff cookie and stock role header for inventory requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
      }),
    );

    await expect(listInventory('stock', 'drink_equipment')).resolves.toEqual(
      [],
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/inventory?kind=stock&stockCategory=drink_equipment',
      ),
      expect.objectContaining({ credentials: 'include' }),
    );
    const [, options] = fetchMock.mock.calls[0];
    expect(new Headers(options?.headers).get('X-SBC-Session-Role')).toBe(
      'stock',
    );
    expect(new Headers(options?.headers).get('Authorization')).toBeNull();
  });

  it('keeps the selected sales channel in the server-side consumption request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { menuCount: 1 } }), {
        status: 200,
      }),
    );

    await expect(
      consumeStockFromMenus(
        [{ menuItemId: 7, quantity: 2 }],
        'ปิดกะ',
        'lineman',
      ),
    ).resolves.toEqual({ menuCount: 1 });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/stock/consume'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          items: [{ menuItemId: 7, quantity: 2 }],
          note: 'ปิดกะ',
          channel: 'lineman',
        }),
      }),
    );
  });

  it('returns a useful error instead of a JSON parsing exception for a malformed response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('upstream route not found', { status: 404 }),
    );

    await expect(request('/inventory')).rejects.toEqual(
      expect.objectContaining({
        message: 'ระบบสต๊อกยังไม่พร้อมใช้งาน กรุณาแจ้งผู้ดูแลให้รีสตาร์ต API',
        status: 404,
      } satisfies Partial<ApiRequestError>),
    );
  });
});
