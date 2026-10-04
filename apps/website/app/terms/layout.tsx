import type { Metadata } from 'next';
import { pageMetadata } from '../pageMetadata';

export const metadata: Metadata = pageMetadata({
  title: 'ข้อกำหนดการใช้งาน',
  description: 'ข้อกำหนดการใช้งานเว็บไซต์ Super Black Coffee',
  pathname: '/terms',
});

export default function TermsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
