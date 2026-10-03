// Global document defaults owned by MUI CssBaseline.
export const websiteBaseline = {
  ':root': {
    colorScheme: 'light',
    '--sb-black': '#000',
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
    scrollBehavior: 'auto',
    overscrollBehaviorY: 'none',
    minHeight: '100%',
  },
  body: {
    minHeight: '100%',
    margin: '0',
    padding: '0',
    minWidth: '320px',
    background: '#000',
    fontFamily: 'var(--font-kanit), sans-serif',
    color: 'var(--sb-ink)',
    textRendering: 'optimizeLegibility',
    overscrollBehaviorY: 'none',
  },
  // Keep every level-one and level-two heading on the same display face as
  // the homepage hero, even when a component supplies its own sizing.
  h1: {
    fontFamily: 'var(--font-kanit), sans-serif',
  },
  h2: {
    fontFamily: 'var(--font-kanit), sans-serif',
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
  '@keyframes sb-arrow-up-right-hover': {
    '0%, 100%': {
      transform: 'translate(0, 0) scale(1)',
    },
    '42%': {
      transform: 'translate(3px, -3px) scale(0.88)',
    },
  },
  'a:hover .sb-animated-arrow, button:hover .sb-animated-arrow': {
    animation: 'sb-arrow-up-right-hover 480ms cubic-bezier(0.4, 0, 0.2, 1)',
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
