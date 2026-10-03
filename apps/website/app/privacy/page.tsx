'use client';

import Box from '@mui/material/Box';
import { WebsiteFooter } from '../../src/components/WebsiteFooterRedesign';
import { useWebsiteLanguage } from '../../src/components/WebsiteLanguageProvider';
import { WebsiteNav } from '../../src/components/WebsiteNavRedesign';
export default function PrivacyPage() {
  const { text } = useWebsiteLanguage();
  return (
    <Box component="main" sx={{ m: 0, p: 0 }}>
      <WebsiteNav />
      <section className="sb-legal sb-container">
        <span className="sb-rule" />
        <h1>{text('นโยบายความเป็นส่วนตัว', 'Privacy policy')}</h1>
        <p>
          {text(
            'เราใช้ข้อมูลที่คุณส่งผ่านแบบฟอร์มติดต่อเพื่อประสานงานและตอบกลับตามความสนใจของคุณเท่านั้น',
            'We use details submitted through our contact forms only to coordinate with you and respond to your enquiry.',
          )}
        </p>
      </section>
      <WebsiteFooter />
    </Box>
  );
}
