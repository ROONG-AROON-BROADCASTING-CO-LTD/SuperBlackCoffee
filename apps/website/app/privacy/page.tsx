import Box from '@mui/material/Box';
import { WebsiteFooter } from '../../src/components/WebsiteFooterRedesign';
import { WebsiteNav } from '../../src/components/WebsiteNavRedesign';
export default function PrivacyPage() {
  return (
    <Box component="main" sx={{ m: 0, p: 0 }}>
      <WebsiteNav />
      <section className="sb-legal sb-container">
        <span className="sb-rule" />
        <h1>นโยบายความเป็นส่วนตัว</h1>
        <p>
          เราใช้ข้อมูลที่คุณส่งผ่านแบบฟอร์มติดต่อเพื่อประสานงานและตอบกลับตามความสนใจของคุณเท่านั้น
        </p>
      </section>
      <WebsiteFooter />
    </Box>
  );
}
