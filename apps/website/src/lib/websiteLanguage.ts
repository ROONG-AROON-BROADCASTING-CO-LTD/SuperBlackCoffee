export type WebsiteLanguage = 'th' | 'en';

export const websiteLanguageCookieName = 'superblackcoffee-language';

export function isWebsiteLanguage(
  value: string | null | undefined,
): value is WebsiteLanguage {
  return value === 'en' || value === 'th';
}
