import { Box, Typography } from '@mui/material';
import { highlights } from '../data/landing';
export function StatsSection() {
  return (
    <Box
      component="section"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))' },
        maxWidth: 1240,
        mx: { xs: 1.5, md: 'auto' },
        mt: { xs: 2, md: -4 },
        position: 'relative',
        zIndex: 2,
        p: { xs: '26px 20px', md: '32px 72px' },
        bgcolor: '#fffaf7',
        color: '#201914',
        border: '1px solid #e7d8cd',
        borderRadius: '20px',
      }}
    >
      {highlights.map(([number, label], index) => (
        <Box
          key={label}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            px: { xs: 1.5, md: 3.5 },
            borderLeft: index ? '1px solid #eadfd7' : 0,
          }}
        >
          <Typography
            sx={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: { xs: 23, md: 34 },
              fontWeight: 700,
              letterSpacing: '-1.5px',
            }}
          >
            {number}
          </Typography>
          <Typography sx={{ color: '#805637', fontSize: { xs: 11, md: 14 } }}>
            {label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
