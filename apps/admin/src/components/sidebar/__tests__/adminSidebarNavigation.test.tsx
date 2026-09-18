import { describe, expect, it } from 'vitest';
import { adminSidebarNavigation } from '../adminSidebarNavigation';

describe('adminSidebarNavigation', () => {
  it('places the central catalog before branch-specific SBC and franchise catalogs', () => {
    const centralCatalogIndex = adminSidebarNavigation.findIndex(
      (item) => item.id === 'central-catalog',
    );
    const sbcCatalogIndex = adminSidebarNavigation.findIndex(
      (item) => item.id === 'sbc-products',
    );
    const franchiseCatalogIndex = adminSidebarNavigation.findIndex(
      (item) => item.id === 'franchise-products',
    );

    expect(adminSidebarNavigation[centralCatalogIndex]).toMatchObject({
      label: 'สินค้าและคลังกลาง',
      group: 'สินค้าและคลังกลาง',
    });
    expect(centralCatalogIndex).toBeGreaterThanOrEqual(0);
    expect(centralCatalogIndex).toBeLessThan(sbcCatalogIndex);
    expect(centralCatalogIndex).toBeLessThan(franchiseCatalogIndex);
  });
});
