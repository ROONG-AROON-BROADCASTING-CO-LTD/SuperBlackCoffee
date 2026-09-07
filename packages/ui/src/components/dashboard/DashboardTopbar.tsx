import { Avatar, Box, Typography } from '@mui/material';

export function DashboardTopbar({
  title,
  initials,
  name,
  role,
  sidebarWidth = 230,
  disableSidebarTransition = false,
}: {
  title: string;
  initials: string;
  name: string;
  role: string;
  sidebarWidth?: number;
  disableSidebarTransition?: boolean;
}) {
  const titleFont = '"SBC Sans", Arial, sans-serif';

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: sidebarWidth,
        transition: disableSidebarTransition
          ? 'none'
          : 'left .28s cubic-bezier(.2,.8,.2,1)',
        right: 0,
        zIndex: 1100,
        height: 72,
        px: { xs: 3, md: '42px' },
        bgcolor: '#fff',
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography
          component="h1"
          sx={{
            color: 'text.primary',
            fontSize: { xs: 18, md: 21 },
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: 0.1,
            fontFamily: titleFont,
          }}
        >
          {title}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: '#eae0d5',
            color: 'secondary.main',
            fontSize: 11,
          }}
        >
          {initials}
        </Avatar>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {role}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
