import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import { BranchesContent } from '../../src/components/BrandPagesRedesign';
import { WebsiteFooter } from '../../src/components/WebsiteFooterRedesign';
import { WebsiteNav } from '../../src/components/WebsiteNavRedesign';
import { pageMetadata } from '../pageMetadata';

export const metadata: Metadata = pageMetadata({
  title: 'สาขา',
  description:
    'ค้นหาสาขา Super Black Coffee ใกล้คุณ พร้อมวางแผนแวะพัก ดื่มกาแฟ และใช้บริการระหว่างทาง',
  pathname: '/branches',
});
export default function BranchesPage() {
  return (
    <Box component="main" sx={{ m: 0, p: 0 }}>
      <WebsiteNav />
      <BranchesContent />
      <WebsiteFooter />
    </Box>
  );
}
