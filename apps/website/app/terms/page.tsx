'use client';

import Box from '@mui/material/Box';
import { WebsiteFooter } from '../../src/components/WebsiteFooterRedesign';
import { useWebsiteLanguage } from '../../src/components/WebsiteLanguageProvider';
import { WebsiteNav } from '../../src/components/WebsiteNavRedesign';
export default function TermsPage() {
  const { text } = useWebsiteLanguage();
  return (
    <Box component="main" sx={{ m: 0, p: 0 }}>
      <WebsiteNav />
      <section className="sb-legal sb-container">
        <span className="sb-rule" />
        <h1>{text('ข้อกำหนดการใช้งาน', 'Terms of use')}</h1>
        <p>
          {text(
            'เนื้อหาบนเว็บไซต์นี้จัดทำขึ้นเพื่อให้ข้อมูลเกี่ยวกับ SUPER BLACK COFFEE และอาจมีการปรับปรุงได้ตามความเหมาะสม',
            'This website provides information about SUPER BLACK COFFEE and may be updated when appropriate.',
          )}
        </p>
      </section>
      <WebsiteFooter />
    </Box>
  );
}
