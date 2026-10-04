import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import { MenuContent } from '../../src/components/BrandPagesRedesign';
import { WebsiteFooter } from '../../src/components/WebsiteFooterRedesign';
import { WebsiteNav } from '../../src/components/WebsiteNavRedesign';
import { pageMetadata } from '../pageMetadata';

export const metadata: Metadata = pageMetadata({
  title: 'เมนูกาแฟและเครื่องดื่ม',
  description:
    'สำรวจเมนูกาแฟและเครื่องดื่มจาก Super Black Coffee ที่คัดสรรให้เข้ากับทุกจังหวะของวัน',
  pathname: '/menu',
});
export default function MenuPage() {
  return (
    <Box component="main" sx={{ m: 0, p: 0 }}>
      <WebsiteNav />
      <MenuContent />
      <WebsiteFooter />
    </Box>
  );
}
