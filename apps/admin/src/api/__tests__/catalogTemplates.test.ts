import { afterEach, describe, expect, it, vi } from 'vitest';

const secured = vi.hoisted(() => vi.fn());

vi.mock('../client', () => ({ secured }));

import {
  createCatalogTemplateInventoryItem,
  createCatalogTemplateMenuItem,
  getCatalogTemplate,
  getCatalogTemplateImpact,
  listCatalogTemplates,
  listBranchCatalogSelections,
  setBranchCatalogSelection,
  replaceCatalogTemplateMenuRecipes,
  retireCatalogTemplateInventoryItem,
  retireCatalogTemplateMenuItem,
  syncCatalogTemplate,
  updateCatalogTemplateInventoryItem,
  updateCatalogTemplateMenuItem,
} from '../catalogTemplates';

describe('admin central catalog API', () => {
  afterEach(() => vi.clearAllMocks());

  it('loads one shared central catalog without business type or size scope', async () => {
    secured.mockResolvedValueOnce([]);

    await expect(listCatalogTemplates()).resolves.toEqual([]);
    expect(secured).toHaveBeenCalledWith('/catalog-templates');
  });

  it('uses protected detail, impact, and explicit sync endpoints', async () => {
    secured
      .mockResolvedValueOnce({ id: 7 })
      .mockResolvedValueOnce({ count: 2, branches: [] })
      .mockResolvedValueOnce({ syncedBranches: 2 });

    await getCatalogTemplate(7);
    await getCatalogTemplateImpact(7);
    await syncCatalogTemplate(7, [11, 12]);

    expect(secured).toHaveBeenNthCalledWith(1, '/catalog-templates/7');
    expect(secured).toHaveBeenNthCalledWith(2, '/catalog-templates/7/impact');
    expect(secured).toHaveBeenNthCalledWith(3, '/catalog-templates/7/sync', {
      method: 'POST',
      data: { branchIds: [11, 12] },
    });
  });

  it('keeps central edits scoped to a single template item before an explicit sync', async () => {
    secured.mockResolvedValueOnce({ id: 6 }).mockResolvedValueOnce({ id: 8 });

    await updateCatalogTemplateInventoryItem(7, 6, {
      name: 'เมล็ดกาแฟใหม่',
      category: 'กาแฟ',
      kind: 'ingredient',
      unit: 'กรัม',
      unitCost: 0.5,
      reorderLevel: 20,
      trackStock: true,
      availableSizes: ['S', 'M'],
    });
    await updateCatalogTemplateMenuItem(7, 8, {
      name: 'อเมริกาโน่ใหม่',
      category: 'กาแฟ',
      storePrice: 80,
      linemanPrice: 90,
      status: 'available',
      availableSizes: ['S', 'M'],
    });

    expect(secured).toHaveBeenNthCalledWith(
      1,
      '/catalog-templates/7/inventory/6',
      {
        method: 'PATCH',
        data: {
          name: 'เมล็ดกาแฟใหม่',
          category: 'กาแฟ',
          kind: 'ingredient',
          unit: 'กรัม',
          unitCost: 0.5,
          reorderLevel: 20,
          trackStock: true,
          availableSizes: ['S', 'M'],
        },
      },
    );
    expect(secured).toHaveBeenNthCalledWith(
      2,
      '/catalog-templates/7/menu-items/8',
      {
        method: 'PATCH',
        data: {
          name: 'อเมริกาโน่ใหม่',
          category: 'กาแฟ',
          storePrice: 80,
          linemanPrice: 90,
          status: 'available',
          availableSizes: ['S', 'M'],
        },
      },
    );
  });

  it('creates new inventory and menu rows in the selected template only', async () => {
    secured.mockResolvedValueOnce({ id: 6 }).mockResolvedValueOnce({ id: 8 });

    await createCatalogTemplateInventoryItem(7, {
      name: 'เมล็ดกาแฟใหม่',
      category: 'กาแฟ',
      kind: 'ingredient',
      unit: 'กรัม',
      unitCost: 0.5,
      reorderLevel: 20,
      trackStock: true,
      availableSizes: ['S', 'M'],
    });
    await createCatalogTemplateMenuItem(7, {
      name: 'อเมริกาโน่ใหม่',
      category: 'กาแฟ',
      storePrice: 80,
      linemanPrice: 90,
      status: 'available',
      availableSizes: ['S', 'M'],
    });

    expect(secured).toHaveBeenNthCalledWith(
      1,
      '/catalog-templates/7/inventory',
      {
        method: 'POST',
        data: expect.objectContaining({ name: 'เมล็ดกาแฟใหม่' }),
      },
    );
    expect(secured).toHaveBeenNthCalledWith(
      2,
      '/catalog-templates/7/menu-items',
      {
        method: 'POST',
        data: expect.objectContaining({ name: 'อเมริกาโน่ใหม่' }),
      },
    );
  });

  it('loads and changes a branch selection without deleting its stock', async () => {
    secured.mockResolvedValueOnce([]).mockResolvedValueOnce({
      entityType: 'inventory',
      sourceKey: 6,
      enabled: false,
    });
    await listBranchCatalogSelections(11);
    await setBranchCatalogSelection(11, 'inventory', 6, false);
    expect(secured).toHaveBeenNthCalledWith(
      1,
      '/branches/11/catalog-selections',
    );
    expect(secured).toHaveBeenNthCalledWith(
      2,
      '/branches/11/catalog-selections/inventory/6',
      { method: 'PUT', data: { enabled: false } },
    );
  });

  it('retires template rows without calling a branch delete endpoint', async () => {
    secured
      .mockResolvedValueOnce({ id: 6, retired: true })
      .mockResolvedValueOnce({ id: 8, retired: true });

    await retireCatalogTemplateInventoryItem(7, 6);
    await retireCatalogTemplateMenuItem(7, 8);

    expect(secured).toHaveBeenNthCalledWith(
      1,
      '/catalog-templates/7/inventory/6',
      { method: 'DELETE' },
    );
    expect(secured).toHaveBeenNthCalledWith(
      2,
      '/catalog-templates/7/menu-items/8',
      { method: 'DELETE' },
    );
  });

  it('replaces a central recipe only through the explicit recipe endpoint', async () => {
    secured.mockResolvedValueOnce({ id: 8, recipeCount: 1 });

    await replaceCatalogTemplateMenuRecipes(7, 8, [
      {
        catalogItemId: 6,
        channel: 'storefront',
        quantity: 18,
        unit: 'กรัม',
        costAmount: 9,
      },
    ]);

    expect(secured).toHaveBeenCalledWith(
      '/catalog-templates/7/menu-items/8/recipes',
      {
        method: 'PUT',
        data: {
          recipes: [
            {
              catalogItemId: 6,
              channel: 'storefront',
              quantity: 18,
              unit: 'กรัม',
              costAmount: 9,
            },
          ],
        },
      },
    );
  });
});
