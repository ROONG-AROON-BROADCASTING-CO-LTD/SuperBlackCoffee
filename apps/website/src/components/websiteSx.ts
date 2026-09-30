// MUI sx styles owned by public-site components.
export const websiteSx = {
  'sb-story-title': {},
  'sb-mobile-login': {},
  'sb-header': {
    height: '72px',
    background: 'var(--sb-black)',
    color: '#fff',
    position: 'sticky',
    top: '0',
    zIndex: '40',
  },
  'sb-nav': {
    maxWidth: '1600px',
    padding: '0 var(--sb-gutter)',
    height: '72px',
    margin: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '30px',
  },
  'sb-brand': {
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
    color: 'var(--sb-gold)',
    font: '700 13px/0.92 var(--font-inter),\n    sans-serif',
    letterSpacing: '0.05em',
    minWidth: '170px',
    '@media (max-width: 600px)': {
      minWidth: '0',
    },
  },
  'sb-nav-links': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'clamp(17px, 2.1vw, 38px)',
    margin: 'auto',
    '& a': {
      fontSize: '13px',
      color: '#e2e3de',
      height: '72px',
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      whiteSpace: 'nowrap',
    },
    '& a:hover': {
      color: 'var(--sb-gold)',
    },
    "& a[aria-current='page']": {
      color: 'var(--sb-gold)',
    },
    "& a[aria-current='page']:after": {
      content: "''",
      height: '1px',
      background: 'var(--sb-gold)',
      position: 'absolute',
      bottom: '13px',
      left: '0',
      right: '0',
    },
    '@media (max-width: 1100px)': {
      display: 'none',
    },
  },
  'sb-nav-action': {
    fontSize: '13px',
    color: 'var(--sb-gold)',
    borderLeft: '1px solid #5e605a',
    paddingLeft: '26px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    whiteSpace: 'nowrap',
    '&:hover': {
      color: '#f1cf8d',
    },
    '& svg': {
      display: 'block',
      width: '17px',
      height: '17px',
    },
    '@media (max-width: 1100px)': {
      display: 'none',
    },
  },
  'sb-nav-login': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '38px',
    padding: '0 15px',
    border: '1px solid #777469',
    color: '#e2e3de',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    '&:hover': {
      borderColor: 'var(--sb-gold)',
      color: 'var(--sb-gold)',
    },
    '@media (max-width: 1100px)': {
      display: 'none',
    },
  },
  'sb-mobile-cta': {
    '& svg': {
      display: 'block',
      width: '17px',
      height: '17px',
    },
  },
  'sb-menu-toggle': {
    display: 'none',
    marginLeft: 'auto',
    background: 'transparent',
    border: '0',
    width: '40px',
    height: '40px',
    cursor: 'pointer',
    padding: '10px',
    '& span': {
      display: 'block',
      height: '1.5px',
      background: '#fff',
      margin: '5px 0',
      transition: 'transform 180ms ease,\n    opacity 180ms ease',
    },
    "&[aria-expanded='true'] span:first-child": {
      transform: 'translateY(6.5px) rotate(45deg)',
    },
    "&[aria-expanded='true'] span:nth-child(2)": {
      opacity: '0',
    },
    "&[aria-expanded='true'] span:last-child": {
      transform: 'translateY(-6.5px) rotate(-45deg)',
    },
    '@media (max-width: 1100px)': {
      display: 'block',
    },
  },
  'sb-mobile-nav': {
    display: 'none',
    '@media (max-width: 1100px)': {
      display: 'flex',
      position: 'absolute',
      top: '72px',
      left: '0',
      right: '0',
      minHeight: 'calc(100svh - 72px)',
      background: 'var(--sb-black)',
      padding: '25px var(--sb-gutter) 45px',
      flexDirection: 'column',
      '& > a': {
        fontSize: 'clamp(25px, 5vw, 42px)',
        borderBottom: '1px solid #3b3d36',
        padding: '15px 0',
      },
      "& > a[aria-current='page']": {
        color: 'var(--sb-gold)',
      },
      '& .sb-mobile-cta': {
        fontSize: '16px',
        color: 'var(--sb-gold)',
        marginTop: 'auto',
        borderBottom: '0',
        display: 'flex',
        justifyContent: 'space-between',
      },
      '& .sb-mobile-login': {
        border: '1px solid var(--sb-gold)',
        color: 'var(--sb-gold)',
        fontSize: '15px',
        padding: '13px 18px',
        textAlign: 'center',
        marginTop: '14px',
      },
    },
  },
  'sb-footer': {
    background: 'var(--sb-black)',
    color: '#fff',
  },
  'sb-footer-main': {
    display: 'grid',
    gridTemplateColumns: '0.8fr 1.2fr',
    gap: '9vw',
    paddingBlock: '65px 72px',
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr',
      gap: '42px',
      paddingBlock: '55px',
    },
  },
  'sb-footer-brand': {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '15px',
    color: 'var(--sb-gold)',
    font: '700 25px/0.93 var(--font-inter),\n    sans-serif',
    letterSpacing: '0.02em',
  },
  'sb-footer-links': {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '30px',
    '& > div': {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    '& span:first-child': {
      fontSize: '12px',
      color: 'var(--sb-gold)',
      marginBottom: '8px',
    },
    '& a': {
      fontSize: '13px',
      color: '#c4c6c0',
    },
    '& span:not(:first-child)': {
      fontSize: '13px',
      color: '#c4c6c0',
    },
    '& a:hover': {
      color: 'var(--sb-gold)',
    },
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr 1fr',
      gap: '35px',
      '& > div:last-child': {
        gridColumn: '1/-1',
      },
    },
  },
  'sb-footer-bottom': {
    '& a:hover': {
      color: 'var(--sb-gold)',
    },
    borderTop: '1px solid #3a3d37',
    minHeight: '70px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '30px',
    font: '500 11px var(--font-inter),\n    sans-serif',
    color: '#9a9c96',
    '& > div': {
      display: 'flex',
      gap: '22px',
    },
    '@media (max-width: 600px)': {
      alignItems: 'flex-start',
      flexDirection: 'column',
      justifyContent: 'center',
      paddingBlock: '25px',
      gap: '13px',
    },
  },
  'sb-container': {
    maxWidth: '1600px',
    marginInline: 'auto',
    paddingInline: 'var(--sb-gutter)',
  },
  'sb-photo': {
    position: 'relative',
    overflow: 'hidden',
    background: '#d8d7d0',
    minWidth: '0',
    '& img': {
      objectFit: 'cover',
      transition: 'transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)',
    },
    'a:hover > & img': {
      transform: 'scale(1.025)',
    },
  },
  'sb-rule': {
    display: 'block',
    width: '32px',
    height: '1px',
    background: 'var(--sb-gold)',
    marginBottom: '28px',
  },
  'sb-button': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '34px',
    minHeight: '52px',
    padding: '0 23px',
    fontWeight: '600',
    fontSize: '14px',
    lineHeight: '1',
    transition: 'background 0.2s,\n    color 0.2s,\n    border-color 0.2s',
    cursor: 'pointer',
    border: '1px solid transparent',
    borderRadius: '0',
    whiteSpace: 'nowrap',
    '& svg': {
      width: '19px',
      height: '19px',
      flex: 'none',
    },
  },
  'sb-text-link': {
    '& svg': {
      width: '19px',
      height: '19px',
      flex: 'none',
    },
    display: 'inline-flex',
    alignItems: 'center',
    gap: '30px',
    borderBottom: '1px solid var(--sb-ink)',
    paddingBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    '&:hover': {
      color: '#96723b',
      borderColor: '#96723b',
    },
  },
  'sb-row-link': {
    '& svg': {
      width: '19px',
      height: '19px',
      flex: 'none',
    },
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    fontSize: '14px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    '@media (max-width: 800px)': {
      gridColumn: '3',
    },
    '@media (max-width: 600px)': {
      gridColumn: '2/-1',
    },
  },
  'sb-button-gold': {
    background: 'var(--sb-gold)',
    color: 'var(--sb-black)',
    '&:hover': {
      background: '#e1bf80',
    },
  },
  'sb-button-dark': {
    background: 'var(--sb-black)',
    color: '#fff',
    '&:hover': {
      background: '#33352e',
    },
  },
  'sb-button-ghost': {
    borderColor: 'rgba(255, 255, 255, 0.62)',
    color: '#fff',
    background: 'transparent',
    '&:hover': {
      background: '#fff',
      color: 'var(--sb-black)',
    },
  },
  'sb-button-outline-light': {
    borderColor: 'rgba(255, 255, 255, 0.62)',
    color: '#fff',
    background: 'transparent',
    '&:hover': {
      background: '#fff',
      color: 'var(--sb-black)',
    },
  },
  'sb-actions': {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  'sb-home-hero': {
    height: 'clamp(640px, calc(100svh - 72px), 940px)',
    minHeight: '620px',
    position: 'relative',
    overflow: 'hidden',
    background: '#171914',
    color: '#fff',
    '& h1': {
      fontSize: 'clamp(58px, 5vw, 76px)',
      fontWeight: '400',
      lineHeight: '1.1',
      letterSpacing: '-0.05em',
      margin: '0',
      textWrap: 'balance',
    },
    '& p': {
      maxWidth: '515px',
      fontSize: 'clamp(16px, 1.25vw, 20px)',
      lineHeight: '1.75',
      color: '#ebede8',
      margin: '30px 0 35px',
    },
    '@media (max-width: 800px)': {
      height: '700px',
      '& h1': {
        fontSize: 'clamp(50px, 8vw, 76px)',
      },
    },
    '@media (max-width: 600px)': {
      height: 'calc(100svh - 72px)',
      minHeight: '610px',
      '& h1': {
        fontSize: 'clamp(46px, 10vw, 64px)',
      },
      '& p': {
        fontSize: '15px',
        lineHeight: '1.65',
        margin: '20px 0 25px',
      },
      '& .sb-actions': {
        gap: '10px',
      },
      '& .sb-button': {
        minHeight: '47px',
        paddingInline: '15px',
        gap: '12px',
        fontSize: '12px',
      },
    },
  },
  'sb-home-hero-photo': {
    position: 'absolute',
    inset: '0',
    '& img': {
      objectPosition: 'center 55%',
    },
    '@media (max-width: 600px)': {
      '& img': {
        objectPosition: '61% center',
      },
    },
  },
  'sb-home-hero-shade': {
    position: 'absolute',
    inset: '0',
    background:
      'linear-gradient(\n      90deg,\n      rgba(0, 0, 0, 0.76) 0%,\n      rgba(0, 0, 0, 0.49) 37%,\n      rgba(0, 0, 0, 0.08) 75%\n    ),\n    linear-gradient(0deg, rgba(0, 0, 0, 0.2), transparent 40%)',
    '@media (max-width: 800px)': {
      background:
        'linear-gradient(90deg, rgba(0, 0, 0, 0.68), rgba(0, 0, 0, 0.15)),\n      linear-gradient(0deg, rgba(0, 0, 0, 0.18), transparent 60%)',
    },
    '@media (max-width: 600px)': {
      background:
        'linear-gradient(\n      0deg,\n      rgba(0, 0, 0, 0.72),\n      rgba(0, 0, 0, 0.42) 55%,\n      rgba(0, 0, 0, 0.1)\n    )',
    },
  },
  'sb-home-hero-content': {
    position: 'relative',
    zIndex: '1',
    width: 'min(760px, 75vw)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '50px 0 65px var(--sb-gutter)',
    '@media (max-width: 800px)': {
      width: 'min(680px, 95vw)',
    },
    '@media (max-width: 600px)': {
      justifyContent: 'end',
      padding: '0 var(--sb-gutter) 62px',
      width: '100%',
    },
  },
  'sb-hero-side-note': {
    position: 'absolute',
    right: 'var(--sb-gutter)',
    bottom: '32px',
    font: '600 11px var(--font-inter),\n    sans-serif',
    letterSpacing: '0.22em',
    zIndex: '1',
    '@media (max-width: 600px)': {
      display: 'none',
    },
  },
  'sb-story-strip': {
    display: 'grid',
    gridTemplateColumns: '0.95fr 0.78fr 1.25fr',
    gap: 'clamp(32px, 4.5vw, 80px)',
    alignItems: 'center',
    minHeight: '310px',
    paddingBlock: '65px',
    '& h2': {
      fontWeight: '400',
      fontSize: 'clamp(32px, 3.4vw, 58px)',
      lineHeight: '1.15',
      letterSpacing: '-0.035em',
      margin: '0',
      textWrap: 'balance',
    },
    '& > p': {
      fontSize: '16px',
      lineHeight: '1.85',
      color: 'var(--sb-muted)',
      maxWidth: '430px',
    },
    '& .sb-photo': {
      height: '220px',
    },
    '@media (max-width: 1100px)': {
      gridTemplateColumns: '1fr 1fr',
      '& > .sb-photo': {
        display: 'none',
      },
    },
    '@media (max-width: 800px)': {
      gridTemplateColumns: '1fr',
      paddingBlock: '70px',
      gap: '15px',
      '& > p': {
        maxWidth: '660px',
      },
    },
    '@media (max-width: 600px)': {
      paddingBlock: '65px',
      '& h2': {
        fontSize: '34px',
      },
    },
  },
  'sb-section-heading': {
    '& h2': {
      fontWeight: '400',
      fontSize: 'clamp(32px, 3.4vw, 58px)',
      lineHeight: '1.15',
      letterSpacing: '-0.035em',
      margin: '0',
      textWrap: 'balance',
    },
    display: 'flex',
    alignItems: 'end',
    justifyContent: 'space-between',
    gap: '40px',
    '& p': {
      margin: '16px 0 0',
      color: 'var(--sb-muted)',
      fontSize: '16px',
      lineHeight: '1.7',
    },
    '@media (max-width: 600px)': {
      '& h2': {
        fontSize: '34px',
      },
      display: 'block',
      '& .sb-text-link': {
        marginTop: '24px',
      },
    },
  },
  'sb-menu-feature': {
    '& h2': {
      fontWeight: '400',
      fontSize: 'clamp(32px, 3.4vw, 58px)',
      lineHeight: '1.15',
      letterSpacing: '-0.035em',
      margin: '0',
      textWrap: 'balance',
    },
    display: 'grid',
    gridTemplateColumns: '34% 42% 24%',
    height: '510px',
    background: 'var(--sb-black)',
    color: '#fff',
    overflow: 'hidden',
    '& > .sb-photo': {
      height: '100%',
    },
    '& > .sb-photo img': {
      objectPosition: 'center 54%',
    },
    '@media (max-width: 1100px)': {
      gridTemplateColumns: '40% 60%',
    },
    '@media (max-width: 800px)': {
      height: 'auto',
      gridTemplateColumns: '1fr 1fr',
      '& > .sb-photo': {
        minHeight: '410px',
      },
    },
    '@media (max-width: 600px)': {
      '& h2': {
        fontSize: '34px',
      },
      display: 'flex',
      flexDirection: 'column',
      '& > .sb-photo': {
        minHeight: '340px',
      },
    },
  },
  'sb-branch-banner': {
    '& h2': {
      fontWeight: '400',
      fontSize: 'clamp(32px, 3.4vw, 58px)',
      lineHeight: '1.15',
      letterSpacing: '-0.035em',
      margin: '0',
      textWrap: 'balance',
    },
    position: 'relative',
    background: '#151a14',
    color: '#fff',
    minHeight: '325px',
    overflow: 'hidden',
    '& > .sb-photo': {
      position: 'absolute',
      inset: '0',
    },
    '& > .sb-photo img': {
      objectPosition: 'center 63%',
    },
    '&:after': {
      content: "''",
      position: 'absolute',
      inset: '0',
      background:
        'linear-gradient(\n    90deg,\n    rgba(11, 17, 11, 0.96),\n    rgba(11, 17, 11, 0.82) 42%,\n    rgba(11, 17, 11, 0.12)\n  )',
    },
    '& > div:last-child': {
      position: 'relative',
      zIndex: '1',
      padding: '58px var(--sb-gutter)',
      maxWidth: '700px',
    },
    '& p': {
      maxWidth: '470px',
      color: '#dedfd8',
      fontSize: '16px',
      lineHeight: '1.75',
      margin: '17px 0 26px',
    },
    '@media (max-width: 600px)': {
      '& > div:last-child': {
        paddingBlock: '55px',
      },
    },
  },
  'sb-franchise-preview': {
    '& h2': {
      fontWeight: '400',
      fontSize: 'clamp(32px, 3.4vw, 58px)',
      lineHeight: '1.15',
      letterSpacing: '-0.035em',
      margin: '0',
      textWrap: 'balance',
    },
    display: 'grid',
    gridTemplateColumns: '0.85fr 1.15fr',
    gap: '8vw',
    alignItems: 'center',
    paddingBlock: '90px',
    '& > div:first-child': {
      paddingRight: '3vw',
    },
    '& p': {
      fontSize: '16px',
      lineHeight: '1.85',
      color: 'var(--sb-muted)',
      maxWidth: '540px',
      margin: '24px 0 30px',
    },
    '& > .sb-photo': {
      height: '370px',
    },
    '@media (max-width: 600px)': {
      '& h2': {
        fontSize: '34px',
      },
      gridTemplateColumns: '1fr',
      gap: '35px',
      paddingBlock: '65px',
      '& > .sb-photo': {
        height: '300px',
      },
    },
  },
  'sb-about-grid': {
    '& h2': {
      fontWeight: '400',
      fontSize: 'clamp(32px, 3.4vw, 58px)',
      lineHeight: '1.15',
      letterSpacing: '-0.035em',
      margin: '0',
      textWrap: 'balance',
    },
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '9vw',
    paddingBlock: '110px',
    '& p': {
      fontSize: 'clamp(18px, 1.5vw, 23px)',
      lineHeight: '1.8',
      margin: '0 0 25px',
      color: '#4c4d47',
    },
    '@media (max-width: 800px)': {
      gridTemplateColumns: '1fr',
      gap: '30px',
      paddingBlock: '75px',
    },
    '@media (max-width: 600px)': {
      '& h2': {
        fontSize: '34px',
      },
    },
  },
  'sb-bottom-cta': {
    '& h2': {
      fontWeight: '400',
      fontSize: 'clamp(32px, 3.4vw, 58px)',
      lineHeight: '1.15',
      letterSpacing: '-0.035em',
      margin: '0',
      textWrap: 'balance',
    },
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '30px',
    paddingBlock: '90px',
    '@media (max-width: 600px)': {
      '& h2': {
        fontSize: '34px',
      },
      display: 'block',
      paddingBlock: '70px',
      '& .sb-button': {
        marginTop: '25px',
      },
    },
  },
  'sb-franchise-intro': {
    '& h2': {
      fontWeight: '400',
      fontSize: 'clamp(32px, 3.4vw, 58px)',
      lineHeight: '1.15',
      letterSpacing: '-0.035em',
      margin: '0',
      textWrap: 'balance',
    },
    display: 'grid',
    gridTemplateColumns: '0.75fr 1fr 1.1fr',
    gap: '5vw',
    alignItems: 'center',
    paddingBlock: '90px',
    borderBottom: '1px solid var(--sb-line)',
    '& p': {
      lineHeight: '1.8',
      color: 'var(--sb-muted)',
      fontSize: '17px',
    },
    '& > .sb-photo': {
      height: '250px',
    },
    '@media (max-width: 800px)': {
      gridTemplateColumns: '1fr',
      gap: '30px',
    },
    '@media (max-width: 600px)': {
      '& h2': {
        fontSize: '34px',
      },
      paddingBlock: '65px',
      '& > .sb-photo': {
        height: '240px',
      },
    },
  },
  'sb-apply': {
    '& h2': {
      fontWeight: '400',
      fontSize: 'clamp(32px, 3.4vw, 58px)',
      lineHeight: '1.15',
      letterSpacing: '-0.035em',
      margin: '0',
      textWrap: 'balance',
    },
    background: 'var(--sb-black)',
    color: '#fff',
    scrollMarginTop: '72px',
    '@media (max-width: 600px)': {
      '& h2': {
        fontSize: '34px',
      },
    },
  },
  'sb-contact': {
    '& h2': {
      fontWeight: '400',
      fontSize: 'clamp(32px, 3.4vw, 58px)',
      lineHeight: '1.15',
      letterSpacing: '-0.035em',
      margin: '0',
      textWrap: 'balance',
    },
    display: 'grid',
    gridTemplateColumns: '0.8fr 1.2fr',
    gap: '9vw',
    paddingBlock: '95px',
    '@media (max-width: 800px)': {
      gridTemplateColumns: '1fr',
      gap: '30px',
    },
    '@media (max-width: 600px)': {
      '& h2': {
        fontSize: '34px',
      },
      paddingBlock: '65px',
    },
  },
  'sb-menu-feature-copy': {
    padding: 'clamp(40px, 5vw, 90px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    '& p': {
      color: '#c7c8c1',
      fontSize: '16px',
      lineHeight: '1.8',
      maxWidth: '460px',
      margin: '25px 0 32px',
    },
    '@media (max-width: 800px)': {
      padding: '42px 30px',
    },
    '@media (max-width: 600px)': {
      padding: '50px var(--sb-gutter) 60px',
    },
  },
  'sb-menu-feature-mini': {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    padding: '26px 26px 26px 0',
    '& .sb-photo': {
      height: '100%',
    },
    '@media (max-width: 1100px)': {
      display: 'none',
    },
  },
  'sb-services-preview': {
    paddingBlock: '105px 115px',
    '@media (max-width: 800px)': {
      paddingBlock: '75px',
    },
  },
  'sb-services-grid': {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '26px',
    marginTop: '55px',
    '& > a': {
      display: 'block',
      minWidth: '0',
    },
    '& .sb-photo': {
      height: 'clamp(280px, 27vw, 435px)',
    },
    '& > a > div:last-child': {
      position: 'relative',
      padding: '24px 45px 0 0',
    },
    '& h3': {
      fontSize: '24px',
      fontWeight: '500',
      lineHeight: '1.25',
      margin: '0',
    },
    '& p': {
      fontSize: '15px',
      color: 'var(--sb-muted)',
      margin: '8px 0 0',
    },
    '& svg': {
      position: 'absolute',
      right: '0',
      top: '26px',
      width: '20px',
    },
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr',
      gap: '38px',
      marginTop: '34px',
      '& .sb-photo': {
        height: '285px',
      },
      '& h3': {
        fontSize: '21px',
      },
    },
  },
  'sb-inner-hero': {
    display: 'grid',
    gridTemplateColumns: '48% 52%',
    minHeight: '480px',
    background: '#f3f2ee',
    color: 'var(--sb-ink)',
    '& h1': {
      fontSize: 'clamp(43px, 5.2vw, 83px)',
      fontWeight: '400',
      lineHeight: '1.08',
      letterSpacing: '-0.047em',
      margin: '0',
      textWrap: 'balance',
    },
    '& p': {
      color: 'var(--sb-muted)',
      fontSize: 'clamp(16px, 1.25vw, 19px)',
      lineHeight: '1.75',
      margin: '22px 0 0',
      maxWidth: '500px',
    },
    '& > .sb-photo': {
      minHeight: '480px',
    },
    '@media (max-width: 800px)': {
      gridTemplateColumns: '1fr',
      '& > .sb-photo': {
        minHeight: '320px',
        height: '320px',
      },
    },
    '@media (max-width: 600px)': {
      '& h1': {
        fontSize: 'clamp(41px, 10vw, 60px)',
      },
      '& > .sb-photo': {
        minHeight: '260px',
        height: '260px',
      },
    },
  },
  'sb-inner-hero-dark': {
    background: 'var(--sb-black)',
    color: '#fff',
    '& p': {
      color: '#d7d8d2',
    },
  },
  'sb-inner-copy': {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '80px clamp(35px, 6vw, 110px) 80px var(--sb-gutter)',
    '@media (max-width: 800px)': {
      padding: '75px var(--sb-gutter)',
    },
    '@media (max-width: 600px)': {
      paddingBlock: '60px',
    },
  },
  'sb-about-photo': {
    '& > .sb-photo': {
      height: '500px',
    },
    '@media (max-width: 800px)': {
      '& > .sb-photo': {
        height: '370px',
      },
    },
  },
  'sb-menu-page': {
    paddingBlock: '70px 110px',
    '@media (max-width: 600px)': {
      paddingBlock: '55px 80px',
    },
  },
  'sb-branches-page': {
    paddingBlock: '70px 110px',
    '& .sb-section-heading': {
      paddingBottom: '35px',
    },
    '@media (max-width: 600px)': {
      paddingBlock: '55px 80px',
      '& .sb-section-heading': {
        paddingBottom: '30px',
      },
    },
  },
  'sb-services-page': {
    paddingBlock: '70px 110px',
    '& .sb-section-heading': {
      paddingBottom: '40px',
    },
    '@media (max-width: 600px)': {
      paddingBlock: '55px 80px',
    },
  },
  'sb-news': {
    paddingBlock: '70px 110px',
    '& .sb-section-heading': {
      paddingBottom: '30px',
    },
    '@media (max-width: 600px)': {
      paddingBlock: '55px 80px',
    },
  },
  'sb-tabs': {
    display: 'flex',
    gap: '35px',
    borderBottom: '1px solid var(--sb-line)',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    '& button': {
      border: '0',
      background: 'transparent',
      color: '#71726b',
      whiteSpace: 'nowrap',
      padding: '0 0 18px',
      fontSize: '15px',
      cursor: 'pointer',
      borderBottom: '2px solid transparent',
    },
    '& button.active': {
      color: 'var(--sb-ink)',
      borderBottomColor: 'var(--sb-ink)',
      fontWeight: '600',
    },
    '@media (max-width: 600px)': {
      gap: '27px',
    },
  },
  'sb-menu-layout': {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 38%',
    gap: '9vw',
    paddingTop: '55px',
    alignItems: 'start',
    '& h2': {
      fontSize: 'clamp(36px, 4vw, 62px)',
      fontWeight: '400',
      lineHeight: '1',
      margin: '0',
    },
    '& > .sb-photo': {
      height: '650px',
    },
    '@media (max-width: 800px)': {
      gridTemplateColumns: '1fr 38%',
      gap: '35px',
      '& > .sb-photo': {
        height: '520px',
      },
    },
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr',
      paddingTop: '35px',
      '& > .sb-photo': {
        height: '390px',
      },
    },
  },
  'sb-lead': {
    color: 'var(--sb-muted)',
    margin: '12px 0 38px',
  },
  'sb-menu-list': {
    borderTop: '1px solid var(--sb-line)',
  },
  'sb-menu-item': {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
    alignItems: 'center',
    padding: '19px 0',
    borderBottom: '1px solid var(--sb-line)',
    '& h3': {
      font: '500 clamp(19px, 1.7vw, 26px)/1.2 var(--font-inter),\n    sans-serif',
      margin: '0',
    },
    '& p': {
      color: 'var(--sb-muted)',
      fontSize: '14px',
      margin: '5px 0 0',
    },
    '& strong': {
      font: '600 17px var(--font-inter),\n    sans-serif',
    },
  },
  'sb-search': {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1px solid var(--sb-line)',
    height: '50px',
    padding: '0 15px',
    minWidth: 'min(380px, 100%)',
    '& svg': {
      width: '20px',
      height: '20px',
      color: '#777',
    },
    '& input': {
      border: '0',
      outline: '0',
      minWidth: '0',
      width: '100%',
      fontSize: '14px',
      background: 'transparent',
    },
    '&:focus-within': {
      borderColor: 'var(--sb-gold)',
    },
    '@media (max-width: 600px)': {
      marginTop: '25px',
    },
  },
  'sb-branch-list': {
    borderTop: '1px solid var(--sb-line)',
  },
  'sb-branch-row': {
    display: 'grid',
    gridTemplateColumns: '40px 200px minmax(0, 1fr) auto',
    gap: '30px',
    alignItems: 'center',
    padding: '28px 0',
    borderBottom: '1px solid var(--sb-line)',
    '& > .sb-photo': {
      height: '140px',
    },
    '@media (max-width: 1100px)': {
      gridTemplateColumns: '30px 150px minmax(0, 1fr) auto',
      gap: '18px',
    },
    '@media (max-width: 800px)': {
      gridTemplateColumns: '30px 120px minmax(0, 1fr)',
      gap: '16px',
      '& > .sb-photo': {
        height: '110px',
      },
    },
    '@media (max-width: 600px)': {
      gridTemplateColumns: '26px 1fr auto',
      gap: '12px',
      padding: '25px 0',
      '& > .sb-photo': {
        gridColumn: '2/-1',
        gridRow: '1',
        height: '190px',
      },
      '& > .sb-index': {
        gridRow: '2',
      },
    },
  },
  'sb-index': {
    font: '500 13px var(--font-inter),\n    sans-serif',
    color: '#a17d45',
    letterSpacing: '0.1em',
  },
  'sb-branch-info': {
    '& h3': {
      fontSize: 'clamp(23px, 2.2vw, 34px)',
      fontWeight: '500',
      lineHeight: '1.2',
      margin: '0 0 8px',
    },
    '& > p': {
      fontSize: '14px',
      lineHeight: '1.7',
      color: 'var(--sb-muted)',
      margin: '0',
      maxWidth: '590px',
    },
    '@media (max-width: 600px)': {
      gridColumn: '2/-1',
    },
  },
  'sb-branch-meta': {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    marginTop: '12px',
    fontSize: '13px',
    color: '#62645d',
    '& span:first-child': {
      color: '#8c713e',
    },
  },
  'sb-row-link-muted': {
    color: '#898a84',
    fontWeight: '400',
  },
  'sb-empty': {
    padding: '50px 0',
    color: 'var(--sb-muted)',
  },
  'sb-plans': {
    paddingBlock: '90px 110px',
    '@media (max-width: 600px)': {
      paddingBlock: '65px 80px',
    },
  },
  'sb-plan-grid': {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    marginTop: '50px',
    borderTop: '1px solid var(--sb-line)',
    borderLeft: '1px solid var(--sb-line)',
    '@media (max-width: 800px)': {
      gridTemplateColumns: '1fr',
    },
    '@media (max-width: 600px)': {
      marginTop: '35px',
    },
  },
  'sb-plan': {
    borderRight: '1px solid var(--sb-line)',
    borderBottom: '1px solid var(--sb-line)',
    padding: '35px',
    minHeight: '350px',
    display: 'flex',
    flexDirection: 'column',
    '& .sb-text-link': {
      alignSelf: 'flex-start',
      marginTop: 'auto',
    },
    '@media (max-width: 1100px)': {
      padding: '25px',
    },
    '@media (max-width: 800px)': {
      minHeight: 'auto',
    },
  },
  'sb-plan-top': {
    display: 'flex',
    alignItems: 'start',
    gap: '22px',
    '& > span': {
      font: '400 clamp(68px, 7vw, 110px)/0.9 Georgia,\n    serif',
      letterSpacing: '-0.07em',
    },
    '& h3': {
      fontSize: '21px',
      margin: '8px 0 3px',
      fontWeight: '500',
    },
    '& p': {
      fontSize: '13px',
      color: 'var(--sb-muted)',
      margin: '0',
    },
    '@media (max-width: 800px)': {
      '& > span': {
        fontSize: '90px',
      },
    },
  },
  'sb-plan-facts': {
    borderTop: '1px solid var(--sb-line)',
    margin: '35px 0 30px',
    '& > div': {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '15px',
      borderBottom: '1px solid var(--sb-line)',
      padding: '14px 0',
      fontSize: '14px',
    },
    '& span': {
      color: 'var(--sb-muted)',
    },
    '& strong': {
      fontWeight: '600',
      textAlign: 'right',
    },
  },
  'sb-apply-layout': {
    display: 'grid',
    gridTemplateColumns: '0.8fr 1.2fr',
    gap: '9vw',
    paddingBlock: '95px',
    '& > div > p': {
      color: '#c9cbc3',
      lineHeight: '1.8',
      maxWidth: '420px',
      margin: '25px 0',
    },
    '@media (max-width: 800px)': {
      gridTemplateColumns: '1fr',
      gap: '30px',
    },
    '@media (max-width: 600px)': {
      paddingBlock: '65px',
    },
  },
  'sb-form': {
    background: '#fff',
    color: 'var(--sb-ink)',
    padding: 'clamp(26px, 3.5vw, 52px)',
    '& h3': {
      fontSize: 'clamp(25px, 2.5vw, 36px)',
      fontWeight: '500',
      margin: '0 0 30px',
    },
    '& label': {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
    },
    '& label span': {
      color: '#a5782e',
    },
    '& input': {
      display: 'block',
      width: '100%',
      marginTop: '8px',
      border: '1px solid #d8d9d4',
      background: '#fff',
      borderRadius: '0',
      padding: '12px 14px',
      outline: '0',
      color: 'var(--sb-ink)',
      fontSize: '15px',
      fontWeight: '400',
      minHeight: '46px',
    },
    '& select': {
      display: 'block',
      width: '100%',
      marginTop: '8px',
      border: '1px solid #d8d9d4',
      background: '#fff',
      borderRadius: '0',
      padding: '12px 14px',
      outline: '0',
      color: 'var(--sb-ink)',
      fontSize: '15px',
      fontWeight: '400',
      minHeight: '46px',
    },
    '& textarea': {
      display: 'block',
      width: '100%',
      marginTop: '8px',
      border: '1px solid #d8d9d4',
      background: '#fff',
      borderRadius: '0',
      padding: '12px 14px',
      outline: '0',
      color: 'var(--sb-ink)',
      fontSize: '15px',
      fontWeight: '400',
      minHeight: '46px',
    },
    '& input:focus': {
      borderColor: 'var(--sb-gold)',
    },
    '& select:focus': {
      borderColor: 'var(--sb-gold)',
    },
    '& textarea:focus': {
      borderColor: 'var(--sb-gold)',
    },
    '& button': {
      marginTop: '30px',
    },
    '& button:disabled': {
      opacity: '0.55',
      cursor: 'wait',
    },
  },
  'sb-form-grid': {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '22px',
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr',
      gap: '16px',
    },
  },
  'sb-form-wide': {
    gridColumn: '1/-1',
  },
  'sb-form-message': {
    color: '#35704e',
    fontSize: '14px',
    margin: '15px 0 0',
  },
  'sb-service-row': {
    display: 'grid',
    gridTemplateColumns: '48px 220px 1fr',
    gap: '35px',
    alignItems: 'center',
    borderTop: '1px solid var(--sb-line)',
    padding: '24px 0',
    '&:last-child': {
      borderBottom: '1px solid var(--sb-line)',
    },
    '& > .sb-photo': {
      height: '130px',
    },
    '& h3': {
      font: '500 clamp(26px, 3vw, 45px)/1.15 var(--font-inter),\n    sans-serif',
      letterSpacing: '-0.035em',
      margin: '0 0 9px',
    },
    '& p': {
      color: 'var(--sb-muted)',
      fontSize: '15px',
      margin: '0',
    },
    '@media (max-width: 800px)': {
      gridTemplateColumns: '40px 150px 1fr',
      gap: '20px',
    },
    '@media (max-width: 600px)': {
      gridTemplateColumns: '30px 100px 1fr',
      gap: '10px',
      padding: '18px 0',
      '& > .sb-photo': {
        height: '90px',
      },
      '& h3': {
        fontSize: '19px',
      },
      '& p': {
        fontSize: '12px',
        lineHeight: '1.45',
      },
    },
  },
  'sb-news-row': {
    display: 'grid',
    gridTemplateColumns: '55px 1fr 1fr',
    gap: '35px',
    alignItems: 'start',
    padding: '30px 0',
    borderTop: '1px solid var(--sb-line)',
    '& h3': {
      fontSize: 'clamp(22px, 2.5vw, 35px)',
      fontWeight: '400',
      lineHeight: '1.3',
      margin: '0',
    },
    '& p': {
      color: 'var(--sb-muted)',
      fontSize: '15px',
      margin: '0',
    },
    '@media (max-width: 600px)': {
      gridTemplateColumns: '35px 1fr',
      gap: '12px',
      '& p': {
        gridColumn: '2',
      },
    },
  },
  'sb-contact-info': {
    '& > p': {
      fontSize: '17px',
      lineHeight: '1.7',
      color: 'var(--sb-muted)',
      maxWidth: '400px',
    },
    '& dl': {
      marginTop: '55px',
    },
    '& dl > div': {
      padding: '16px 0',
      borderTop: '1px solid var(--sb-line)',
    },
    '& dt': {
      fontSize: '12px',
      color: '#8d763f',
      letterSpacing: '0.09em',
    },
    '& dd': {
      fontSize: '19px',
      margin: '6px 0 0',
      overflowWrap: 'anywhere',
    },
    '@media (max-width: 800px)': {
      '& dl': {
        marginTop: '30px',
      },
    },
    '@media (max-width: 600px)': {
      '& dd': {
        fontSize: '16px',
      },
    },
  },
  'sb-contact-form': {
    border: '1px solid var(--sb-line)',
    padding: '0',
  },
  'sb-legal': {
    minHeight: '58vh',
    paddingBlock: '115px 140px',
    '& h1': {
      maxWidth: '920px',
      fontSize: 'clamp(45px, 5.5vw, 84px)',
      fontWeight: '400',
      lineHeight: '1.08',
      letterSpacing: '-0.045em',
      margin: '0 0 35px',
    },
    '& p': {
      maxWidth: '700px',
      color: 'var(--sb-muted)',
      fontSize: '18px',
      lineHeight: '1.8',
    },
  },
} as const;
