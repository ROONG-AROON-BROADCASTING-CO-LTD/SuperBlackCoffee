import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import { HomeContent } from '../src/components/BrandPagesRedesign';
import { WebsiteFooter } from '../src/components/WebsiteFooterRedesign';
import { WebsiteNav } from '../src/components/WebsiteNavRedesign';
import { pageMetadata } from './pageMetadata';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'กาแฟดีในทุกจังหวะของคุณ',
    description:
      'กาแฟไทย พลังงานสะอาด และพื้นที่ที่ออกแบบมาเพื่อทุกการเดินทางของคุณ',
    pathname: '/',
  }),
  title: { absolute: 'Super Black Coffee - กาแฟดีในทุกจังหวะของคุณ' },
};

export default function HomePage() {
  return (
    <Box component="main" sx={{ m: 0, p: 0, background: '#000' }}>
      <WebsiteNav />
      <HomeContent />
      <WebsiteFooter />
    </Box>
  );
}
