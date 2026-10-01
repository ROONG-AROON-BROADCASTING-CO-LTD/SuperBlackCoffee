import Box from '@mui/material/Box';
import { HomeContent } from '../src/components/BrandPagesRedesign';
import { WebsiteFooter } from '../src/components/WebsiteFooterRedesign';
import { WebsiteNav } from '../src/components/WebsiteNavRedesign';

export default function HomePage() {
  return (
    <Box component="main" sx={{ m: 0, p: 0, background: '#000' }}>
      <WebsiteNav />
      <HomeContent />
      <WebsiteFooter />
    </Box>
  );
}
