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

export type WebsiteLanguage = 'th' | 'en';

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

export function WebsiteLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<WebsiteLanguage>('th');
  const [languageLoaded, setLanguageLoaded] = useState(false);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(storageKey);
    if (storedLanguage === 'en' || storedLanguage === 'th') {
      setLanguageState(storedLanguage);
    }
    setLanguageLoaded(true);
  }, []);

  useEffect(() => {
    if (!languageLoaded) return;
    document.documentElement.lang = language;
    window.localStorage.setItem(storageKey, language);
  }, [language, languageLoaded]);

  const setLanguage = useCallback((nextLanguage: WebsiteLanguage) => {
    setLanguageState(nextLanguage);
  }, []);

  const value = useMemo<WebsiteLanguageContextValue>(
    () => ({
      language,
      isEnglish: language === 'en',
      setLanguage,
      toggleLanguage: () => setLanguage(language === 'th' ? 'en' : 'th'),
      text: (thai, english) => (language === 'en' ? english : thai),
    }),
    [language, setLanguage],
  );

  return (
    <WebsiteLanguageContext.Provider value={value}>
      {children}
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
