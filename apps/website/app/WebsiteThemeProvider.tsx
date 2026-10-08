'use client';

import type { ReactNode } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme, type Shadows } from '@mui/material/styles';
import { websiteBaseline } from './websiteBaseline';
import { WebsiteDocumentMetadata } from '../src/components/WebsiteDocumentMetadata';
import { WebsiteLanguageProvider } from '../src/components/WebsiteLanguageProvider';
import type { WebsiteLanguage } from '../src/lib/websiteLanguage';

const shadowlessTheme = Array.from({ length: 25 }, () => 'none') as Shadows;

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#11120f', contrastText: '#ffffff' },
    secondary: { main: '#c7a467', contrastText: '#11120f' },
    background: { default: '#ffffff', paper: '#ffffff' },
    text: { primary: '#1b1c18', secondary: '#686962' },
  },
  shape: { borderRadius: 10 },
  shadows: shadowlessTheme,
  typography: {
    fontFamily: 'var(--font-ibm-plex-thai), sans-serif',
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
    h1: { fontSize: 'clamp(2.25rem, 4vw, 4.2rem)' },
    h2: { fontSize: 'clamp(2rem, 3.2vw, 3.2rem)' },
    h3: { fontSize: 'clamp(1.7rem, 2.5vw, 2.5rem)' },
    h4: { fontSize: 'clamp(1.35rem, 2vw, 2rem)' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: websiteBaseline,
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, minHeight: 44, boxShadow: 'none' },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } },
      },
    },
  },
});

type WebsiteThemeProviderProps = {
  children: ReactNode;
  initialLanguage: WebsiteLanguage;
  hasLanguageCookie: boolean;
};

export function WebsiteThemeProvider({
  children,
  initialLanguage,
  hasLanguageCookie,
}: WebsiteThemeProviderProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WebsiteLanguageProvider
        initialLanguage={initialLanguage}
        hasLanguageCookie={hasLanguageCookie}
      >
        <WebsiteDocumentMetadata />
        {children}
      </WebsiteLanguageProvider>
    </ThemeProvider>
  );
}
