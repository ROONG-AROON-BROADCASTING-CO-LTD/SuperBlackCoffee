'use client';

import Box from '@mui/material/Box';
import { websiteSx } from './websiteSx';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  const [isScrolled, setIsScrolled] = useState(false);
  const [language, setLanguage] = useState<'TH' | 'EN'>('TH');
  const isHome = pathname === '/';
  const isTransparent = isHome && !isScrolled && !open;

  useEffect(() => {
    const updateScrolledState = () => setIsScrolled(window.scrollY > 8);

    updateScrolledState();
    window.addEventListener('scroll', updateScrolledState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrolledState);
  }, [pathname]);

  return (
    <Box
      component="header"
      sx={[
        websiteSx['sb-header'],
        isHome && websiteSx['sb-header-overlay'],
        isTransparent && websiteSx['sb-header-transparent'],
      ]}
      className="sb-header"
    >
      <Box component="div" sx={[websiteSx['sb-topbar']]} className="sb-topbar">
        <span>กาแฟไทย · พลังงานสะอาด · ทุกการเดินทาง</span>
        <Box
          component="div"
          className="sb-topbar-contact"
          aria-label="ช่องทางติดต่อ"
        >
          <Box
            component="a"
            className="sb-topbar-social"
            href="https://www.facebook.com/profile.php?id=61573117743066"
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook"
          >
            <Image
              src="/brand/facebook.svg"
              alt="Facebook"
              width={16}
              height={16}
            />
          </Box>
          <Box component="span" className="sb-topbar-social">
            <Image
              src="/brand/instagram.svg"
              alt="Instagram"
              width={16}
              height={16}
            />
          </Box>
          <Box component="span" className="sb-topbar-social">
            <Image src="/brand/line.svg" alt="LINE" width={16} height={16} />
          </Box>
          <a className="sb-topbar-phone" href="tel:+6629707552">
            02-970-7552
          </a>
        </Box>
      </Box>
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
          type="button"
          sx={[websiteSx['sb-language-switcher']]}
          className="sb-language-switcher"
          aria-label="เปลี่ยนภาษา"
          onClick={() => setLanguage(language === 'TH' ? 'EN' : 'TH')}
        >
          <span className={language === 'TH' ? 'active' : ''}>TH</span>
          <i>/</i>
          <span className={language === 'EN' ? 'active' : ''}>EN</span>
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
