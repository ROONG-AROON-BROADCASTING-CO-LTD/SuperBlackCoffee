import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import { ServicesContent } from '../../src/components/BrandPagesRedesign';
import { WebsiteFooter } from '../../src/components/WebsiteFooterRedesign';
import { WebsiteNav } from '../../src/components/WebsiteNavRedesign';
import { pageMetadata } from '../pageMetadata';

export const metadata: Metadata = pageMetadata({
  title: 'บริการของเรา',
  description:
    'พบกับกาแฟพรีเมียม จุดชาร์จ EV บริการรับส่งพัสดุ แฟรนไชส์ และ SuperBlack Control',
  pathname: '/services',
});
export default function ServicesPage() {
  return (
    <Box component="main" sx={{ m: 0, p: 0 }}>
      <WebsiteNav />
      <ServicesContent />
      <WebsiteFooter />
    </Box>
  );
}
