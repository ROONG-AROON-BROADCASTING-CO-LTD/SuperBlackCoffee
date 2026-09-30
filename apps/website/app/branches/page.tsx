import Box from '@mui/material/Box';
import { BranchesContent } from '../../src/components/BrandPagesRedesign';
import { WebsiteFooter } from '../../src/components/WebsiteFooterRedesign';
import { WebsiteNav } from '../../src/components/WebsiteNavRedesign';
export default function BranchesPage() {
  return (
    <Box component="main" sx={{ m: 0, p: 0 }}>
      <WebsiteNav />
      <BranchesContent />
      <WebsiteFooter />
    </Box>
  );
}
