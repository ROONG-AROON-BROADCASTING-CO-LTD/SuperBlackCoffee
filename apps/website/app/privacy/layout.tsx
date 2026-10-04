import type { Metadata } from 'next';
import { pageMetadata } from '../pageMetadata';

export const metadata: Metadata = pageMetadata({
  title: 'นโยบายความเป็นส่วนตัว',
  description:
    'นโยบายความเป็นส่วนตัวสำหรับการใช้เว็บไซต์และการติดต่อกับ Super Black Coffee',
  pathname: '/privacy',
});

export default function PrivacyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
