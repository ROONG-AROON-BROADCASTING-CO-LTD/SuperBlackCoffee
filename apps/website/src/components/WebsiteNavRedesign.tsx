'use client';

import Box from '@mui/material/Box';
import { websiteSx } from './websiteSx';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { franchiseLoginUrl } from './franchise-login-url';
import { useWebsiteLanguage } from './WebsiteLanguageProvider';

const links = [
  ['หน้าหลัก', 'Home', '/'],
  ['เกี่ยวกับเรา', 'About us', '/about'],
  ['เมนู', 'Menu', '/menu'],
  ['สาขา', 'Branches', '/branches'],
  ['แฟรนไชส์', 'Franchise', '/franchise'],
  ['ติดต่อเรา', 'Contact us', '/contact'],
];

export function WebsiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { language, text, toggleLanguage } = useWebsiteLanguage();
  const isTransparent = !isScrolled && !open;

  useEffect(() => {
    const updateScrolledState = () => setIsScrolled(window.scrollY > 0);

    updateScrolledState();
    window.addEventListener('scroll', updateScrolledState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrolledState);
  }, [pathname]);

  return (
    <Box
      component="header"
      sx={[
        websiteSx['sb-header'],
        websiteSx['sb-header-overlay'],
        isTransparent && websiteSx['sb-header-transparent'],
        isScrolled && websiteSx['sb-header-condensed'],
        open && websiteSx['sb-header-menu-open'],
      ]}
      className={`sb-header ${isScrolled ? 'sb-header-condensed' : ''} ${open ? 'sb-header-menu-open' : ''}`}
    >
      <Box component="div" sx={[websiteSx['sb-topbar']]} className="sb-topbar">
        <span>
          {text(
            'กาแฟไทย · พลังงานสะอาด · ทุกการเดินทาง',
            'Thai coffee · clean energy · every journey',
          )}
        </span>
        <Box
          component="div"
          className="sb-topbar-contact"
          aria-label={text('ช่องทางติดต่อ', 'Contact channels')}
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
          <Box
            component="a"
            className="sb-topbar-social"
            href="https://line.me/R/ti/p/@178lhzgu"
            target="_blank"
            rel="noreferrer"
            aria-label="LINE @178lhzgu"
          >
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
        aria-label={text('เมนูหลัก', 'Main menu')}
      >
        <Box
          component={Link}
          sx={[websiteSx['sb-brand']]}
          className="sb-brand"
          href="/"
          aria-label={text(
            'หน้าแรก Super Black Coffee',
            'Super Black Coffee home',
          )}
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
          {links.map(([thaiLabel, englishLabel, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
            >
              {text(thaiLabel, englishLabel)}
            </Link>
          ))}
        </Box>
        <Box
          component="a"
          sx={[websiteSx['sb-nav-login']]}
          className="sb-nav-login"
          href={franchiseLoginUrl}
        >
          {text('เข้าสู่ระบบแฟรนไชส์', 'Franchise login')}
        </Box>
        <Box
          component={Link}
          sx={[websiteSx['sb-nav-action']]}
          className="sb-nav-action"
          href="/franchise#apply"
        >
          {text('สนใจแฟรนไชส์', 'Own a franchise')}
        </Box>
        <Box
          component="button"
          type="button"
          sx={[websiteSx['sb-language-switcher']]}
          className="sb-language-switcher"
          aria-label={text('เปลี่ยนภาษา', 'Change language')}
          onClick={toggleLanguage}
        >
          <span className={language === 'th' ? 'active' : ''}>TH</span>
          <i>/</i>
          <span className={language === 'en' ? 'active' : ''}>EN</span>
        </Box>
        <Box
          component="button"
          sx={[websiteSx['sb-menu-toggle']]}
          className="sb-menu-toggle"
          aria-label={
            open ? text('ปิดเมนู', 'Close menu') : text('เปิดเมนู', 'Open menu')
          }
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
          {links.map(([thaiLabel, englishLabel, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={pathname === href ? 'page' : undefined}
            >
              {text(thaiLabel, englishLabel)}
            </Link>
          ))}
          <Box
            component={Link}
            sx={[
              websiteSx['sb-button'],
              websiteSx['sb-button-gold'],
              websiteSx['sb-mobile-cta'],
            ]}
            className="sb-button sb-button-gold sb-mobile-cta"
            href="/franchise#apply"
            onClick={() => setOpen(false)}
          >
            {text('สนใจแฟรนไชส์', 'Own a franchise')}
          </Box>
          <Box
            component="a"
            sx={[
              websiteSx['sb-button'],
              websiteSx['sb-button-ghost'],
              websiteSx['sb-mobile-login'],
            ]}
            className="sb-button sb-button-ghost sb-mobile-login"
            href={franchiseLoginUrl}
            onClick={() => setOpen(false)}
          >
            {text('เข้าสู่ระบบแฟรนไชส์', 'Franchise login')}
          </Box>
        </Box>
      )}
    </Box>
  );
}
