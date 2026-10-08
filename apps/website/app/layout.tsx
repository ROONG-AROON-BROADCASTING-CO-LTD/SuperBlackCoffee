import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import localFont from 'next/font/local';
import { WebsiteThemeProvider } from './WebsiteThemeProvider';
import { GoogleAnalytics } from '../src/components/GoogleAnalytics';
import {
  isWebsiteLanguage,
  type WebsiteLanguage,
  websiteLanguageCookieName,
} from '../src/lib/websiteLanguage';

const ibmPlexSansThai = localFont({
  src: [
    { path: './fonts/IBMPlexSansThai-Regular.ttf', weight: '400' },
    { path: './fonts/IBMPlexSansThai-Medium.ttf', weight: '500' },
    { path: './fonts/IBMPlexSansThai-SemiBold.ttf', weight: '600' },
    { path: './fonts/IBMPlexSansThai-Bold.ttf', weight: '700' },
  ],
  variable: '--font-ibm-plex-thai',
  display: 'swap',
});
const inter = localFont({
  src: './fonts/Inter-VariableFont_opsz,wght.ttf',
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://superblackcoffee.co.th',
  ),
  title: { default: 'Super Black Coffee', template: '%s - Super Black Coffee' },
  description: 'Super Black Coffee — กาแฟดีในทุกจังหวะของคุณ',
  keywords: ['กาแฟ', 'ร้านกาแฟ', 'Super Black Coffee', 'แฟรนไชส์กาแฟ'],
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    siteName: 'Super Black Coffee',
    title: 'Super Black Coffee',
    description: 'กาแฟดีในทุกจังหวะของคุณ',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Super Black Coffee',
    description: 'กาแฟดีในทุกจังหวะของคุณ',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#171411',
};

function parseWebsiteLanguage(
  value: string | undefined,
): WebsiteLanguage | null {
  return isWebsiteLanguage(value) ? value : null;
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const storedLanguage = parseWebsiteLanguage(
    cookieStore.get(websiteLanguageCookieName)?.value,
  );
  const initialLanguage = storedLanguage ?? 'th';

  return (
    <html
      lang={initialLanguage}
      className={`${ibmPlexSansThai.variable} ${inter.variable}`}
      style={{ backgroundColor: '#000' }}
    >
      <head>
        <style>{'html,body{margin:0;background:#000!important;}'}</style>
      </head>
      <body style={{ backgroundColor: '#000' }}>
        <GoogleAnalytics />
        <AppRouterCacheProvider>
          <WebsiteThemeProvider
            initialLanguage={initialLanguage}
            hasLanguageCookie={storedLanguage !== null}
          >
            {children}
          </WebsiteThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
