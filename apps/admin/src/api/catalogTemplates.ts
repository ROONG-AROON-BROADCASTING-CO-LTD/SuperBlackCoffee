import { secured } from './client';

export type CatalogTemplateScope = 'sbc' | 'franchise';
export type CatalogTemplateSize = 'S' | 'M' | 'L';

export type CatalogTemplateSummary = {
  id: number;
  scope: CatalogTemplateScope;
  size: CatalogTemplateSize;
  name: string;
  description: string;
  inventoryCount: number;
  menuCount: number;
  branchCount: number;
};

export type CatalogTemplateInventoryItem = {
  id: number;
  name: string;
  category: string;
  stockCategory?: string;
  kind?: 'ingredient' | 'stock';
  unit: string;
  unitCost: number;
  reorderLevel: number;
  trackStock?: boolean;
};

export type CatalogTemplateMenuItem = {
  id: number;
  name: string;
  category: string;
  storePrice: number;
  linemanPrice: number;
  status?: 'available' | 'soldout';
  recipes: CatalogTemplateRecipe[];
};

export type CatalogTemplateRecipe = {
  catalogItemId: number;
  name: string;
  channel: 'storefront' | 'lineman';
  quantity: number;
  unit: string;
  costAmount: number;
};

export type CatalogTemplate = CatalogTemplateSummary & {
  inventoryItems: CatalogTemplateInventoryItem[];
  menuItems: CatalogTemplateMenuItem[];
};

export type CatalogTemplateImpactBranch = {
  id: number;
  name: string;
  code: string;
  size: CatalogTemplateSize;
};

export type CatalogTemplateImpact = {
  template: CatalogTemplateSummary;
  branches: CatalogTemplateImpactBranch[];
  count: number;
};

export type CatalogTemplateSyncResult = {
  syncedBranches: number;
  template: CatalogTemplateSummary;
};

export type CatalogTemplateInventoryPatch = {
  category: string;
  stockCategory?: string;
  kind: 'ingredient' | 'stock';
  unit: string;
  unitCost: number;
  reorderLevel: number;
  trackStock: boolean;
};

export type CatalogTemplateInventoryCreate = CatalogTemplateInventoryPatch & {
  name: string;
};

export type CatalogTemplateMenuPatch = {
  category: string;
  storePrice: number;
  linemanPrice: number;
  status: 'available' | 'soldout';
};

export type CatalogTemplateMenuCreate = CatalogTemplateMenuPatch & {
  name: string;
};

export type CatalogTemplateRecipePatch = Omit<CatalogTemplateRecipe, 'name'>;

const templatePath = (templateId: number) => `/catalog-templates/${templateId}`;

export function listCatalogTemplates(
  scope: CatalogTemplateScope,
  size: CatalogTemplateSize,
) {
  const params = new URLSearchParams({ scope, size });
  return secured<CatalogTemplateSummary[]>(
    `/catalog-templates?${params.toString()}`,
  );
}

export const getCatalogTemplate = (templateId: number) =>
  secured<CatalogTemplate>(templatePath(templateId));

export const getCatalogTemplateImpact = (templateId: number) =>
  secured<CatalogTemplateImpact>(`${templatePath(templateId)}/impact`);

export const syncCatalogTemplate = (templateId: number, branchIds?: number[]) =>
  secured<CatalogTemplateSyncResult>(`${templatePath(templateId)}/sync`, {
    method: 'POST',
    data: branchIds?.length ? { branchIds } : {},
  });

export const updateCatalogTemplateInventoryItem = (
  templateId: number,
  catalogItemId: number,
  data: CatalogTemplateInventoryPatch,
) =>
  secured<{ id: number }>(
    `${templatePath(templateId)}/inventory/${catalogItemId}`,
    { method: 'PATCH', data },
  );

export const createCatalogTemplateInventoryItem = (
  templateId: number,
  data: CatalogTemplateInventoryCreate,
) =>
  secured<{ id: number }>(`${templatePath(templateId)}/inventory`, {
    method: 'POST',
    data,
  });

export const updateCatalogTemplateMenuItem = (
  templateId: number,
  menuItemId: number,
  data: CatalogTemplateMenuPatch,
) =>
  secured<{ id: number }>(
    `${templatePath(templateId)}/menu-items/${menuItemId}`,
    {
      method: 'PATCH',
      data,
    },
  );

export const createCatalogTemplateMenuItem = (
  templateId: number,
  data: CatalogTemplateMenuCreate,
) =>
  secured<{ id: number }>(`${templatePath(templateId)}/menu-items`, {
    method: 'POST',
    data,
  });

export const replaceCatalogTemplateMenuRecipes = (
  templateId: number,
  menuItemId: number,
  recipes: CatalogTemplateRecipePatch[],
) =>
  secured<{ id: number; recipeCount: number }>(
    `${templatePath(templateId)}/menu-items/${menuItemId}/recipes`,
    { method: 'PUT', data: { recipes } },
  );

export const retireCatalogTemplateInventoryItem = (
  templateId: number,
  catalogItemId: number,
) =>
  secured<{ id: number; retired: boolean }>(
    `${templatePath(templateId)}/inventory/${catalogItemId}`,
    { method: 'DELETE' },
  );

export const retireCatalogTemplateMenuItem = (
  templateId: number,
  menuItemId: number,
) =>
  secured<{ id: number; retired: boolean }>(
    `${templatePath(templateId)}/menu-items/${menuItemId}`,
    { method: 'DELETE' },
  );
