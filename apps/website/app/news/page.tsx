import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import { NewsContent } from '../../src/components/BrandPagesRedesign';
import { WebsiteFooter } from '../../src/components/WebsiteFooterRedesign';
import { WebsiteNav } from '../../src/components/WebsiteNavRedesign';
import { pageMetadata } from '../pageMetadata';

export const metadata: Metadata = pageMetadata({
  title: 'ข่าวสารและเรื่องราว',
  description: 'ติดตามข่าวสาร เรื่องราว และกิจกรรมจาก Super Black Coffee',
  pathname: '/news',
});
export default function NewsPage() {
  return (
    <Box component="main" sx={{ m: 0, p: 0 }}>
      <WebsiteNav />
      <NewsContent />
      <WebsiteFooter />
    </Box>
  );
}
