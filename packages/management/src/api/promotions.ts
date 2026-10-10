type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

export type PromotionStatus = 'draft' | 'active' | 'paused' | 'expired';
export type PromotionMenu = {
  id: number;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
};
export type PromotionBranch = { id: number; name: string; code: string };
export type Promotion = {
  id: number;
  name: string;
  type: string;
  benefit: string;
  status: PromotionStatus;
  imageUrl: string;
  channels: string[];
  eligibility: string;
  startsOn: string | null;
  endsOn: string | null;
  terms: string[];
  usage: number;
  branches: PromotionBranch[];
  menuItems: PromotionMenu[];
};
export type PromotionInput = Omit<
  Promotion,
  'id' | 'usage' | 'branches' | 'menuItems'
> & {
  branchIds: number[];
  menuItemIds: number[];
};
export type BranchOption = { id: number; name: string; code: string };

type MenuCatalogItem = Omit<PromotionMenu, 'price'> & {
  // The catalogue endpoint exposes the storefront price, while a promotion
  // response exposes the same value as `price`.
  price?: number;
  storePrice?: number;
};

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.success)
    throw new Error(payload.message ?? 'ไม่สามารถบันทึกโปรโมชั่นได้');
  return payload.data;
}

const statuses = new Set<PromotionStatus>([
  'draft',
  'active',
  'paused',
  'expired',
]);

const normalizeMenu = (menu: MenuCatalogItem): PromotionMenu => ({
  id: Number(menu.id),
  name: String(menu.name ?? ''),
  category: String(menu.category ?? ''),
  price: Number.isFinite(menu.price)
    ? Number(menu.price)
    : Number(menu.storePrice) || 0,
  imageUrl: String(menu.imageUrl ?? ''),
});

const normalizePromotion = (promotion: Promotion): Promotion => ({
  ...promotion,
  id: Number(promotion.id),
  name: String(promotion.name ?? ''),
  type: String(promotion.type ?? ''),
  benefit: String(promotion.benefit ?? ''),
  status: statuses.has(promotion.status) ? promotion.status : 'draft',
  imageUrl: String(promotion.imageUrl ?? ''),
  channels: Array.isArray(promotion.channels) ? promotion.channels : [],
  eligibility: String(promotion.eligibility ?? ''),
  startsOn: promotion.startsOn?.slice(0, 10) ?? null,
  endsOn: promotion.endsOn?.slice(0, 10) ?? null,
  terms: Array.isArray(promotion.terms) ? promotion.terms : [],
  usage: Number(promotion.usage) || 0,
  branches: Array.isArray(promotion.branches) ? promotion.branches : [],
  menuItems: Array.isArray(promotion.menuItems)
    ? promotion.menuItems.map(normalizeMenu)
    : [],
});

export const listPromotions = async () =>
  (await request<Promotion[]>('/promotions')).map(normalizePromotion);
export const listPromotionBranches = () => request<BranchOption[]>('/branches');
export const listPromotionMenus = async (branchCode: string) =>
  (
    await request<MenuCatalogItem[]>(
      `/menu-items?branchCode=${encodeURIComponent(branchCode)}`,
    )
  ).map(normalizeMenu);
export const createPromotion = async (input: PromotionInput) =>
  normalizePromotion(
    await request<Promotion>('/promotions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
export const updatePromotion = async (id: number, input: PromotionInput) =>
  normalizePromotion(
    await request<Promotion>(`/promotions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  );
export const deletePromotion = (id: number) =>
  request<void>(`/promotions/${id}`, { method: 'DELETE' });
