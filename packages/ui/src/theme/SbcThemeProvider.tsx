import type { ReactNode } from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import type { Shadows } from '@mui/material/styles';
import { BrowserAutofillGuard } from '../components/BrowserAutofillGuard';

const shadowlessTheme = Array.from({ length: 25 }, () => 'none') as Shadows;

export function SbcThemeProvider({
  children,
  secondary = '#8e5f3c',
  background = '#faf8f5',
  borderRadius = 12,
  skeletonAnimation = 'pulse',
  skeletonColor,
}: {
  children: ReactNode;
  secondary?: string;
  background?: string;
  borderRadius?: number;
  skeletonAnimation?: 'pulse' | 'wave' | false;
  skeletonColor?: string;
}) {
  const theme = createTheme({
    palette: {
      primary: { main: '#171411' },
      secondary: { main: secondary },
      background: { default: background },
    },
    shape: { borderRadius },
    shadows: shadowlessTheme,
    components: {
      MuiSkeleton: {
        defaultProps: { animation: skeletonAnimation },
        styleOverrides: skeletonColor
          ? { root: { backgroundColor: skeletonColor } }
          : undefined,
      },
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
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderBottom: '1px solid #eee3dc',
            '&:last-of-type': { borderBottom: 'none' },
          },
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
      <BrowserAutofillGuard />
      {children}
    </ThemeProvider>
  );
}
