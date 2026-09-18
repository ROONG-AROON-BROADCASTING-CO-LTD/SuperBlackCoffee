import { Box, Typography } from '@mui/material';

export function PageIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        component="h1"
        sx={{
          color: '#3c2d24',
          fontFamily: 'Kanit, sans-serif',
          fontSize: 20,
          fontWeight: 600,
          lineHeight: 1.35,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          mt: 0.35,
          color: 'text.secondary',
          fontFamily: 'Kanit, sans-serif',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {description}
      </Typography>
    </Box>
  );
}
