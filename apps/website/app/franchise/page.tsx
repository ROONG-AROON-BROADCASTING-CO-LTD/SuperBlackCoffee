import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import { FranchiseContent } from '../../src/components/BrandPagesRedesign';
import { WebsiteFooter } from '../../src/components/WebsiteFooterRedesign';
import { WebsiteNav } from '../../src/components/WebsiteNavRedesign';
import { pageMetadata } from '../pageMetadata';

export const metadata: Metadata = pageMetadata({
  title: 'แฟรนไชส์',
  description:
    'ร่วมเติบโตกับแฟรนไชส์ Super Black Coffee เริ่มจากการพูดคุย วางแผน และสร้างธุรกิจที่เหมาะกับคุณ',
  pathname: '/franchise',
});
export default function FranchisePage() {
  return (
    <Box component="main" sx={{ m: 0, p: 0 }}>
      <WebsiteNav />
      <FranchiseContent />
      <WebsiteFooter />
    </Box>
  );
}
