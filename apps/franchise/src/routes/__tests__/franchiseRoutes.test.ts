import { describe, expect, it } from 'vitest';
import { franchisePageFromPath, franchisePagePaths } from '../franchiseRoutes';

describe('franchise attendance route', () => {
  it.each(Object.entries(franchisePagePaths))(
    'maps %s to its stable URL including a trailing slash',
    (page, path) => {
      expect(franchisePageFromPath(path)).toBe(page);
      expect(franchisePageFromPath(path === '/' ? path : `${path}/`)).toBe(
        page,
      );
    },
  );

  it('falls back to the overview for an unknown route', () => {
    expect(franchisePageFromPath('/not-found')).toBe('ภาพรวม');
  });
});
