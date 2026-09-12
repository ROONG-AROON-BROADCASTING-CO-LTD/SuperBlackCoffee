import { describe, expect, it } from 'vitest';
import { navigation, navigationForPlan } from './franchiseSidebarNavigation';

describe('franchise sidebar navigation', () => {
  it('hides postal stock for size S while retaining drink equipment stock', () => {
    const labels = navigationForPlan('S').map((item) => item.label);

    expect(labels).toContain('สต๊อกอุปกรณ์เครื่องดื่ม');
    expect(labels).not.toContain('สต๊อกอุปกรณ์ไปรษณีย์');
  });

  it.each(['M', 'L'] as const)(
    'keeps both equipment stock pages available for size %s',
    (plan) => {
      const labels = navigationForPlan(plan).map((item) => item.label);

      expect(labels).toContain('สต๊อกอุปกรณ์เครื่องดื่ม');
      expect(labels).toContain('สต๊อกอุปกรณ์ไปรษณีย์');
    },
  );

  it('returns a fresh navigation list so one render cannot mutate another', () => {
    const visibleNavigation = navigationForPlan('S');
    visibleNavigation.pop();

    expect(navigationForPlan('S')).toHaveLength(navigation.length - 1);
  });
});
