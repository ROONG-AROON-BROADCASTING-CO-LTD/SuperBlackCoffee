import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImgHTMLAttributes } from 'react';

vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    unoptimized: _unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    unoptimized?: boolean;
  }) => <img {...props} />,
}));
vi.mock('./WebsiteLanguageProvider', () => ({
  useWebsiteLanguage: () => ({
    text: (thai: string) => thai,
    isEnglish: false,
  }),
}));
vi.mock('./GoogleAnalytics', () => ({ trackEvent: vi.fn() }));
import { BranchesContent, MenuContent } from './BrandPagesRedesign';
import { branchPromotions } from './promotionData';

afterEach(cleanup);
describe('branch discovery and branch-specific menus', () => {
  it('filters by trimmed province and restores branches after an empty search', () => {
    render(<BranchesContent />);
    const search = screen.getByRole('textbox', { name: 'ค้นหาสาขา' });
    fireEvent.change(search, { target: { value: ' อยุธยา ' } });
    expect(screen.getByRole('heading', { name: 'อยุธยา' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'พิษณุโลก' }),
    ).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'no-such-province' } });
    expect(
      screen.getByText('ไม่พบสาขาที่ค้นหา ลองใช้ชื่อจังหวัดหรือชื่อสาขาอื่น'),
    ).toBeInTheDocument();
    fireEvent.change(search, { target: { value: '   ' } });
    expect(screen.getByRole('heading', { name: 'อยุธยา' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'พิษณุโลก' }),
    ).toBeInTheDocument();
  });

  it.each(['ayutthaya', 'phitsanulok'])(
    'shows only %s promotion artwork when its menu tab is selected',
    (slug) => {
      render(<MenuContent branchSlug={slug} />);
      const tabs = screen.getByRole('tablist', { name: 'ประเภทเมนู' });
      const promotionTab = within(tabs).getByRole('tab', { name: 'โปรโมชั่น' });
      fireEvent.click(promotionTab);
      expect(promotionTab).toHaveAttribute('aria-selected', 'true');
      const own = branchPromotions[slug].items;
      for (const item of own) {
        expect(screen.getByRole('img', { name: item.name })).toHaveAttribute(
          'src',
          item.image,
        );
        expect(
          screen.getByRole('heading', { name: item.name }),
        ).toBeInTheDocument();
      }
      const other = slug === 'ayutthaya' ? 'phitsanulok' : 'ayutthaya';
      for (const item of branchPromotions[other].items.filter(
        (item) => !own.some((ownItem) => ownItem.name === item.name),
      )) {
        expect(
          screen.queryByRole('img', { name: item.name }),
        ).not.toBeInTheDocument();
      }
      const first = within(tabs).getAllByRole('tab')[0];
      fireEvent.click(first);
      expect(first).toHaveAttribute('aria-selected', 'true');
      expect(promotionTab).toHaveAttribute('aria-selected', 'false');
      expect(
        screen.queryByRole('img', { name: own[0].name }),
      ).not.toBeInTheDocument();
    },
  );
});
