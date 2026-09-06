import { describe, expect, it } from 'vitest';
import { adminPageFromPath, adminPagePaths } from '../adminRoutes';

describe('admin attendance route', () => {
  it('maps the attendance management menu to its stable URL', () => {
    expect(adminPagePaths.ลงเวลาพนักงาน).toBe('/attendance');
    expect(adminPageFromPath('/attendance')).toBe('ลงเวลาพนักงาน');
    expect(adminPageFromPath('/attendance/')).toBe('ลงเวลาพนักงาน');
  });
});
