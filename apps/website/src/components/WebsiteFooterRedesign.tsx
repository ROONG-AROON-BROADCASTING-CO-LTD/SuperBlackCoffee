'use client';

import Box from '@mui/material/Box';
import { websiteSx } from './websiteSx';
import Link from 'next/link';
import Image from 'next/image';

export function WebsiteFooter() {
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
              กาแฟไทย พลังสะอาด และพื้นที่ที่ออกแบบมา เพื่อทุกการเดินทางของคุณ
            </p>
          </Box>
        </Box>
        <Box
          component="div"
          sx={[websiteSx['sb-footer-links']]}
          className="sb-footer-links"
        >
          <div>
            <span>สำรวจ</span>
            <Link href="/about">เกี่ยวกับเรา</Link>
            <Link href="/menu">เมนู</Link>
            <Link href="/branches">สาขา</Link>
          </div>
          <div>
            <span>ธุรกิจ</span>
            <Link href="/franchise">แฟรนไชส์</Link>
            <Link href="/services">บริการของเรา</Link>
            <Link href="/contact">ติดต่อทีมงาน</Link>
          </div>
          <div>
            <span>ติดต่อเรา</span>
            <a href="tel:+6629707552">02-970-7552</a>
            <a href="mailto:all.superblackcoffee@gmail.com">
              all.superblackcoffee@gmail.com
            </a>
            <span>เปิดทุกวัน 08:00 - 22:00 น.</span>
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
          <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link>
          <Link href="/terms">ข้อกำหนดการใช้งาน</Link>
        </div>
      </Box>
    </Box>
  );
}
