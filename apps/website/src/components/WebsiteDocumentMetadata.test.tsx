import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebsiteDocumentMetadata } from './WebsiteDocumentMetadata';

const state = vi.hoisted(() => ({
  pathname: '/',
  language: 'th' as 'th' | 'en',
}));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('./WebsiteLanguageProvider', () => ({
  useWebsiteLanguage: () => ({
    language: state.language,
    isEnglish: state.language === 'en',
  }),
}));

describe('website route metadata', () => {
  beforeEach(() => {
    state.pathname = '/';
    state.language = 'th';
  });
  afterEach(() => {
    cleanup();
    document.head.querySelectorAll('meta').forEach((meta) => meta.remove());
    vi.restoreAllMocks();
  });

  it('updates title, social metadata, and locale after changing the page language', () => {
    const view = render(<WebsiteDocumentMetadata />);
    expect(document.title).toBe('Super Black Coffee - กาแฟดีในทุกจังหวะของคุณ');
    state.pathname = '/contact';
    state.language = 'en';
    view.rerender(<WebsiteDocumentMetadata />);
    expect(document.title).toBe('Contact us - Super Black Coffee');
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Contact the Super Black Coffee team.',
    );
    expect(
      document.querySelector('meta[property="og:locale"]'),
    ).toHaveAttribute('content', 'en_US');
    expect(
      document.querySelector('meta[name="twitter:title"]'),
    ).toHaveAttribute('content', document.title);
  });

  it.each([
    '/branches/ayutthaya',
    '/branches/phitsanulok/menu',
    '/unknown',
    '/services/unknown',
  ])(
    'preserves server metadata for a route without client translations: %s',
    (path) => {
      state.pathname = path;
      document.title = 'Route-specific server title';
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Route-specific description';
      document.head.append(meta);
      render(<WebsiteDocumentMetadata />);
      expect(document.title).toBe('Route-specific server title');
      expect(meta.content).toBe('Route-specific description');
    },
  );

  it('updates late-streamed duplicate metadata instead of leaving stale descriptions', async () => {
    state.pathname = '/about';
    render(<WebsiteDocumentMetadata />);
    const late = document.createElement('meta');
    late.name = 'description';
    late.content = 'stale';
    document.head.append(late);
    await waitFor(() =>
      expect(late.content).toBe('เรื่องราวและแนวคิดของ Super Black Coffee'),
    );
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(
      2,
    );
  });

  it('disconnects its observer and timer when unmounted', () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const clear = vi.spyOn(window, 'clearTimeout');
    const view = render(<WebsiteDocumentMetadata />);
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
  });
});
