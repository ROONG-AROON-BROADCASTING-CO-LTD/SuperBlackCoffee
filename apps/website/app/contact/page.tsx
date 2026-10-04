import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import { ContactContent } from '../../src/components/BrandPagesRedesign';
import { WebsiteFooter } from '../../src/components/WebsiteFooterRedesign';
import { WebsiteNav } from '../../src/components/WebsiteNavRedesign';
import { pageMetadata } from '../pageMetadata';

export const metadata: Metadata = pageMetadata({
  title: 'ติดต่อเรา',
  description:
    'ติดต่อทีม Super Black Coffee เพื่อสอบถามข้อมูลสาขา บริการ กาแฟ และแฟรนไชส์',
  pathname: '/contact',
});
export default function ContactPage() {
  return (
    <Box component="main" sx={{ m: 0, p: 0 }}>
      <WebsiteNav />
      <ContactContent />
      <WebsiteFooter />
    </Box>
  );
}
