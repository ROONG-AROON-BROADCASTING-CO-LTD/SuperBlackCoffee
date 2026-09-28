import { Avatar, Box, IconButton, Typography } from '@mui/material';

export function DashboardTopbar({
  title,
  initials,
  name,
  role,
  sidebarWidth = 230,
  disableSidebarTransition = false,
  matchContentPadding = false,
  onOpenMobileMenu,
}: {
  title: string;
  initials: string;
  name: string;
  role: string;
  sidebarWidth?: number;
  disableSidebarTransition?: boolean;
  matchContentPadding?: boolean;
  onOpenMobileMenu?: () => void;
}) {
  const titleFont = '"SBC Sans", Arial, sans-serif';

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: onOpenMobileMenu ? { xs: 0, md: sidebarWidth } : sidebarWidth,
        transition: disableSidebarTransition
          ? 'none'
          : 'left .28s cubic-bezier(.2,.8,.2,1)',
        right: 0,
        zIndex: 1100,
        height: 72,
        px: matchContentPadding
          ? { xs: '16px', md: '40px' }
          : { xs: 3, md: '42px' },
        bgcolor: '#fff',
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          minWidth: onOpenMobileMenu ? { xs: 0, md: 'auto' } : undefined,
        }}
      >
        {onOpenMobileMenu && (
          <IconButton
            aria-label="เปิดเมนู"
            onClick={onOpenMobileMenu}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, mr: 1, ml: -1 }}
          >
            <Box
              component="span"
              aria-hidden="true"
              sx={{ fontSize: 25, lineHeight: 1 }}
            >
              ☰
            </Box>
          </IconButton>
        )}
        <Typography
          component="h1"
          sx={{
            color: 'text.primary',
            fontSize: { xs: 18, md: 21 },
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: 0.1,
            fontFamily: titleFont,
            overflow: onOpenMobileMenu
              ? { xs: 'hidden', md: 'visible' }
              : undefined,
            textOverflow: onOpenMobileMenu
              ? { xs: 'ellipsis', md: 'clip' }
              : undefined,
            whiteSpace: onOpenMobileMenu
              ? { xs: 'nowrap', md: 'normal' }
              : undefined,
          }}
        >
          {title}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          flexShrink: onOpenMobileMenu ? { xs: 0, md: 1 } : undefined,
          ml: onOpenMobileMenu ? { xs: 1, md: 0 } : undefined,
        }}
      >
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
        <Box
          sx={{
            display: onOpenMobileMenu ? { xs: 'none', sm: 'block' } : undefined,
          }}
        >
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
