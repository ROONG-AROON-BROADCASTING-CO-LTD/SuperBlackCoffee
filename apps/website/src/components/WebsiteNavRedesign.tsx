'use client';

import Box from '@mui/material/Box';
import { websiteSx } from './websiteSx';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { franchiseLoginUrl } from './franchise-login-url';

const links = [
  ['หน้าหลัก', '/'],
  ['เกี่ยวกับเรา', '/about'],
  ['เมนู', '/menu'],
  ['สาขา', '/branches'],
  ['แฟรนไชส์', '/franchise'],
  ['ติดต่อเรา', '/contact'],
];

export function WebsiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <Box component="header" sx={[websiteSx['sb-header']]} className="sb-header">
      <Box
        component="nav"
        sx={[websiteSx['sb-nav']]}
        className="sb-nav"
        aria-label="เมนูหลัก"
      >
        <Box
          component={Link}
          sx={[websiteSx['sb-brand']]}
          className="sb-brand"
          href="/"
          aria-label="หน้าแรก Super Black Coffee"
        >
          <Image
            src="/brand/superblackcoffee-logo.png"
            alt=""
            width={42}
            height={42}
            priority
          />
          <span>SUPER BLACK COFFEE</span>
        </Box>
        <Box
          component="div"
          sx={[websiteSx['sb-nav-links']]}
          className="sb-nav-links"
        >
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </Box>
        <Box
          component="a"
          sx={[websiteSx['sb-nav-login']]}
          className="sb-nav-login"
          href={franchiseLoginUrl}
        >
          เข้าสู่ระบบแฟรนไชส์
        </Box>
        <Box
          component={Link}
          sx={[websiteSx['sb-nav-action']]}
          className="sb-nav-action"
          href="/franchise#apply"
        >
          สนใจแฟรนไชส์
        </Box>
        <Box
          component="button"
          sx={[websiteSx['sb-menu-toggle']]}
          className="sb-menu-toggle"
          aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
          <span />
        </Box>
      </Box>
      {open && (
        <Box
          component="div"
          sx={[websiteSx['sb-mobile-nav']]}
          className="sb-mobile-nav"
        >
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={pathname === href ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
          <Box
            component={Link}
            sx={[websiteSx['sb-mobile-cta']]}
            className="sb-mobile-cta"
            href="/franchise#apply"
            onClick={() => setOpen(false)}
          >
            สนใจแฟรนไชส์
          </Box>
          <Box
            component="a"
            sx={[websiteSx['sb-mobile-login']]}
            className="sb-mobile-login"
            href={franchiseLoginUrl}
            onClick={() => setOpen(false)}
          >
            เข้าสู่ระบบแฟรนไชส์
          </Box>
        </Box>
      )}
    </Box>
  );
}
