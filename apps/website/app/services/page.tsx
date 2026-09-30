import Box from '@mui/material/Box';
import { ServicesContent } from '../../src/components/BrandPagesRedesign';
import { WebsiteFooter } from '../../src/components/WebsiteFooterRedesign';
import { WebsiteNav } from '../../src/components/WebsiteNavRedesign';
export default function ServicesPage() {
  return (
    <Box component="main" sx={{ m: 0, p: 0 }}>
      <WebsiteNav />
      <ServicesContent />
      <WebsiteFooter />
    </Box>
  );
}
