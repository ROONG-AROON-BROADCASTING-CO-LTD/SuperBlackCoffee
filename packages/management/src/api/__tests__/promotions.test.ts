import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createPromotion,
  listPromotionMenus,
  listPromotions,
} from '../promotions';

const response = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' },
  });

describe('promotion API client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(['admin', 'franchise_owner', 'stock'] as const)(
    'pins promotion requests to the %s session when multiple app cookies exist',
    async (role) => {
      const fetch = vi.fn().mockResolvedValue(response([]));
      vi.stubGlobal('fetch', fetch);
      await listPromotions(role);
      const options = fetch.mock.calls[0][1];
      expect(new Headers(options.headers).get('X-SBC-Session-Role')).toBe(role);
      expect(options.credentials).toBe('include');
    },
  );

  it('normalizes stored campaign dates returned by the API', async () => {
    const fetch = vi.fn().mockResolvedValue(
      response([
        {
          id: 1,
          name: 'วันเกิด',
          type: 'สมาชิก',
          benefit: 'ฟรี 1 แก้ว',
          status: 'active',
          imageUrl: '',
          channels: [],
          eligibility: '',
          startsOn: '2026-10-10T00:00:00Z',
          endsOn: null,
          terms: [],
          usage: 0,
          branches: [],
          menuItems: [],
        },
      ]),
    );
    vi.stubGlobal('fetch', fetch);

    await expect(listPromotions()).resolves.toMatchObject([
      { startsOn: '2026-10-10', endsOn: null },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/promotions$/),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('sends editable campaign values to the create endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue(
      response({
        id: 2,
        name: 'ลดค่าจัดส่ง',
        type: 'ออนไลน์',
        benefit: 'ลด 20 บาท',
        status: 'draft',
        imageUrl: '',
        channels: ['แอป'],
        eligibility: '',
        startsOn: null,
        endsOn: null,
        terms: [],
        usage: 0,
        branches: [],
        menuItems: [],
      }),
    );
    vi.stubGlobal('fetch', fetch);

    await createPromotion({
      name: 'ลดค่าจัดส่ง',
      type: 'ออนไลน์',
      benefit: 'ลด 20 บาท',
      status: 'draft',
      imageUrl: '',
      channels: ['แอป'],
      eligibility: '',
      startsOn: null,
      endsOn: null,
      terms: [],
      branchIds: [],
      menuItemIds: [11],
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/promotions$/),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('ลดค่าจัดส่ง'),
      }),
    );
  });

  it('maps the catalogue storefront price before the editor renders it', async () => {
    const fetch = vi.fn().mockResolvedValue(
      response([
        {
          id: 11,
          name: 'อเมริกาโน่เย็น',
          category: 'กาแฟ',
          storePrice: 65,
          imageUrl: '',
        },
      ]),
    );
    vi.stubGlobal('fetch', fetch);

    await expect(listPromotionMenus('TEST')).resolves.toEqual([
      {
        id: 11,
        name: 'อเมริกาโน่เย็น',
        category: 'กาแฟ',
        price: 65,
        imageUrl: '',
      },
    ]);
  });
});
