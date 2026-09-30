import Image from 'next/image';
import Link from 'next/link';
import { Box, Typography } from '@mui/material';

const groups = [
  [
    'สำรวจ',
    [
      ['เกี่ยวกับเรา', '/about'],
      ['เมนู', '/menu'],
      ['สาขา', '/branches'],
    ],
  ],
  [
    'ธุรกิจ',
    [
      ['แฟรนไชส์', '/franchise'],
      ['บริการของเรา', '/services'],
      ['ติดต่อทีมงาน', '/contact'],
    ],
  ],
];

export function WebsiteFooter() {
  return (
    <Box
      component="footer"
      sx={{ bgcolor: '#171411', color: '#fff', pt: { xs: 7, md: 9 }, pb: 3 }}
    >
      <Box
        sx={{
          maxWidth: 1240,
          mx: 'auto',
          px: { xs: 2.5, md: 5 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.7fr repeat(3, 1fr)' },
          gap: { xs: 5, md: 4 },
        }}
      >
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              whiteSpace: 'nowrap',
            }}
          >
            <Image
              src="/brand/superblackcoffee-logo.png"
              alt="Super Black Coffee"
              width={48}
              height={48}
            />
            <Box
              sx={{ font: '800 13px/1 var(--font-inter)', letterSpacing: -0.1 }}
            >
              SUPER BLACK COFFEE
            </Box>
          </Box>
          <Typography
            sx={{
              color: 'rgba(255,255,255,.62)',
              mt: 2.5,
              maxWidth: 280,
              lineHeight: 1.75,
            }}
          >
            กาแฟที่ตั้งใจในทุกจังหวะ
            พร้อมพื้นที่และระบบที่ทำให้ธุรกิจเติบโตได้จริง
          </Typography>
        </Box>
        {groups.map(([title, links]) => (
          <Box
            key={title as string}
            sx={{ display: 'grid', alignContent: 'start', gap: 1.1 }}
          >
            <Typography sx={{ color: '#d09a3f', fontWeight: 700 }}>
              {title as string}
            </Typography>
            {(links as string[][]).map(([label, href]) => (
              <Link
                key={href}
                href={href}
                style={{ color: 'rgba(255,255,255,.68)', fontSize: 15 }}
              >
                {label}
              </Link>
            ))}
          </Box>
        ))}
        <Box sx={{ display: 'grid', alignContent: 'start', gap: 1.1 }}>
          <Typography sx={{ color: '#d09a3f', fontWeight: 700 }}>
            ติดต่อเรา
          </Typography>
          <a href="tel:021234567" style={{ color: 'rgba(255,255,255,.68)' }}>
            02-123-4567
          </a>
          <a
            href="mailto:hello@superblackcoffee.co.th"
            style={{ color: 'rgba(255,255,255,.68)' }}
          >
            hello@superblackcoffee.co.th
          </a>
          <Typography
            sx={{ color: 'rgba(255,255,255,.42)', fontSize: 13, mt: 0.5 }}
          >
            จันทร์–ศุกร์ 09:00–18:00 น.
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          maxWidth: 1240,
          mx: 'auto',
          px: { xs: 2.5, md: 5 },
          mt: { xs: 6, md: 8 },
          pt: 2.5,
          borderTop: '1px solid rgba(255,255,255,.14)',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          gap: 1.5,
          color: 'rgba(255,255,255,.42)',
          fontSize: 12,
        }}
      >
        <span>© {new Date().getFullYear()} SUPER BLACK COFFEE</span>
        <Box sx={{ display: 'flex', gap: 2.5 }}>
          <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link>
          <Link href="/terms">ข้อกำหนดการใช้งาน</Link>
        </Box>
      </Box>
    </Box>
  );
}
