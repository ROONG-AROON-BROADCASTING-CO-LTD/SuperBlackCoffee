'use client';

import Box from '@mui/material/Box';
import { websiteSx } from './websiteSx';
import Link from 'next/link';
import Image from 'next/image';
import { franchiseLoginUrl } from './franchise-login-url';

export function WebsiteFooter() {
  return (
    <Box component="footer" sx={[websiteSx['sb-footer']]} className="sb-footer">
      <Box
        component="div"
        sx={[websiteSx['sb-footer-main'], websiteSx['sb-container']]}
        className="sb-footer-main sb-container"
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
          <span>
            SUPER BLACK
            <br />
            COFFEE
          </span>
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
            <a href={franchiseLoginUrl}>เข้าสู่ระบบแฟรนไชส์</a>
            <Link href="/services">บริการของเรา</Link>
            <Link href="/contact">ติดต่อทีมงาน</Link>
          </div>
          <div>
            <span>ติดต่อเรา</span>
            <a href="tel:021234567">02-123-4567</a>
            <a href="mailto:hello@superblackcoffee.co.th">
              hello@superblackcoffee.co.th
            </a>
            <span>จันทร์–ศุกร์ 09:00–18:00 น.</span>
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
