import { secured } from './client';

export type CatalogTemplateSize = 'S' | 'M' | 'L';

export type CatalogTemplateSummary = {
  id: number;
  scope: 'central';
  size: 'ALL';
  name: string;
  description: string;
  inventoryCount: number;
  menuCount: number;
  branchCount: number;
};

export type CatalogTemplateInventoryItem = {
  id: number;
  name: string;
  imageUrl?: string;
  category: string;
  stockCategory?: string;
  kind?: 'ingredient' | 'stock';
  unit: string;
  unitCost: number;
  reorderLevel: number;
  trackStock?: boolean;
  availableSizes: CatalogTemplateSize[];
};

export type CatalogTemplateMenuItem = {
  id: number;
  name: string;
  imageUrl?: string;
  category: string;
  storePrice: number;
  linemanPrice: number;
  costPrice?: number;
  linemanCostPrice?: number;
  status?: 'available' | 'soldout';
  recipes: CatalogTemplateRecipe[];
  availableSizes: CatalogTemplateSize[];
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
  imageUrl?: string;
  stockCategory?: string;
  kind: 'ingredient' | 'stock';
  unit: string;
  unitCost: number;
  reorderLevel: number;
  trackStock: boolean;
  availableSizes: CatalogTemplateSize[];
};

export type CatalogTemplateInventoryCreate = CatalogTemplateInventoryPatch & {
  name: string;
};

export type CatalogTemplateMenuPatch = {
  category: string;
  storePrice: number;
  linemanPrice: number;
  costPrice?: number;
  linemanCostPrice?: number;
  imageUrl?: string;
  status: 'available' | 'soldout';
  availableSizes: CatalogTemplateSize[];
};

export type CatalogTemplateMenuCreate = CatalogTemplateMenuPatch & {
  name: string;
};

export type CatalogTemplateRecipePatch = Omit<CatalogTemplateRecipe, 'name'>;

const templatePath = (templateId: number) => `/catalog-templates/${templateId}`;

export const listCatalogTemplates = () =>
  secured<CatalogTemplateSummary[]>('/catalog-templates');

export type BranchCatalogSelection = {
  entityType: 'inventory' | 'menu';
  sourceKey: number;
  enabled: boolean;
};

export const listBranchCatalogSelections = (branchId: number) =>
  secured<BranchCatalogSelection[]>(`/branches/${branchId}/catalog-selections`);

export const setBranchCatalogSelection = (
  branchId: number,
  entityType: BranchCatalogSelection['entityType'],
  sourceKey: number,
  enabled: boolean,
) =>
  secured<BranchCatalogSelection>(
    `/branches/${branchId}/catalog-selections/${entityType}/${sourceKey}`,
    { method: 'PUT', data: { enabled } },
  );

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
