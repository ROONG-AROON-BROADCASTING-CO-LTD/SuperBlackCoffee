import type { ReactNode } from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

export function SbcThemeProvider({
  children,
  secondary = '#8e5f3c',
  background = '#faf8f5',
  borderRadius = 12,
}: {
  children: ReactNode;
  secondary?: string;
  background?: string;
  borderRadius?: number;
}) {
  const theme = createTheme({
    palette: {
      primary: { main: '#171411' },
      secondary: { main: secondary },
      background: { default: background },
    },
    shape: { borderRadius },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius,
            padding: '8px 16px !important',
            minHeight: '40px !important',
            fontFamily: '"SBC Sans", "Kanit", Arial, sans-serif',
            fontSize: '14px !important',
            fontWeight: '400 !important',
            lineHeight: '1.4 !important',
            textTransform: 'none !important',
          },
        },
      },
      MuiButtonBase: {
        styleOverrides: {
          root: { borderRadius },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { borderRadius },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius },
        },
      },
    },
    typography: {
      fontFamily: '"SBC Sans", "Kanit", Arial, sans-serif',
      h3: {
        fontFamily: '"SBC Sans", "Kanit", Arial, sans-serif',
        fontWeight: 700,
      },
      h4: {
        fontFamily: '"SBC Sans", "Kanit", Arial, sans-serif',
        fontWeight: 700,
      },
      h5: {
        fontFamily: '"SBC Sans", "Kanit", Arial, sans-serif',
        fontWeight: 700,
      },
    },
  });
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
