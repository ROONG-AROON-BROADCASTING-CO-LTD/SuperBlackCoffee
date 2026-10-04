import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import { AboutContent } from '../../src/components/BrandPagesRedesign';
import { WebsiteFooter } from '../../src/components/WebsiteFooterRedesign';
import { WebsiteNav } from '../../src/components/WebsiteNavRedesign';
import { pageMetadata } from '../pageMetadata';

export const metadata: Metadata = pageMetadata({
  title: 'เกี่ยวกับเรา',
  description:
    'รู้จักเรื่องราว แนวคิด และความตั้งใจของ Super Black Coffee ที่ออกแบบทุกจังหวะของวันให้ดีขึ้น',
  pathname: '/about',
});
export default function AboutPage() {
  return (
    <Box component="main" sx={{ m: 0, p: 0 }}>
      <WebsiteNav />
      <AboutContent />
      <WebsiteFooter />
    </Box>
  );
}
