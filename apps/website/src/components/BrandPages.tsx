// @ts-nocheck
'use client';
import Image from 'next/image';
import {
  Box,
  Button,
  Divider,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { trackEvent } from './GoogleAnalytics';

const brown = '#171411';
const gold = '#d09a3f';
const cream = '#f8f4ef';
const shell = { maxWidth: 1240, mx: 'auto', px: { xs: 2.5, md: 5 } };
const heading = { fontWeight: 600, letterSpacing: '-.025em', lineHeight: 1.16 };
const SearchAdornment = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="20"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="20"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const pill = {
  borderRadius: 999,
  px: 3,
  py: 1.25,
  fontWeight: 700,
  textTransform: 'none',
  transition:
    'transform .2s ease, background-color .2s ease, border-color .2s ease',
};
const menu = [
  ['Espresso', '90'],
  ['Americano', '100'],
  ['Latte', '120'],
  ['Cappuccino', '120'],
  ['Flat White', '120'],
  ['Mocha', '130'],
];
const branches = [
  [
    'อยุธยา',
    '15 78 หมู่ที่ 3 ถนน ป่ามะพร้าว ตำบลท่าวาสุกรี อำเภอ พระนครศรีอยุธยา จังหวัดพระนครศรีอยุธยา 13000',
    '📞 061-884-9960',
    '08:00–20:30 น.',
    'https://maps.app.goo.gl/B2sXw1XnoACsmphA9',
    'เปิดทุกวัน',
  ],
  [
    'พิษณุโลก',
    '654 18 ถนน พระองค์ขาว ซอย 4 ตำบล ในเมือง เมือง พิษณุโลก 65000',
    '📞 080-174-7757',
    '08:00–20:30 น.',
    'https://maps.app.goo.gl/rbCG1HbrHJXHffSk6',
    'เปิดทุกวัน',
  ],
  ['รัชดา', 'กรุงเทพมหานคร', '', '', '', 'พบกันเร็วๆนี้'],
];
const plans = [
  ['S', 'Smart Café', '20–40 ตร.ม.', 'Coffee & Beverage', '1.2–2.2 ล้านบาท'],
  [
    'M',
    'Lifestyle Café',
    '40–100 ตร.ม.',
    'Coffee, Food & Bakery',
    '2.5–4.5 ล้านบาท',
  ],
  [
    'L',
    'Lifestyle Hub',
    '100 ตร.ม. ขึ้นไป',
    'ครบทุกบริการของเรา',
    '5–10 ล้านบาท+',
  ],
];

function CTA({
  href,
  children,
  outline = false,
}: {
  href: string;
  children: React.ReactNode;
  outline?: boolean;
}) {
  return (
    <Button
      component="a"
      href={href}
      variant={outline ? 'outlined' : 'contained'}
      sx={{
        ...pill,
        fontWeight: 600,
        color: outline ? '#fff' : brown,
        borderColor: outline ? 'rgba(255,255,255,.68)' : gold,
        bgcolor: outline ? 'transparent' : gold,
        '&:hover': {
          transform: 'translateY(-2px)',
          bgcolor: outline ? 'rgba(255,255,255,.1)' : '#e1ae58',
          borderColor: outline ? '#fff' : '#e1ae58',
        },
      }}
    >
      {children}
    </Button>
  );
}

function BrandGallery() {
  const photo = (src: string, alt: string, title: string) => (
    <Box
      sx={{
        minHeight: { xs: 230, md: 260 },
        borderRadius: 5,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'end',
        p: { xs: 2.5, md: 3 },
        color: '#fff',
        '&:hover img': { transform: 'scale(1.04)' },
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 900px) 100vw, 30vw"
        style={{ objectFit: 'cover', transition: 'transform .45s ease' }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(transparent 45%, rgba(0,0,0,.6))',
        }}
      />
      <Typography
        variant="h5"
        sx={{ ...heading, position: 'relative', zIndex: 1 }}
      >
        {title}
      </Typography>
    </Box>
  );
  return (
    <Box component="section" sx={{ ...shell, py: { xs: 8, md: 12 } }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'end',
          gap: 3,
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h2" sx={{ ...heading, mt: 1 }}>
            ทุกช่วงเวลามีรสชาติของเรา
          </Typography>
        </Box>
        <Button
          component="a"
          href="/menu"
          sx={{
            color: brown,
            fontWeight: 700,
            textTransform: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          สำรวจเมนู →
        </Button>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.25fr .8fr .8fr' },
          gridTemplateRows: { xs: 'auto', md: 'repeat(2, 260px)' },
          gap: 2,
        }}
      >
        <Box sx={{ gridRow: { md: 'span 2' } }}>
          {photo(
            '/coffee/espresso.png',
            'กาแฟเอสเพรสโซ่',
            'กาแฟที่ตั้งใจในทุกแก้ว',
          )}
        </Box>
        {photo('/coffee/drinks.png', 'เครื่องดื่มกาแฟและมัทฉะ', 'สดใหม่ทุกวัน')}
        {photo(
          '/coffee/storefront.png',
          'หน้าร้าน Super Black Coffee',
          'พื้นที่สำหรับทุกช่วงเวลา',
        )}
        <Paper
          sx={{
            gridColumn: { md: '2 / 4' },
            p: { xs: 3, md: 4 },
            borderRadius: 5,
            bgcolor: brown,
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h5" sx={heading}>
            คุณภาพที่สัมผัสได้
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.68)', maxWidth: 560 }}>
            ตั้งใจเลือกทุกวัตถุดิบ เพื่อให้ทุกแก้วเป็นช่วงเวลาที่อยากกลับมา
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}

function BrandPromise() {
  const promises = [
    [
      '01',
      'คัดสรรวัตถุดิบ',
      'เลือกสิ่งที่ดีที่สุด เพื่อให้ทุกแก้วมีรสชาติที่ชัดเจน',
    ],
    [
      '02',
      'มาตรฐานทุกสาขา',
      'ประสบการณ์ที่ดีควรเกิดขึ้นได้เหมือนกันในทุกพื้นที่',
    ],
    [
      '03',
      'ระบบที่พร้อมเติบโต',
      'ดูแลร้านให้เดินหน้าได้จริง พร้อมทีมที่อยู่เคียงข้าง',
    ],
  ];
  return (
    <Box
      component="section"
      sx={{ bgcolor: brown, color: '#fff', py: { xs: 8, md: 11 } }}
    >
      <Box sx={{ ...shell }}>
        <Typography
          variant="h2"
          sx={{
            ...heading,
            fontSize: 'clamp(1.8rem, 3vw, 3rem)',
            maxWidth: 680,
          }}
        >
          กาแฟดีที่ออกแบบมาเพื่อการเติบโต
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: { xs: 4, md: 3 },
            mt: { xs: 6, md: 8 },
          }}
        >
          {promises.map(([number, title, text]) => (
            <Box
              key={number}
              sx={{ borderTop: '1px solid rgba(255,255,255,.3)', pt: 2.5 }}
            >
              <Typography
                sx={{ color: gold, fontSize: 13, letterSpacing: '.12em' }}
              >
                {number}
              </Typography>
              <Typography variant="h5" sx={{ ...heading, mt: 2 }}>
                {title}
              </Typography>
              <Typography
                sx={{
                  mt: 1.5,
                  color: 'rgba(255,255,255,.68)',
                  lineHeight: 1.7,
                }}
              >
                {text}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function BrandStats() {
  const stats = [
    ['☕', '120+', 'สาขาทั่วประเทศ', 'กาแฟคุณภาพในทุกพื้นที่'],
    ['◒', '100%', 'เมล็ดกาแฟคุณภาพ', 'คัดสรรอย่างพิถีพิถัน'],
    ['ϟ', '80+', 'จุดชาร์จ EV', 'พลังงานสะอาดเพื่อทุกการเดินทาง'],
    ['♧', '20,000+', 'ลูกค้าประจำ', 'ประสบการณ์ที่กลับมาได้เสมอ'],
  ];
  return (
    <Box
      component="section"
      sx={{
        bgcolor: brown,
        color: '#fff',
        py: { xs: 2.5, md: 3 },
        borderBottom: '1px solid rgba(255,255,255,.08)',
      }}
    >
      <Box sx={{ ...shell }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          }}
        >
          {stats.map(([icon, value, label, description], i) => (
            <Box
              key={label}
              sx={{
                minHeight: { xs: 112, md: 100 },
                px: { xs: 1.5, md: 3 },
                py: { xs: 1.5, md: 1 },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '42px 1fr' },
                gap: { xs: 0.5, md: 1.25 },
                alignItems: 'center',
                borderRight: {
                  xs: i % 2 === 0 ? '1px solid rgba(255,255,255,.18)' : 'none',
                  md: i !== 3 ? '1px solid rgba(255,255,255,.18)' : 'none',
                },
                borderBottom: {
                  xs: i < 2 ? '1px solid rgba(255,255,255,.18)' : 'none',
                  md: 'none',
                },
              }}
            >
              <Typography
                aria-hidden
                sx={{
                  color: gold,
                  fontSize: { xs: 27, md: 34 },
                  lineHeight: 1,
                  textAlign: { xs: 'left', md: 'center' },
                }}
              >
                {icon}
              </Typography>
              <Box>
                <Typography
                  sx={{
                    color: '#fff',
                    fontSize: { xs: '1.35rem', md: '1.55rem' },
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {value}
                </Typography>
                <Typography
                  sx={{
                    color: '#d09a3f',
                    fontSize: { xs: 10, md: 11 },
                    fontWeight: 700,
                    mt: 0.65,
                    lineHeight: 1.2,
                  }}
                >
                  {label}
                </Typography>
                <Typography
                  sx={{
                    color: 'rgba(255,255,255,.6)',
                    fontSize: { xs: 10, md: 11 },
                    mt: 0.35,
                  }}
                >
                  {description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function BrandStory() {
  return (
    <Box
      component="section"
      sx={{
        ...shell,
        py: { xs: 8, md: 12 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '.95fr 1.05fr' },
        gap: { xs: 5, md: 7 },
        alignItems: 'center',
      }}
    >
      <Box>
        <Typography
          variant="h2"
          sx={{ ...heading, fontSize: 'clamp(1.8rem, 3vw, 3rem)', mt: 1.5 }}
        >
          เริ่มต้นจากความตั้งใจ สู่แบรนด์ที่พร้อมเติบโต
        </Typography>
        <Typography sx={{ mt: 3, color: '#6b625c', lineHeight: 1.85 }}>
          กาแฟที่ดีเริ่มจากรายละเอียดที่ใส่ใจ
          และธุรกิจที่ดีต้องมีระบบที่ทำให้ทุกคนเติบโตได้จริง
          เราจึงออกแบบทุกขั้นตอน ตั้งแต่วัตถุดิบไปจนถึงประสบการณ์หน้าร้าน
        </Typography>
        <Button
          component="a"
          href="/about"
          sx={{
            mt: 3,
            p: 0,
            color: brown,
            fontWeight: 700,
            textTransform: 'none',
          }}
        >
          รู้จักเรื่องราวของเรา →
        </Button>
      </Box>
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 300, md: 500 },
          borderRadius: 5,
          overflow: 'hidden',
        }}
      >
        <Image
          src="/coffee/storefront.png"
          alt="หน้าร้าน Super Black Coffee"
          fill
          sizes="(max-width: 900px) 100vw, 52vw"
          style={{ objectFit: 'cover' }}
        />
      </Box>
    </Box>
  );
}

function MenuHighlight() {
  return (
    <Box component="section" sx={{ bgcolor: '#eee5db', py: { xs: 8, md: 11 } }}>
      <Box
        sx={{
          ...shell,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '.85fr 1.15fr' },
          gap: { xs: 5, md: 9 },
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography
            variant="h2"
            sx={{ ...heading, fontSize: 'clamp(1.8rem, 3vw, 3rem)', mt: 1.5 }}
          >
            เมนูที่ตั้งใจในทุกแก้ว
          </Typography>
          <Typography sx={{ mt: 2.5, color: '#6b625c', lineHeight: 1.8 }}>
            รสชาติที่ชัดเจน
            จากวัตถุดิบที่เราเลือกเองและความพิถีพิถันของทีมบาริสต้า
          </Typography>
          <Button
            component="a"
            href="/menu"
            sx={{
              mt: 3,
              p: 0,
              color: brown,
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            ดูเมนูทั้งหมด →
          </Button>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: { xs: 2, md: 3 },
            alignItems: 'stretch',
          }}
        >
          <Box
            sx={{
              minHeight: { xs: 240, md: 340 },
              position: 'relative',
              borderRadius: 4,
              overflow: 'hidden',
              gridRow: 'span 2',
            }}
          >
            <Image
              src="/coffee/espresso.png"
              alt="เอสเพรสโซ่"
              fill
              sizes="(max-width: 900px) 50vw, 30vw"
              style={{ objectFit: 'cover' }}
            />
          </Box>
          <Box sx={{ borderTop: '1px solid #bfae9f', py: 2 }}>
            <Typography sx={{ color: '#8c5d39', fontSize: 13 }}>
              01 · COFFEE
            </Typography>
            <Typography variant="h6" sx={{ ...heading, mt: 0.75 }}>
              เอสเพรสโซ่
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b625c', mt: 0.5 }}>
              เข้ม ชัด หอมยาว
            </Typography>
          </Box>
          <Box sx={{ borderTop: '1px solid #bfae9f', py: 2 }}>
            <Typography sx={{ color: '#8c5d39', fontSize: 13 }}>
              02 · SIGNATURE
            </Typography>
            <Typography variant="h6" sx={{ ...heading, mt: 0.75 }}>
              ลาเต้ซิกเนเจอร์
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b625c', mt: 0.5 }}>
              นุ่มละมุนในทุกจิบ
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function ServicesStrip() {
  const services = [
    [
      '/service-coffee.png',
      'COFFEE & BEVERAGE',
      'กาแฟพรีเมียมที่คัดสรรอย่างตั้งใจ',
      '#d09a3f',
    ],
    [
      '/service-ev.png',
      'EV CHARGING',
      'ชาร์จพลังให้ชีวิตระหว่างการเดินทาง',
      '#71b65e',
    ],
    [
      '/service-work.png',
      'WORK & RELAX',
      'พื้นที่ทำงานและพักผ่อนที่มี Wi‑Fi',
      '#d09a3f',
    ],
    [
      '/service-bakery.png',
      'BAKERY & FOOD',
      'เบเกอรี่และอาหารที่ทำสดใหม่',
      '#e1a447',
    ],
    [
      '/service-lifestyle.png',
      'LIFESTYLE GOODS',
      'สินค้าและของใช้ที่สะท้อนตัวตน',
      '#d09a3f',
    ],
  ];
  return (
    <Box
      component="section"
      sx={{ bgcolor: cream, color: brown, py: { xs: 7, md: 10 } }}
    >
      <Box sx={{ ...shell }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h3"
            sx={{ ...heading, fontSize: 'clamp(1.6rem, 2.6vw, 2.4rem)' }}
          >
            มากกว่ากาแฟ เพื่อไลฟ์สไตล์ของคุณ
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(5, 1fr)',
            },
            gap: 1.5,
          }}
        >
          {services.map(([image, title, text, accent]) => (
            <Box
              key={title}
              sx={{
                bgcolor: brown,
                color: '#fff',
                overflow: 'hidden',
                borderRadius: 2.5,
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid rgba(208,154,63,.55)',
                '&:hover img': { transform: 'scale(1.04)' },
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1 / 1',
                  overflow: 'hidden',
                }}
              >
                <Image
                  src={image}
                  alt={title}
                  fill
                  sizes="(max-width: 900px) 50vw, 20vw"
                  style={{
                    objectFit: 'cover',
                    transition: 'transform .45s ease',
                  }}
                />
              </Box>
              <Box
                sx={{
                  p: 2.25,
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                }}
              >
                <Typography
                  sx={{
                    color: accent,
                    fontWeight: 700,
                    fontSize: 15,
                    lineHeight: 1.2,
                  }}
                >
                  {title}
                </Typography>
                <Typography
                  sx={{
                    mt: 1,
                    color: 'rgba(255,255,255,.82)',
                    fontSize: 14,
                    lineHeight: 1.55,
                  }}
                >
                  {text}
                </Typography>
                <Typography
                  component="a"
                  href="/services"
                  sx={{
                    display: 'inline-block',
                    mt: 'auto',
                    pt: 2,
                    color: accent,
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: 'none',
                  }}
                >
                  LEARN MORE&nbsp; ↗
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function BranchAndFranchiseSection() {
  const localBranches = branches.slice(0, 3);
  return (
    <>
      <Box component="section" sx={{ ...shell, py: { xs: 8, md: 10 } }}>
        <Typography
          variant="h3"
          sx={{
            ...heading,
            mt: 0.8,
            fontSize: 'clamp(1.6rem, 2.6vw, 2.35rem)',
          }}
        >
          ค้นหาสาขาใกล้คุณ
        </Typography>
        <Box sx={{ mt: 3 }}>
          {localBranches.map(([name, address, phone, hours], i) => (
            <Box
              key={name}
              sx={{
                display: 'grid',
                gridTemplateColumns: '88px 1fr auto',
                gap: 2,
                alignItems: 'center',
                py: 1.8,
                borderBottom: '1px solid #e2d6ca',
              }}
            >
              <Box
                sx={{
                  height: 64,
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <Image
                  src={
                    i === 1 ? '/coffee/drinks.png' : '/coffee/storefront.png'
                  }
                  alt={name}
                  fill
                  sizes="88px"
                  style={{ objectFit: 'cover' }}
                />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{name}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {address}
                </Typography>
                <Typography variant="caption" color="#8c5d39">
                  มีที่จอดรถ · EV Charger · Wi‑Fi
                </Typography>
              </Box>
              <Typography aria-hidden sx={{ fontSize: 24, color: '#8c5d39' }}>
                ›
              </Typography>
            </Box>
          ))}
        </Box>
        <Button
          component="a"
          href="/branches"
          variant="outlined"
          sx={{ ...pill, mt: 3, borderColor: '#d09a3f', color: brown }}
        >
          ดูทุกสาขา
        </Button>
      </Box>
      <Box
        component="section"
        sx={{ bgcolor: '#eee5db', py: { xs: 8, md: 10 } }}
      >
        <Box sx={{ ...shell }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'end',
              gap: 2,
            }}
          >
            <Box>
              <Typography
                variant="h3"
                sx={{ ...heading, fontSize: 'clamp(1.6rem, 2.6vw, 2.35rem)' }}
              >
                ร่วมเป็นส่วนหนึ่งกับเรา
              </Typography>
            </Box>
            <Button
              component="a"
              href="/franchise"
              variant="outlined"
              sx={{
                ...pill,
                borderColor: '#d09a3f',
                color: brown,
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            >
              ดูแฟรนไชส์
            </Button>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              mt: 3,
              gap: 1.5,
              alignItems: 'stretch',
            }}
          >
            {plans.map(([size, name, area, service, cost], i) => {
              const images = [
                '/franchise-s.png',
                '/franchise-m.png',
                '/franchise-l.png',
              ];
              const tones = ['#3f7d3c', '#b37a18', '#b72d24'];
              const title =
                size === 'S'
                  ? 'S – SMART CAFÉ'
                  : size === 'M'
                    ? 'M – LIFESTYLE CAFÉ'
                    : 'L – LIFESTYLE HUB';
              const facilities =
                size === 'S'
                  ? ['กาแฟ', 'EV Charging · 1 สถานี']
                  : size === 'M'
                    ? [
                        'กาแฟ',
                        'อาหาร & เบเกอรี่',
                        'BPOST65 Express',
                        'ไปรษณีย์ (Post Office)',
                        'EV Charging · 2 สถานี',
                      ]
                    : [
                        'กาแฟ',
                        'อาหาร & เบเกอรี่',
                        'BPOST65 Express',
                        'ไปรษณีย์ (Post Office)',
                        'EV Charging · 4 สถานี',
                        'Work Zone',
                        'Mobile Café',
                      ];
              return (
                <Paper
                  key={size}
                  sx={{
                    bgcolor: i === 1 ? '#201b17' : '#171411',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    boxShadow: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    transform: i === 1 ? 'translateY(-10px)' : 'none',
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: tones[i],
                      px: { xs: 2, md: 2.5 },
                      py: 1.25,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: { xs: 24, md: 30 },
                      }}
                    >
                      {size}
                    </Typography>
                    <Typography
                      sx={{ fontWeight: 700, fontSize: { xs: 13, md: 16 } }}
                    >
                      {title.slice(4)}
                    </Typography>
                    {i === 1 && (
                      <Box
                        sx={{
                          ml: 'auto',
                          px: 1.25,
                          py: 0.45,
                          bgcolor: gold,
                          color: brown,
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        แนะนำ
                      </Box>
                    )}
                  </Box>
                  <Box
                    sx={{ position: 'relative', height: { xs: 150, md: 175 } }}
                  >
                    <Image
                      src={images[i]}
                      alt={title}
                      fill
                      sizes="(max-width: 900px) 100vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'linear-gradient(transparent 45%, rgba(0,0,0,.75))',
                      }}
                    />
                    <Typography
                      sx={{
                        position: 'absolute',
                        bottom: 1.5,
                        left: 2,
                        right: 2,
                        fontSize: 12,
                        color: '#fff',
                      }}
                    >
                      {area} · {service}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: { xs: 2, md: 2.5 },
                      pb: { xs: 1.25, md: 1.5 },
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        textAlign: 'center',
                        color: gold,
                        fontSize: { xs: '1.3rem', md: '1.65rem' },
                        fontWeight: 700,
                      }}
                    >
                      {i === 0
                        ? '1.5–2.5 ล้านบาท'
                        : i === 1
                          ? '3.5–5 ล้านบาท'
                          : '7–10 ล้านบาทขึ้นไป'}
                    </Typography>
                    <Typography
                      sx={{
                        textAlign: 'center',
                        color: 'rgba(255,255,255,.7)',
                        fontSize: 12,
                        mt: 0.5,
                      }}
                    >
                      ค่าแฟรนไชส์เริ่มต้น{' '}
                      {i === 0 ? '300,000' : i === 1 ? '500,000' : '700,000'}{' '}
                      บาท
                    </Typography>
                    <Box
                      sx={{
                        mt: 2,
                        mb: { xs: 1.5, md: 2.5 },
                        display: 'grid',
                        gap: 0.7,
                      }}
                    >
                      {facilities.map((facility) => (
                        <Box
                          key={facility}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1,
                            py: 0.65,
                            borderRadius: 1,
                            bgcolor: 'rgba(255,255,255,.07)',
                          }}
                        >
                          <Typography
                            sx={{
                              color: gold,
                              fontWeight: 700,
                              fontSize: 14,
                              lineHeight: 1,
                            }}
                          >
                            ✓
                          </Typography>
                          <Typography
                            sx={{
                              color: '#fff',
                              fontSize: { xs: 12, md: 13 },
                              fontWeight: 600,
                              lineHeight: 1.35,
                            }}
                          >
                            {facility}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <Button
                      component="a"
                      href="/franchise"
                      fullWidth
                      variant={i === 1 ? 'contained' : 'outlined'}
                      sx={{
                        mt: 'auto',
                        py: 1,
                        minHeight: 38,
                        fontSize: 12,
                        color: '#fff',
                        borderColor: gold,
                        bgcolor: i === 1 ? gold : 'transparent',
                      }}
                    >
                      สนใจแฟรนไชส์
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Box>
      </Box>
    </>
  );
}

export function HomeContent() {
  return (
    <>
      <Box
        component="section"
        sx={{
          position: 'relative',
          color: '#fff',
          overflow: 'hidden',
          textAlign: 'center',
          bgcolor: brown,
        }}
      >
        <Image
          src="/brand-hero.png"
          alt="ร้าน Super Black Coffee"
          width={1672}
          height={941}
          priority
          unoptimized
          sizes="100vw"
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
        <Box
          sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(12,10,8,.52)' }}
        />
        <Box
          sx={{
            ...shell,
            position: 'absolute',
            inset: 0,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 6,
          }}
        >
          <Typography
            component="h1"
            sx={{
              ...heading,
              letterSpacing: { xs: '-.01em', md: 0 },
              lineHeight: 1.18,
              fontWeight: 500,
              fontSize: 'clamp(2rem, 4vw, 4.15rem)',
              maxWidth: 760,
              textWrap: 'balance',
            }}
          >
            กาแฟไทย พลังสะอาด
            <br />
            <Box
              component="em"
              sx={{
                color: '#fff',
                fontStyle: 'normal',
                display: 'inline-block',
                mt: { xs: 0.5, md: 0.75 },
              }}
            >
              เพื่อทุกการเดินทาง
            </Box>
          </Typography>
          <Typography
            sx={{
              mt: 2.5,
              maxWidth: 'none',
              whiteSpace: { xs: 'normal', md: 'nowrap' },
              color: 'rgba(255,255,255,.8)',
              fontSize: { xs: '.98rem', md: '1rem' },
              lineHeight: 1.7,
            }}
          >
            สัมผัสประสบการณ์กาแฟพรีเมียม พลังงานสะอาด
            ในพื้นที่ที่ออกแบบมาเพื่อทุกไลฟ์สไตล์
          </Typography>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ mt: 3.5, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <CTA href="/branches">ค้นหาสาขาใกล้คุณ</CTA>
            <CTA href="/services" outline>
              ดูเมนูทั้งหมด
            </CTA>
          </Stack>
        </Box>
      </Box>
      <BrandStats />
      <BrandStory />
      <ServicesStrip />
      <BranchAndFranchiseSection />
    </>
  );
}

export function AboutContent() {
  return (
    <PageIntro
      title="เรื่องราวที่เริ่มจากแก้วกาแฟ"
      text="เราอยากสร้างพื้นที่ที่กาแฟดี ผู้คนดี และธุรกิจที่ดีเติบโตไปพร้อมกัน"
      image="/brand-hero.png"
    >
      <ContentSection title="คุณภาพไม่ใช่ทางเลือก">
        <Typography>
          ตั้งแต่การเลือกเมล็ดกาแฟ การฝึกทีมบาริสต้า ไปจนถึงการดูแลทุกสาขา
          เราออกแบบทุกขั้นตอนให้ส่งมอบประสบการณ์ที่เหมือนกันในทุกแก้ว
        </Typography>
        <Typography>
          SUPER BLACK COFFEE คือแพลตฟอร์มที่พร้อมเติบโตไปกับชุมชนและผู้ประกอบการ
        </Typography>
      </ContentSection>
    </PageIntro>
  );
}

export function MenuContent() {
  const [activeCategory, setActiveCategory] = useState('กาแฟ');
  const categories = ['กาแฟ', 'ชาและมัทฉะ', 'เครื่องดื่ม', 'เบเกอรี่'];
  const displayedMenu =
    activeCategory === 'กาแฟ'
      ? menu
      : activeCategory === 'ชาและมัทฉะ'
        ? [
            ['มัทฉะลาเต้', '125'],
            ['ชาไทย', '95'],
          ]
        : activeCategory === 'เครื่องดื่ม'
          ? [
              ['โกโก้', '105'],
              ['อิตาเลียนโซดา', '85'],
            ]
          : [
              ['ครัวซองต์', '85'],
              ['บราวนี่', '75'],
            ];
  return (
    <PageIntro
      title="เมนูที่ตั้งใจในทุกแก้ว"
      text="รสชาติที่ชัดเจน จากวัตถุดิบที่เราเลือกเอง"
      image="/coffee-ingredients.png"
    >
      <Box sx={{ ...shell, py: { xs: 7, md: 10 } }}>
        <Stack direction="row" gap={1} sx={{ mb: 5, flexWrap: 'wrap' }}>
          {categories.map((x) => (
            <Button
              key={x}
              onClick={() => setActiveCategory(x)}
              variant={activeCategory === x ? 'contained' : 'outlined'}
              sx={{
                ...pill,
                minHeight: 40,
                px: 2.25,
                color: activeCategory === x ? '#fff' : brown,
                borderColor: '#cdbbaa',
                bgcolor: activeCategory === x ? brown : 'transparent',
                '&:hover': {
                  bgcolor: activeCategory === x ? brown : '#efe5db',
                },
              }}
            >
              {x}
            </Button>
          ))}
        </Stack>
        <Typography variant="h2" sx={{ ...heading, mb: 1 }}>
          {activeCategory}
        </Typography>
        {displayedMenu.map(([name, price]) => (
          <Box
            key={name}
            sx={{
              py: { xs: 2.25, md: 2.75 },
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e2d6ca',
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{name}</Typography>
              <Typography variant="body2" color="text.secondary">
                กาแฟคุณภาพคั่วอย่างพิถีพิถัน
              </Typography>
            </Box>
            <Typography
              sx={{ fontWeight: 700, fontSize: '1.12rem' }}
              color="#8c5d39"
            >
              ฿{price}
            </Typography>
          </Box>
        ))}
      </Box>
    </PageIntro>
  );
}

export function BranchesContent() {
  const [query, setQuery] = useState('');
  const filteredBranches = branches.filter(([name, address]) =>
    `${name} ${address}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <PageIntro
      title="พบกับเราได้ทุกวัน"
      text="ค้นหาสาขาและบริการที่ใกล้คุณที่สุด"
      image="/brand-hero.png"
    >
      <Box sx={{ ...shell, py: { xs: 7, md: 10 } }}>
        <TextField
          fullWidth
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ค้นหาสาขา"
          sx={{
            mb: 3,
            maxWidth: 540,
            bgcolor: '#fff',
            '& .MuiOutlinedInput-root': { borderRadius: '12px' },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchAdornment />
                </InputAdornment>
              ),
            },
          }}
        />
        {filteredBranches.map(
          ([name, address, phone, hours, mapUrl, status], i) => (
            <Box
              key={name}
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '40px minmax(0, 1fr)',
                  md: '64px minmax(0, 1fr) 180px',
                },
                gap: { xs: 1.5, md: 2.5 },
                alignItems: 'start',
                py: { xs: 3, md: 3.5 },
                borderBottom: '1px solid #e2d6ca',
              }}
            >
              <Typography sx={{ color: '#a97943', fontWeight: 700, pt: 0.25 }}>
                0{i + 1}
              </Typography>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    fontSize: 'clamp(1.2rem, 2vw, 1.55rem)',
                    mb: 0.75,
                  }}
                >
                  {name}
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ lineHeight: 1.65, overflowWrap: 'anywhere' }}
                >
                  {address}
                </Typography>
                {phone && (
                  <Typography
                    variant="body1"
                    color="#8c5d39"
                    sx={{ mt: 1, fontWeight: 600 }}
                  >
                    {phone}
                  </Typography>
                )}
                {mapUrl && (
                  <Typography
                    component="a"
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    variant="body2"
                    sx={{
                      display: 'inline-block',
                      mt: 1.25,
                      color: '#a97943',
                      fontWeight: 700,
                    }}
                  >
                    เปิด Google Maps ↗
                  </Typography>
                )}
              </Box>
              <Box
                sx={{
                  gridColumn: { xs: '2', md: 'auto' },
                  textAlign: { xs: 'left', md: 'right' },
                  mt: { xs: 1, md: 0.5 },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: status === 'พบกันเร็วๆนี้' ? '#a97943' : 'inherit',
                  }}
                >
                  {status}
                </Typography>
                {hours && (
                  <Typography variant="body2" color="text.secondary">
                    {hours}
                  </Typography>
                )}
              </Box>
            </Box>
          ),
        )}
        {!filteredBranches.length && (
          <Typography sx={{ py: 6, color: 'text.secondary' }}>
            ไม่พบสาขาที่ค้นหา
          </Typography>
        )}
      </Box>
    </PageIntro>
  );
}

export function FranchiseContent() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    province: '',
    plan: '',
    message: '',
  });
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>(
    'idle',
  );
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState('sending');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'}/website/leads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, topic: 'franchise' }),
        },
      );
      if (!response.ok) throw new Error();
      trackEvent('generate_lead', { form_name: 'franchise' });
      setState('success');
      setForm({
        name: '',
        phone: '',
        email: '',
        province: '',
        plan: '',
        message: '',
      });
    } catch {
      setState('error');
    }
  };
  return (
    <>
      <PageIntro
        title="ธุรกิจที่เติบโตไปด้วยกัน"
        text="เริ่มต้นแฟรนไชส์ในรูปแบบที่เหมาะกับพื้นที่และเป้าหมายของคุณ"
        image="/brand-hero.png"
      />
      <Box sx={{ ...shell, py: { xs: 7, md: 10 } }}>
        <Typography variant="h2" sx={{ ...heading, mb: 4.5 }}>
          เลือกรูปแบบแฟรนไชส์
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' },
            gap: 1.5,
          }}
        >
          {plans.map(([size, name, area, service, cost]) => (
            <Paper
              key={size}
              sx={{
                p: { xs: 3, md: 3.5 },
                borderRadius: 3,
                border: '1px solid #e2d6ca',
                bgcolor: '#fffdf9',
                boxShadow: 'none',
                transition: 'transform .2s ease, border-color .2s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  borderColor: '#d09a3f',
                },
              }}
            >
              <Typography
                sx={{
                  ...heading,
                  fontSize: '4rem',
                  color:
                    size === 'S'
                      ? '#3f7d3c'
                      : size === 'M'
                        ? '#b37a18'
                        : '#b72d24',
                }}
              >
                {size}
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {name}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography color="text.secondary">พื้นที่แนะนำ</Typography>
              <Typography fontWeight={700}>{area}</Typography>
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                บริการหลัก
              </Typography>
              <Typography fontWeight={700}>{service}</Typography>
              <Typography variant="h6" sx={{ mt: 3 }} color="#8c5d39">
                {cost}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
      <Box
        id="apply"
        sx={{ bgcolor: brown, color: '#fff', py: { xs: 8, md: 10 } }}
      >
        <Box sx={{ ...shell, textAlign: 'center' }}>
          <Typography variant="h2" sx={heading}>
            เริ่มต้นเพียง 5 ขั้นตอน
          </Typography>
          <Typography sx={{ mt: 2, color: 'rgba(255,255,255,.7)' }}>
            กรอกข้อมูล · นัดพูดคุย · ประเมินทำเล · สรุปสัญญา · เตรียมเปิดร้าน
          </Typography>
          <Box
            component="form"
            onSubmit={submit}
            sx={{
              mt: 4,
              mx: 'auto',
              maxWidth: 720,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.5,
              textAlign: 'left',
            }}
          >
            <TextField
              required
              label="ชื่อ"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              required
              type="tel"
              label="เบอร์โทรศัพท์"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <TextField
              type="email"
              label="อีเมล"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              label="จังหวัด / ทำเลที่สนใจ"
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
            />
            <TextField
              select
              label="รูปแบบที่สนใจ"
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
            >
              <MenuItem value="">ยังไม่แน่ใจ</MenuItem>
              <MenuItem value="S">Smart Café</MenuItem>
              <MenuItem value="M">Lifestyle Café</MenuItem>
              <MenuItem value="L">Lifestyle Hub</MenuItem>
            </TextField>
            <TextField
              label="ข้อความเพิ่มเติม"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
            <Box sx={{ gridColumn: { sm: '1 / -1' }, textAlign: 'center' }}>
              <Button
                type="submit"
                disabled={state === 'sending'}
                variant="contained"
                sx={{ ...pill, bgcolor: gold, color: brown }}
              >
                {state === 'sending'
                  ? 'กำลังส่ง...'
                  : 'ส่งข้อมูลให้ทีมแฟรนไชส์'}
              </Button>
              {state === 'success' && (
                <Typography sx={{ mt: 1.5, color: '#dff2d8' }}>
                  ส่งข้อมูลถึงทีมงานแล้ว เราจะติดต่อกลับโดยเร็วที่สุด
                </Typography>
              )}
              {state === 'error' && (
                <Typography sx={{ mt: 1.5, color: '#ffd1c8' }}>
                  ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}

export function ServicesContent() {
  const services = [
    'Coffee & Beverage',
    'Food & Bakery',
    'BPOST65 Express',
    'EV Charging',
    'Mobile Café',
  ];

  return (
    <PageIntro
      title="มากกว่ากาแฟในทุกพื้นที่"
      text="บริการที่ออกแบบให้ทุกทำเลมีศักยภาพมากขึ้น"
      image="/brand-hero.png"
    >
      <Box sx={{ ...shell, py: 8 }}>
        {services.map((item, i) => (
          <Box
            key={item}
            sx={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr auto',
              gap: 2,
              py: 3,
              borderBottom: '1px solid #e2d6ca',
            }}
          >
            <Typography color="#a97943">0{i + 1}</Typography>
            <Box>
              <Typography variant="h4" sx={heading}>
                {item}
              </Typography>
              <Typography color="text.secondary">
                บริการคุณภาพที่เติมเต็มทุกพื้นที่ของคุณ
              </Typography>
            </Box>
            <Typography variant="h4">→</Typography>
          </Box>
        ))}
      </Box>
    </PageIntro>
  );
}

export function NewsContent() {
  const posts = [
    'รวมโมเมนต์ดี ๆ กับชุมชนคนรักกาแฟ',
    'เปิดตัวเมนูใหม่ เอสเพรสโซ่ซิกเนเจอร์',
    'ส่งต่ออนาคตที่ดีให้กับชุมชนกาแฟไทย',
  ];
  return (
    <PageIntro
      dark
      title="เรื่องราวจาก SUPER BLACK COFFEE"
      text="ข่าวสาร โปรโมชัน และเรื่องราวที่เราอยากแบ่งปัน"
      image="/brand-hero.png"
    >
      <Box sx={{ ...shell, py: 8, color: '#fff' }}>
        {posts.map((title, i) => (
          <Box
            key={title}
            sx={{ py: 3, borderBottom: '1px solid rgba(255,255,255,.2)' }}
          >
            <Typography color={gold}>ข่าวสาร · 0{i + 1}</Typography>
            <Typography variant="h4" sx={heading}>
              {title}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.66)' }}>
              ติดตามเรื่องราวและกิจกรรมล่าสุดจาก SUPER BLACK COFFEE
            </Typography>
          </Box>
        ))}
      </Box>
    </PageIntro>
  );
}

export function ContactContent() {
  return (
    <PageIntro
      dark
      title="เริ่มต้นบทสนทนากับเรา"
      text="ไม่ว่าจะเป็นเรื่องสาขา แฟรนไชส์ หรือความร่วมมือ เรายินดีรับฟัง"
      image="/brand-hero.png"
    >
      <Box
        sx={{
          ...shell,
          py: 8,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1.2fr' },
          gap: 6,
          color: '#fff',
        }}
      >
        <Stack spacing={3}>
          <Typography>
            <b>LINE</b>
            <br />
            @superblackcoffee
          </Typography>
          <Typography>
            <b>โทรศัพท์</b>
            <br />
            02-123-4567
          </Typography>
          <Typography>
            <b>อีเมล</b>
            <br />
            hello@superblackcoffee.co.th
          </Typography>
        </Stack>
        <Box component="form" sx={{ display: 'grid', gap: 2 }}>
          <TextField label="ชื่อ" required fullWidth />
          <TextField label="เบอร์โทรศัพท์" required type="tel" fullWidth />
          <TextField label="อีเมล" required type="email" fullWidth />
          <TextField select label="สนใจเรื่อง" defaultValue="" fullWidth>
            <MenuItem value="" disabled>
              เลือกหัวข้อที่คุณสนใจ
            </MenuItem>
            <MenuItem value="franchise">แฟรนไชส์</MenuItem>
            <MenuItem value="branch">สาขาและบริการ</MenuItem>
          </TextField>
          <TextField label="ข้อความ" multiline rows={4} fullWidth />
          <Button
            type="submit"
            variant="contained"
            sx={{ ...pill, bgcolor: gold, color: brown, justifySelf: 'start' }}
          >
            ส่งข้อความ
          </Button>
        </Box>
      </Box>
    </PageIntro>
  );
}

function ContentSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ ...shell, py: { xs: 7, md: 10 }, display: 'grid', gap: 2 }}>
      <Typography
        variant="h2"
        sx={{ ...heading, fontSize: 'clamp(1.8rem, 3vw, 2.8rem)' }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function PageIntro({
  title,
  text,
  image,
  dark = false,
  children,
}: {
  title: string;
  text: string;
  image: string;
  dark?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Box sx={{ bgcolor: dark ? brown : cream, color: dark ? '#fff' : brown }}>
      <Box
        component="section"
        sx={{
          ...shell,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(0, .9fr) minmax(0, 1.1fr)',
          },
          gap: { xs: 4, md: 7 },
          alignItems: 'center',
          py: { xs: 7, md: 11 },
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              ...heading,
              fontSize: 'clamp(1.95rem, 3.5vw, 3.5rem)',
              textWrap: 'balance',
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              mt: 2.5,
              color: dark ? 'rgba(255,255,255,.72)' : '#6b625c',
              fontSize: { xs: '1rem', md: '1.1rem' },
              lineHeight: 1.75,
              maxWidth: 520,
            }}
          >
            {text}
          </Typography>
        </Box>
        <Box
          sx={{
            position: 'relative',
            minHeight: { xs: 280, md: 420 },
            overflow: 'hidden',
            borderRadius: 4,
          }}
        >
          <Image
            src={image}
            alt="Super Black Coffee"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 55vw"
            style={{ objectFit: 'cover' }}
          />
        </Box>
      </Box>
      {children}
    </Box>
  );
}
