import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnchorHTMLAttributes } from 'react';
import { WebsiteNav } from './WebsiteNavRedesign';
import { WebsiteLanguageProvider } from './WebsiteLanguageProvider';

const route = vi.hoisted(() => ({ pathname: '/menu' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));
vi.mock('next/image', () => ({ default: () => <span aria-hidden="true" /> }));
vi.mock('next/link', () => ({
  default: ({ onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    />
  ),
}));

function openPage() {
  return render(
    <WebsiteLanguageProvider initialLanguage="th" hasLanguageCookie>
      <main>
        <WebsiteNav />
        <section data-testid="content">
          <button>Background action</button>
        </section>
        <footer>Footer</footer>
      </main>
    </WebsiteLanguageProvider>,
  );
}

describe('website navigation interactions', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
    // jsdom has no layout; this is only the browser visibility boundary.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(
      function (this: HTMLElement) {
        return (this.closest(
          '.sb-topbar, .sb-nav-links, .sb-nav-action, .sb-nav-login',
        )
          ? []
          : [{}]) as unknown as DOMRectList;
      },
    );
    document.body.style.overflow = 'auto';
    route.pathname = '/menu';
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.style.overflow = '';
  });

  it('opens navigation without disabling the header and restores the page after Escape', () => {
    openPage();
    const toggle = screen.getByLabelText('เปิดเมนู');
    toggle.focus();
    fireEvent.click(toggle);
    const dialog = screen.getByLabelText('เมนูนำทาง');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(dialog).toHaveAttribute('id', toggle.getAttribute('aria-controls'));
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByTestId('content')).toHaveProperty('inert', true);
    expect(document.querySelector('main')).not.toHaveProperty('inert', true);
    expect(document.activeElement).toBe(dialog.querySelector('a'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
    expect(screen.getByTestId('content')).toHaveProperty('inert', undefined);
    expect(document.body.style.overflow).toBe('auto');
    expect(toggle).toHaveFocus();
  });

  it('closes after selecting a page and preserves its destination', () => {
    openPage();
    fireEvent.click(screen.getByLabelText('เปิดเมนู'));
    const branch = screen
      .getByRole('dialog', { hidden: true })
      .querySelector('a[href="/branches"]')!;
    expect(branch).toHaveAttribute('href', '/branches');
    fireEvent.click(branch);
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('keeps keyboard focus within navigation and closes when resizing to desktop', () => {
    openPage();
    fireEvent.click(screen.getByLabelText('เปิดเมนู'));
    const last = screen
      .getByRole('dialog', { hidden: true })
      .querySelector('a.sb-mobile-login') as HTMLElement;
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(document.querySelector('.sb-brand'));
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent(window, new Event('resize'));
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('restores prior background accessibility and scroll state when unmounted', () => {
    const view = openPage();
    screen.getByTestId('content').inert = true;
    fireEvent.click(screen.getByLabelText('เปิดเมนู'));
    const content = screen.getByTestId('content');
    view.unmount();
    expect(content.inert).toBe(true);
    expect(document.body.style.overflow).toBe('auto');
  });

  it('switches language without losing the selected page or closing navigation', () => {
    openPage();
    fireEvent.click(screen.getByLabelText('เปิดเมนู'));
    fireEvent.click(screen.getByRole('button', { name: 'เปลี่ยนภาษา' }));
    expect(screen.getByLabelText('Navigation menu')).toBeInTheDocument();
    expect(
      document.querySelector('.sb-mobile-nav a[href="/menu"]'),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      document.querySelector('.sb-mobile-nav a[href="/menu"]'),
    ).toHaveTextContent('Menu');
    expect(document.documentElement.lang).toBe('en');
  });
});
