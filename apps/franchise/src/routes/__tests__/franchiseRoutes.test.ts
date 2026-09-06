import { describe, expect, it } from 'vitest';
import { franchisePageFromPath, franchisePagePaths } from '../franchiseRoutes';

describe('franchise attendance route', () => {
  it('maps the attendance management menu to its stable URL', () => {
    expect(franchisePagePaths.ลงเวลาพนักงาน).toBe('/attendance');
    expect(franchisePageFromPath('/attendance')).toBe('ลงเวลาพนักงาน');
  });
});
