import { Box, Button, Typography } from '@mui/material';
import { featuredMenus } from '../data/landing';
export function MenuSection() {
  return (
    <Box
      component="section"
      id="menu"
      sx={{
        p: {
          xs: '80px 24px',
          md: 'clamp(80px, 10vw, 150px) clamp(24px, 9vw, 148px)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'flex-end' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2.5,
          mb: 5.25,
        }}
      >
        <Box>
          <Typography
            sx={{
              mb: 1.75,
              color: '#805637',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            SIGNATURE SELECTION
          </Typography>
          <Typography
            component="h2"
            sx={{
              m: 0,
              color: '#201914',
              fontSize: 'clamp(48px, 6vw, 92px)',
              fontWeight: 700,
              lineHeight: 0.98,
              letterSpacing: '-2.7px',
            }}
          >
            แก้วที่ใช่
            <br />
            สำหรับวันนี้
          </Typography>
        </Box>
        <Button
          variant="outlined"
          sx={{
            borderColor: '#b8a296',
            borderRadius: '12px',
            color: '#3c2d24',
            fontFamily: 'Kanit, sans-serif',
            '&:hover': { borderColor: '#805637', bgcolor: '#f6ebe4' },
          }}
        >
          ดูเมนูทั้งหมด
        </Button>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        {featuredMenus.map(([name, price], index) => {
          const colors = ['#201914', '#805637', '#d7beb0'];
          const light = index === 2;
          return (
            <Box
              component="article"
              key={name}
              sx={{
                minHeight: { xs: 190, md: 260 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'end',
                p: 3.5,
                overflow: 'hidden',
                borderRadius: '20px',
                bgcolor: colors[index],
                color: light ? '#201914' : '#fff',
                transition: 'transform .25s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                },
              }}
            >
              <Typography
                sx={{
                  mb: 'auto',
                  color: light ? '#5f4b3d' : 'rgba(255,255,255,.55)',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 12,
                }}
              >
                0{index + 1}
              </Typography>
              <Typography
                component="h3"
                sx={{
                  m: 0,
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: 29,
                  fontWeight: 700,
                  lineHeight: 1.15,
                }}
              >
                {name}
              </Typography>
              <Typography
                sx={{ mt: 0.75, color: light ? '#5f4b3d' : '#e1d3ca' }}
              >
                {price}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
