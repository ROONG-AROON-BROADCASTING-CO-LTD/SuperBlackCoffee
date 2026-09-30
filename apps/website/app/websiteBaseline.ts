// Global document defaults owned by MUI CssBaseline.
export const websiteBaseline = {
  ':root': {
    colorScheme: 'light',
    '--sb-black': '#11120f',
    '--sb-ink': '#1b1c18',
    '--sb-white': '#fff',
    '--sb-gold': '#c7a467',
    '--sb-muted': '#686962',
    '--sb-line': '#deded9',
    '--sb-gutter': 'clamp(24px, 5vw, 82px)',
  },
  '*': {
    boxSizing: 'border-box',
  },
  html: {
    margin: '0',
    padding: '0',
    scrollBehavior: 'smooth',
    minHeight: '100%',
  },
  body: {
    minHeight: '100%',
    margin: '0',
    padding: '0',
    minWidth: '320px',
    background: 'var(--sb-white)',
    fontFamily: 'var(--font-kanit), sans-serif',
    color: 'var(--sb-ink)',
    textRendering: 'optimizeLegibility',
  },
  main: {
    margin: '0',
    padding: '0',
  },
  a: {
    color: 'inherit',
    textDecoration: 'none',
  },
  button: {
    font: 'inherit',
  },
  input: {
    font: 'inherit',
  },
  textarea: {
    font: 'inherit',
  },
  select: {
    font: 'inherit',
  },
  '::selection': {
    background: '#d09a3f',
    color: '#171411',
  },
  '@media (prefers-reduced-motion: reduce)': {
    '*': {
      scrollBehavior: 'auto !important',
      transition: 'none !important',
      animation: 'none !important',
    },
    '*:before': {
      scrollBehavior: 'auto !important',
      transition: 'none !important',
      animation: 'none !important',
    },
    '*:after': {
      scrollBehavior: 'auto !important',
      transition: 'none !important',
      animation: 'none !important',
    },
  },
};
