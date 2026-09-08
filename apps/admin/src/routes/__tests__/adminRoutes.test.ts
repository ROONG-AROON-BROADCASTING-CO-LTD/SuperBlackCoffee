import { describe, expect, it } from 'vitest';
import { adminPageFromPath, adminPagePaths } from '../adminRoutes';

describe('admin attendance route', () => {
  it.each(Object.entries(adminPagePaths))(
    'maps %s to its stable URL including a trailing slash',
    (page, path) => {
      expect(adminPageFromPath(path)).toBe(page);
      expect(adminPageFromPath(path === '/' ? path : `${path}/`)).toBe(page);
    },
  );

  it('falls back to the overview for an unknown route', () => {
    expect(adminPageFromPath('/not-found')).toBe('ภาพรวม');
  });
});
