import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WebsiteLanguageProvider,
  useWebsiteLanguage,
} from './WebsiteLanguageProvider';

function LanguageControls() {
  const { language, toggleLanguage, text } = useWebsiteLanguage();
  return (
    <button onClick={toggleLanguage}>
      {language}: {text('สวัสดี', 'Hello')}
    </button>
  );
}

describe('website language persistence', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        values.set(key, value);
      }),
    });
    document.cookie = 'superblackcoffee-language=; Max-Age=0; Path=/';
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses the server cookie instead of stale browser storage', () => {
    window.localStorage.setItem('superblackcoffee-language', 'en');
    render(
      <WebsiteLanguageProvider initialLanguage="th" hasLanguageCookie>
        <LanguageControls />
      </WebsiteLanguageProvider>,
    );
    expect(screen.getByRole('button', { name: 'th: สวัสดี' })).toBeVisible();
    expect(document.documentElement.lang).toBe('th');
  });

  it('migrates a stored language to a cookie and updates the document language', () => {
    window.localStorage.setItem('superblackcoffee-language', 'en');
    render(
      <WebsiteLanguageProvider initialLanguage="th" hasLanguageCookie={false}>
        <LanguageControls />
      </WebsiteLanguageProvider>,
    );
    expect(screen.getByRole('button', { name: 'en: Hello' })).toBeVisible();
    expect(document.cookie).toContain('superblackcoffee-language=en');
    expect(document.documentElement.lang).toBe('en');
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'th: สวัสดี' })).toBeVisible();
    expect(window.localStorage.getItem('superblackcoffee-language')).toBe('th');
    expect(document.cookie).toContain('superblackcoffee-language=th');
  });

  it('keeps the website visible and switchable when browser storage is blocked', () => {
    vi.mocked(window.localStorage.getItem).mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.mocked(window.localStorage.setItem).mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    render(
      <WebsiteLanguageProvider initialLanguage="th" hasLanguageCookie={false}>
        <LanguageControls />
      </WebsiteLanguageProvider>,
    );
    expect(screen.getByRole('button', { name: 'th: สวัสดี' })).toBeVisible();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'en: Hello' })).toBeVisible();
    expect(document.cookie).toContain('superblackcoffee-language=en');
    expect(document.documentElement.lang).toBe('en');
  });

  it.each(['EN', 'invalid', ''])(
    'ignores invalid stored language %s',
    (language) => {
      window.localStorage.setItem('superblackcoffee-language', language);
      render(
        <WebsiteLanguageProvider initialLanguage="th" hasLanguageCookie={false}>
          <LanguageControls />
        </WebsiteLanguageProvider>,
      );
      expect(screen.getByRole('button', { name: 'th: สวัสดี' })).toBeVisible();
    },
  );
});
