'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  isWebsiteLanguage,
  type WebsiteLanguage,
  websiteLanguageCookieName,
} from '../lib/websiteLanguage';

export type { WebsiteLanguage } from '../lib/websiteLanguage';

type WebsiteLanguageContextValue = {
  language: WebsiteLanguage;
  isEnglish: boolean;
  setLanguage: (language: WebsiteLanguage) => void;
  toggleLanguage: () => void;
  text: (thai: string, english: string) => string;
};

const WebsiteLanguageContext =
  createContext<WebsiteLanguageContextValue | null>(null);

const storageKey = 'superblackcoffee-language';
const oneYearInSeconds = 60 * 60 * 24 * 365;

type WebsiteLanguageProviderProps = {
  children: ReactNode;
  initialLanguage: WebsiteLanguage;
  hasLanguageCookie: boolean;
};

function persistLanguage(language: WebsiteLanguage) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${websiteLanguageCookieName}=${language}; Path=/; Max-Age=${oneYearInSeconds}; SameSite=Lax${secure}`;
  window.localStorage.setItem(storageKey, language);
}

export function WebsiteLanguageProvider({
  children,
  initialLanguage,
  hasLanguageCookie,
}: WebsiteLanguageProviderProps) {
  const [language, setLanguageState] =
    useState<WebsiteLanguage>(initialLanguage);
  const [languageLoaded, setLanguageLoaded] = useState(hasLanguageCookie);

  useEffect(() => {
    if (hasLanguageCookie) return;

    const storedLanguage = window.localStorage.getItem(storageKey);
    if (isWebsiteLanguage(storedLanguage)) {
      setLanguageState(storedLanguage);
      persistLanguage(storedLanguage);
    }
    setLanguageLoaded(true);
  }, [hasLanguageCookie]);

  useEffect(() => {
    if (!languageLoaded) return;
    document.documentElement.lang = language;
  }, [language, languageLoaded]);

  const setLanguage = useCallback((nextLanguage: WebsiteLanguage) => {
    setLanguageState(nextLanguage);
    persistLanguage(nextLanguage);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((currentLanguage) => {
      const nextLanguage = currentLanguage === 'th' ? 'en' : 'th';
      persistLanguage(nextLanguage);
      return nextLanguage;
    });
  }, []);

  const value = useMemo<WebsiteLanguageContextValue>(
    () => ({
      language,
      isEnglish: language === 'en',
      setLanguage,
      toggleLanguage,
      text: (thai, english) => (language === 'en' ? english : thai),
    }),
    [language, setLanguage, toggleLanguage],
  );

  return (
    <WebsiteLanguageContext.Provider value={value}>
      <div
        aria-busy={!languageLoaded}
        style={{
          visibility: languageLoaded ? 'visible' : 'hidden',
          pointerEvents: languageLoaded ? 'auto' : 'none',
        }}
      >
        {children}
      </div>
    </WebsiteLanguageContext.Provider>
  );
}

export function useWebsiteLanguage() {
  const context = useContext(WebsiteLanguageContext);
  if (!context) {
    throw new Error(
      'useWebsiteLanguage must be used inside WebsiteLanguageProvider',
    );
  }
  return context;
}
