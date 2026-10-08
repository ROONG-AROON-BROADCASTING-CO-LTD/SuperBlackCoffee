import { Box, Button, Typography } from '@mui/material';
export function VisitSection() {
  return (
    <Box
      component="section"
      id="stores"
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 5,
        p: {
          xs: '70px 24px',
          md: 'clamp(70px, 9vw, 130px) clamp(24px, 16vw, 260px)',
        },
        color: '#fff',
        bgcolor: '#805637',
        background: 'linear-gradient(125deg, #805637, #5f4030)',
        overflow: 'hidden',
      }}
    >
      <Box>
        <Typography
          sx={{
            mb: 1.75,
            color: '#f3e9e3',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          FIND YOUR BLACK
        </Typography>
        <Typography
          component="h2"
          sx={{
            m: 0,
            fontSize: 'clamp(48px, 6vw, 92px)',
            fontWeight: 700,
            lineHeight: 0.98,
            letterSpacing: '-2.7px',
          }}
        >
          พบกันได้
          <br />
          ใกล้คุณ
        </Typography>
        <Typography
          sx={{
            maxWidth: 430,
            my: 3,
            color: '#f3e9e3',
            fontSize: 17,
            lineHeight: 1.8,
          }}
        >
          แวะมาดื่มกาแฟแก้วโปรดได้ที่ Super Black Coffee ทุกสาขา
        </Typography>
        <Button
          variant="contained"
          sx={{
            bgcolor: '#fff',
            color: '#201914',
            borderRadius: '12px',
            fontFamily: 'IBM Plex Sans Thai, sans-serif',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#f7eee8', boxShadow: 'none' },
          }}
        >
          ค้นหาสาขา
        </Button>
      </Box>
      <Typography
        sx={{
          display: { xs: 'none', md: 'block' },
          color: 'rgba(255,255,255,.14)',
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 'clamp(80px, 15vw, 190px)',
          fontWeight: 800,
          letterSpacing: '-12px',
        }}
      >
        SBC
      </Typography>
    </Box>
  );
}
