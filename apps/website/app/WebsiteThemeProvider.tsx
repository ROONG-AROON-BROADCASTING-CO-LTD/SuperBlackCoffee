'use client';

import type { ReactNode } from 'react';
import { ThemeProvider, createTheme, type Shadows } from '@mui/material/styles';

const shadowlessTheme = Array.from({ length: 25 }, () => 'none') as Shadows;

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#171411', contrastText: '#ffffff' },
    secondary: { main: '#d09a3f', contrastText: '#171411' },
    background: { default: '#f8f4ef', paper: '#fffdf9' },
    text: { primary: '#171411', secondary: '#70655c' },
  },
  shape: { borderRadius: 14 },
  shadows: shadowlessTheme,
  typography: {
    fontFamily: 'var(--font-kanit), sans-serif',
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
    h1: { fontSize: 'clamp(2.25rem, 4vw, 4.2rem)' },
    h2: { fontSize: 'clamp(2rem, 3.2vw, 3.2rem)' },
    h3: { fontSize: 'clamp(1.7rem, 2.5vw, 2.5rem)' },
    h4: { fontSize: 'clamp(1.35rem, 2vw, 2rem)' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 999, minHeight: 44, boxShadow: 'none' },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 14 } },
      },
    },
  },
});

export function WebsiteThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
