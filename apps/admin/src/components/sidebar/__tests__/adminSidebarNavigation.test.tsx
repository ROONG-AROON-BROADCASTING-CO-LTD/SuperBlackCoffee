import { describe, expect, it } from 'vitest';
import { adminSidebarNavigation } from '../adminSidebarNavigation';

describe('adminSidebarNavigation', () => {
  it('places the central catalog before branch-specific SBC and franchise catalogs', () => {
    const centralCatalogIndex = adminSidebarNavigation.findIndex(
      (item) => item.id === 'central-menus',
    );
    const sbcCatalogIndex = adminSidebarNavigation.findIndex(
      (item) => item.id === 'sbc-products',
    );
    const franchiseCatalogIndex = adminSidebarNavigation.findIndex(
      (item) => item.id === 'franchise-products',
    );

    expect(adminSidebarNavigation[centralCatalogIndex]).toMatchObject({
      label: 'เมนูและสินค้า',
      group: 'สินค้าและคลังกลาง',
    });
    expect(centralCatalogIndex).toBeGreaterThanOrEqual(0);
    expect(centralCatalogIndex).toBeLessThan(sbcCatalogIndex);
    expect(centralCatalogIndex).toBeLessThan(franchiseCatalogIndex);
    expect(
      adminSidebarNavigation
        .filter((item) => item.group === 'สินค้าและคลังกลาง')
        .map((item) => item.id),
    ).toEqual([
      'central-menus',
      'central-ingredients',
      'central-fresh-ingredients',
      'central-drink-equipment',
      'central-postal-equipment',
      'central-branches',
      'central-sync',
    ]);
  });
});
