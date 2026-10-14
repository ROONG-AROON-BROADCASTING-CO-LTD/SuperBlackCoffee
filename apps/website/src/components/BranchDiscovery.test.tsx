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
    'keeps promotions out of the %s menu catalogue while category tabs still work',
    (slug) => {
      render(<MenuContent branchSlug={slug} />);
      const tabs = screen.getByRole('tablist', { name: 'ประเภทเมนู' });
      expect(
        within(tabs).queryByRole('tab', { name: 'โปรโมชั่น' }),
      ).not.toBeInTheDocument();
      const first = within(tabs).getAllByRole('tab')[0];
      const second = within(tabs).getAllByRole('tab')[1];
      fireEvent.click(first);
      expect(first).toHaveAttribute('aria-selected', 'true');
      fireEvent.click(second);
      expect(second).toHaveAttribute('aria-selected', 'true');
      expect(first).toHaveAttribute('aria-selected', 'false');
    },
  );
});
