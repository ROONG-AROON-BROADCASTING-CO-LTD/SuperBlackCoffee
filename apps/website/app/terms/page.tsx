import Box from '@mui/material/Box';
import { WebsiteFooter } from '../../src/components/WebsiteFooterRedesign';
import { WebsiteNav } from '../../src/components/WebsiteNavRedesign';
export default function TermsPage() {
  return (
    <Box component="main" sx={{ m: 0, p: 0 }}>
      <WebsiteNav />
      <section className="sb-legal sb-container">
        <span className="sb-rule" />
        <h1>ข้อกำหนดการใช้งาน</h1>
        <p>
          เนื้อหาบนเว็บไซต์นี้จัดทำขึ้นเพื่อให้ข้อมูลเกี่ยวกับ SUPER BLACK
          COFFEE และอาจมีการปรับปรุงได้ตามความเหมาะสม
        </p>
      </section>
      <WebsiteFooter />
    </Box>
  );
}
