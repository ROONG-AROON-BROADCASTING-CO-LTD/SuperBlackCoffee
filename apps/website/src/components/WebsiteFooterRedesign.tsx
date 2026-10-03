'use client';

import Box from '@mui/material/Box';
import { websiteSx } from './websiteSx';
import Link from 'next/link';
import Image from 'next/image';
import { useWebsiteLanguage } from './WebsiteLanguageProvider';

export function WebsiteFooter() {
  const { text } = useWebsiteLanguage();
  return (
    <Box component="footer" sx={[websiteSx['sb-footer']]} className="sb-footer">
      <Box
        component="div"
        sx={[websiteSx['sb-footer-rail']]}
        className="sb-footer-rail"
      />
      <Box
        component="div"
        sx={[websiteSx['sb-footer-main'], websiteSx['sb-container']]}
        className="sb-footer-main sb-container"
      >
        <Box
          component="div"
          sx={[websiteSx['sb-footer-brand-column']]}
          className="sb-footer-brand-column"
        >
          <Box
            component={Link}
            sx={[websiteSx['sb-footer-brand']]}
            className="sb-footer-brand"
            href="/"
          >
            <Image
              src="/brand/superblackcoffee-logo.png"
              alt=""
              width={58}
              height={58}
            />
            <Box
              component="span"
              sx={[websiteSx['sb-footer-brand-title']]}
              className="sb-footer-brand-title"
            >
              SUPER BLACK COFFEE
            </Box>
          </Box>
          <Box
            component="div"
            sx={[websiteSx['sb-footer-brand-copy']]}
            className="sb-footer-brand-copy"
          >
            <p>
              {text(
                'กาแฟไทย พลังสะอาด และพื้นที่ที่ออกแบบมา เพื่อทุกการเดินทางของคุณ',
                'Thai coffee, clean energy, and spaces designed for every journey.',
              )}
            </p>
          </Box>
        </Box>
        <Box
          component="div"
          sx={[websiteSx['sb-footer-links']]}
          className="sb-footer-links"
        >
          <div>
            <span>{text('สำรวจ', 'Explore')}</span>
            <Link href="/about">{text('เกี่ยวกับเรา', 'About us')}</Link>
            <Link href="/menu">{text('เมนู', 'Menu')}</Link>
            <Link href="/branches">{text('สาขา', 'Branches')}</Link>
          </div>
          <div>
            <span>{text('ธุรกิจ', 'Business')}</span>
            <Link href="/franchise">{text('แฟรนไชส์', 'Franchise')}</Link>
            <Link href="/services">{text('บริการของเรา', 'Services')}</Link>
            <Link href="/contact">
              {text('ติดต่อทีมงาน', 'Contact the team')}
            </Link>
          </div>
          <div>
            <span>{text('ติดต่อเรา', 'Contact')}</span>
            <a href="tel:+6629707552">02-970-7552</a>
            <a href="mailto:all.superblackcoffee@gmail.com">
              all.superblackcoffee@gmail.com
            </a>
            <span>
              {text('เปิดทุกวัน 08:00 - 22:00 น.', 'Open daily 08:00–22:00')}
            </span>
          </div>
        </Box>
      </Box>
      <Box
        component="div"
        sx={[websiteSx['sb-footer-bottom'], websiteSx['sb-container']]}
        className="sb-footer-bottom sb-container"
      >
        <span>© {new Date().getFullYear()} SUPER BLACK COFFEE</span>
        <div>
          <Link href="/privacy">
            {text('นโยบายความเป็นส่วนตัว', 'Privacy policy')}
          </Link>
          <Link href="/terms">{text('ข้อกำหนดการใช้งาน', 'Terms of use')}</Link>
        </div>
      </Box>
    </Box>
  );
}
