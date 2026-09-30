import type { Metadata, Viewport } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import localFont from 'next/font/local';
import { WebsiteThemeProvider } from './WebsiteThemeProvider';
import { GoogleAnalytics } from '../src/components/GoogleAnalytics';

const kanit = localFont({
  src: [
    { path: './fonts/Kanit-Regular.ttf', weight: '400' },
    { path: './fonts/Kanit-SemiBold.ttf', weight: '600' },
    { path: './fonts/Kanit-Bold.ttf', weight: '700' },
  ],
  variable: '--font-kanit',
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
  title: { default: 'Super Black Coffee', template: '%s | Super Black Coffee' },
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${kanit.variable} ${inter.variable}`}>
      <body>
        <GoogleAnalytics />
        <AppRouterCacheProvider>
          <WebsiteThemeProvider>{children}</WebsiteThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
