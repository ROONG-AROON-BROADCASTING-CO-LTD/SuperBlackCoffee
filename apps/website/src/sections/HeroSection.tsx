import { Box, Button, Typography } from '@mui/material';
import Image from 'next/image';

export function HeroSection() {
  return (
    <Box
      component="section"
      id="top"
      sx={{
        minHeight: { xs: 680, md: 'calc(100vh - 108px)' },
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: 'minmax(0, 1.08fr) minmax(420px, .92fr)',
        },
        alignItems: 'center',
        mx: { xs: 1.5, md: 3 },
        mt: { xs: 2, md: 3 },
        px: { xs: 3, md: 'clamp(36px, 8vw, 128px)' },
        py: { xs: 6, md: 'clamp(70px, 10vw, 148px)' },
        overflow: 'hidden',
        position: 'relative',
        borderRadius: { xs: '24px', md: '34px' },
        bgcolor: '#171411',
        background:
          'radial-gradient(circle at 20% 0%, #4a3325 0, transparent 38%), #171411',
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Typography
          sx={{
            mb: 1.75,
            color: '#d8ac74',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          BREWED FOR YOUR MOMENT
        </Typography>
        <Typography
          component="h1"
          sx={{
            m: 0,
            color: '#fffaf7',
            fontSize: 'clamp(52px, 6.7vw, 108px)',
            fontWeight: 700,
            lineHeight: 0.92,
            letterSpacing: '-3.5px',
          }}
        >
          รสชาติที่ดี
          <br />
          <Box component="em" sx={{ color: '#d8ac74', fontStyle: 'normal' }}>
            เริ่มได้ทุกวัน
          </Box>
        </Typography>
        <Typography
          sx={{
            maxWidth: 430,
            my: 3.5,
            color: '#d8c8bd',
            fontSize: 17,
            lineHeight: 1.8,
          }}
        >
          Super Black Coffee คัดสรรทุกแก้วอย่างตั้งใจ
          ตั้งแต่เมล็ดกาแฟจนถึงช่วงเวลาที่คุณได้พัก
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="contained"
            href="#menu"
            sx={{
              borderRadius: '12px',
              px: 2.5,
              bgcolor: '#d8ac74',
              color: '#201914',
              fontFamily: 'Kanit, sans-serif',
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#efc38d' },
            }}
          >
            ดูเมนูของเรา
          </Button>
          <Button
            variant="outlined"
            href="#story"
            sx={{
              borderColor: 'rgba(255,255,255,.38)',
              borderRadius: '12px',
              color: '#fffaf7',
              fontFamily: 'Kanit, sans-serif',
              '&:hover': {
                borderColor: '#fffaf7',
                bgcolor: 'rgba(255,255,255,.08)',
              },
            }}
          >
            รู้จักเรา
          </Button>
        </Box>
      </Box>
      <Box
        sx={{
          position: { xs: 'absolute', md: 'relative' },
          inset: { xs: 0, md: 'auto' },
          order: { xs: -1, md: 0 },
          alignSelf: 'stretch',
          ml: { md: 4 },
          minHeight: { xs: 0, md: 560 },
          opacity: { xs: 0.25, md: 1 },
        }}
      >
        <Image
          src="/coffee/coffee-bean-ingredients.png"
          alt="เมล็ดกาแฟและวัตถุดิบ Super Black Coffee"
          fill
          priority
          sizes="(max-width: 900px) 100vw, 45vw"
          style={{
            objectFit: 'cover',
            borderRadius: '28px 0 0 28px',
            filter: 'saturate(.72) contrast(1.08)',
            maskImage: 'linear-gradient(to right, transparent, black 22%)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            right: { xs: 20, md: 22 },
            bottom: { xs: 20, md: 22 },
            p: '16px 18px',
            borderRadius: '14px',
            bgcolor: 'rgba(23,20,17,.86)',
            backdropFilter: 'blur(12px)',
            color: '#fffaf7',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 1.6,
            lineHeight: 1.35,
          }}
        >
          ROASTED
          <br />
          DAILY
        </Box>
      </Box>
    </Box>
  );
}
