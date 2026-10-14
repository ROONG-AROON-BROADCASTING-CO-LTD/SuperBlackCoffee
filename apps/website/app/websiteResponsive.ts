// These overrides only apply to tablet-sized viewports and touch-only iPads.
// Desktop component styles remain the source of truth above these breakpoints.
export const websiteResponsive = {
  '@media (max-width: 1199px), (max-width: 1366px) and (hover: none) and (pointer: coarse)':
    {
      ':root': { '--sb-gutter': 'clamp(20px, 4vw, 44px)' },
      'body .sb-header': { height: '72px', marginBottom: '-72px' },
      'body .sb-header .sb-topbar': { display: 'none' },
      'body .sb-nav': { display: 'flex', gap: '16px' },
      'body .sb-nav-links, body .sb-nav-login, body .sb-nav-action': {
        display: 'none',
      },
      'body .sb-nav-tools': { marginLeft: 'auto' },
      'body .sb-language-switcher': { minHeight: '44px' },
      'body .sb-menu-toggle': {
        display: 'block',
        width: '44px',
        height: '44px',
        padding: '10px',
        marginLeft: '0',
        flex: '0 0 auto',
      },
      'body .sb-mobile-nav': {
        display: 'flex',
        position: 'absolute',
        left: '0',
        right: '0',
        flexDirection: 'column',
        background: 'var(--sb-black)',
        top: '72px',
        height: 'calc(100dvh - 72px)',
        minHeight: '0',
        overflowY: 'auto',
        overscrollBehaviorY: 'contain',
        WebkitOverflowScrolling: 'touch',
        padding: '16px var(--sb-gutter) max(24px, env(safe-area-inset-bottom))',
        gap: '0',
      },
      'body .sb-mobile-nav > a': {
        fontSize: '26px',
        paddingBlock: '12px',
        flexShrink: '0',
      },
      'body .sb-mobile-nav .sb-mobile-cta': {
        marginTop: '24px',
        fontSize: '16px',
      },
      'body .sb-mobile-nav .sb-mobile-login': { fontSize: '16px' },
      'body main': { overflowWrap: 'break-word' },
      'body main h1, body main h2, body main h3': {
        overflowWrap: 'break-word',
      },
      'body .sb-home-hero, body .sb-inner-hero': {
        height: 'auto',
        minHeight: '0',
      },
      'body .sb-home-hero-content, body .sb-inner-copy': {
        width: 'min(740px, 100%)',
        height: 'auto',
        minHeight: '620px',
        padding: '150px var(--sb-gutter) 64px',
        justifyContent: 'center',
      },
      'body .sb-home-hero h1, body .sb-inner-hero h1': {
        fontSize: 'clamp(40px, 5.5vw, 58px)',
        lineHeight: '1.22',
      },
      'body .sb-home-hero p, body .sb-inner-hero p': {
        marginBlock: '24px',
        fontSize: '17px',
      },
      'body .sb-home-hero-photo img': {
        objectPosition: '62% center !important',
      },
      'body .sb-home-hero-shade': {
        background:
          'linear-gradient(90deg, rgba(0,0,0,.8), rgba(0,0,0,.38) 70%, rgba(0,0,0,.15))',
      },
      'body .sb-hero-services': {
        position: 'relative',
        left: 'auto',
        right: 'auto',
        bottom: 'auto',
        height: 'auto',
        display: 'flex',
        overflowX: 'auto',
        gap: '16px',
        padding: '0 var(--sb-gutter) 24px',
        scrollSnapType: 'x mandatory',
        scrollPaddingInline: 'var(--sb-gutter)',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--sb-gold) transparent',
      },
      'body .sb-hero-services > a': {
        flex: '0 0 clamp(220px, 30vw, 280px)',
        minHeight: '170px',
        scrollSnapAlign: 'start',
      },
      'body .sb-hero-service-card .sb-hero-service-card-copy': {
        padding: '20px',
      },
      'body .sb-hero-service-card p': {
        display: 'block',
        fontSize: '14px',
        marginBlock: '12px',
        lineHeight: '1.6',
      },
      'body .sb-hero-service-card h2': { fontSize: '16px' },
      'body .sb-hero-side-note': { display: 'none' },
      'body .sb-hero-stats': {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        marginBlock: '24px 32px',
        overflow: 'hidden',
      },
      'body .sb-hero-stat': {
        minHeight: '112px',
        padding: '20px 16px',
        borderBottom: '1px solid rgba(255,255,255,.12)',
      },
      'body .sb-hero-stat:nth-child(3n)': { borderRight: '0' },
      'body .sb-hero-stat:nth-last-child(-n + 3)': { borderBottom: '0' },
      'body .sb-hero-stat .sb-hero-stat-content': { gap: '12px' },
      'body .sb-hero-stat strong': { fontSize: '28px' },
      'body .sb-hero-stat span, body .sb-hero-stat p': { whiteSpace: 'normal' },
      'body .sb-hero-stat .sb-stat-icon, body .sb-hero-stat .sb-stat-icon svg':
        { width: '36px', height: '36px' },
      'body .sb-story-strip, body .sb-branch-banner, body .sb-franchise-preview':
        {
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          minHeight: '0',
        },
      'body .sb-story-strip .sb-story-copy, body .sb-menu-feature-copy, body .sb-branch-banner > div:last-child, body .sb-franchise-preview > div:first-child':
        {
          minWidth: '0',
          padding: '40px 32px',
        },
      'body .sb-story-strip h2, body .sb-branch-banner h2, body .sb-franchise-preview h2':
        {
          fontSize: 'clamp(26px, 3.4vw, 36px)',
          whiteSpace: 'normal',
          lineHeight: '1.22',
        },
      'body .sb-story-strip .sb-photo, body .sb-branch-banner > .sb-photo, body .sb-franchise-preview > .sb-photo':
        {
          minHeight: '320px',
          height: '100%',
        },
      'body .sb-menu-feature': { gridTemplateColumns: '1fr', minHeight: '0' },
      'body .sb-menu-feature-mini': {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        padding: '0 24px 24px',
      },
      'body .sb-menu-feature-mini > a': { minHeight: '220px' },
      'body .sb-menu-feature-mini > a > span': {
        fontSize: '11px',
        letterSpacing: '.05em',
      },
      'body .sb-services-preview': {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'auto',
      },
      'body .sb-services-preview > .sb-services-photo': {
        gridColumn: '1',
        gridRow: '1',
        minHeight: '0',
        aspectRatio: '16 / 9',
        height: 'auto',
      },
      'body .sb-services-preview .sb-services-intro': {
        gridColumn: '1',
        gridRow: '2',
        padding: '40px',
      },
      'body .sb-services-preview .sb-ev-showcase': {
        gridColumn: '1',
        gridRow: '3',
      },
      'body .sb-services-preview .sb-mobile-cafe-showcase': {
        gridColumn: '1',
        gridRow: '4',
      },
      'body .sb-services-preview .sb-ev-showcase, body .sb-services-preview .sb-mobile-cafe-showcase':
        {
          gridTemplateColumns: '1fr',
          gridTemplateRows: 'auto auto',
          minHeight: '0',
        },
      'body .sb-services-preview .sb-ev-showcase > .sb-photo, body .sb-services-preview .sb-mobile-cafe-showcase > .sb-photo':
        {
          gridColumn: '1',
          gridRow: '1',
          minHeight: '0',
          aspectRatio: '16 / 9',
          height: 'auto',
        },
      'body .sb-services-preview .sb-ev-showcase-copy, body .sb-services-preview .sb-mobile-cafe-showcase-copy':
        {
          gridColumn: '1',
          gridRow: '2',
          padding: '40px',
          minWidth: '0',
        },
      'body .sb-services-preview .sb-photo::after': {
        background:
          'linear-gradient(0deg, #000, rgba(0,0,0,.12) 28%, transparent 60%)',
      },
      'body .sb-services-preview h2, body .sb-services-preview h3': {
        fontSize: 'clamp(28px, 3.8vw, 36px)',
        lineHeight: '1.22',
      },
      'body .sb-services-preview h3 span': { whiteSpace: 'normal' },
      'body .sb-services-preview .sb-services-intro > p, body .sb-services-preview .sb-ev-showcase-copy > p, body .sb-services-preview .sb-mobile-cafe-showcase-copy > p':
        { maxWidth: '640px' },
      'body .sb-services-preview .sb-services-benefits, body .sb-services-preview .sb-ev-showcase-points, body .sb-services-preview .sb-mobile-cafe-showcase-points':
        {
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          width: '100%',
        },
      'body .sb-services-preview .sb-services-benefits > div, body .sb-services-preview .sb-ev-showcase-points > div, body .sb-services-preview .sb-mobile-cafe-showcase-points > div':
        {
          minWidth: '0',
          minHeight: '96px',
          padding: '20px',
          borderBottom: '1px solid rgba(202,164,94,.24)',
        },
      'body .sb-services-preview .sb-services-benefits > div:nth-child(odd), body .sb-services-preview .sb-ev-showcase-points > div:nth-child(odd), body .sb-services-preview .sb-mobile-cafe-showcase-points > div:nth-child(odd)':
        { borderRight: '1px solid rgba(202,164,94,.24)' },
      'body .sb-services-preview .sb-services-benefits > div:nth-last-child(-n + 2), body .sb-services-preview .sb-ev-showcase-points > div:nth-last-child(-n + 2), body .sb-services-preview .sb-mobile-cafe-showcase-points > div:nth-last-child(-n + 2)':
        { borderBottom: '0' },
      'body .sb-about-origin, body .sb-about-principles, body .sb-contact, body .sb-apply-layout':
        {
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: '36px',
          paddingBlock: '64px',
        },
      'body .sb-about-grid, body .sb-about-journey, body .sb-franchise-intro': {
        paddingBlock: '64px',
      },
      'body .sb-about-origin-map': {
        maxWidth: '680px',
        width: '100%',
        marginInline: 'auto',
      },
      'body .sb-about-journey .sb-about-journey-steps': {
        gridTemplateColumns: '1fr',
        marginTop: '32px',
      },
      'body .sb-about-journey .sb-about-journey-steps li': {
        borderLeft: '0',
        borderTop: '1px solid rgba(255,255,255,.22)',
        padding: '24px 0',
      },
      'body .sb-about-journey .sb-about-journey-steps li:first-child': {
        borderTop: '0',
      },
      'body .sb-menu-grid': {
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      },
      'body .sb-branch-row': {
        gridTemplateColumns: '220px minmax(0, 1fr)',
        gap: '20px',
      },
      'body .sb-branch-row > .sb-photo': {
        gridRow: '1 / span 2',
        height: '100%',
        minHeight: '200px',
      },
      'body .sb-branch-row .sb-branch-info': { gridColumn: '2', gridRow: '1' },
      'body .sb-branch-row .sb-branch-actions': {
        gridColumn: '2',
        gridRow: '2',
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-start',
      },
      'body .sb-row-link': {
        minHeight: '44px',
        whiteSpace: 'normal',
        gap: '12px',
      },
      'body .sb-branch-detail': { paddingBlock: '112px 64px' },
      'body .sb-branch-detail .sb-branch-detail-hero': {
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        minHeight: '0',
      },
      'body .sb-branch-detail .sb-branch-detail-hero > div:last-child': {
        padding: '32px',
      },
      'body .sb-branch-detail .sb-branch-detail-hero > .sb-photo': {
        height: '100%',
        minHeight: '360px',
      },
      'body .sb-branch-detail .sb-branch-staff-grid, body .sb-branch-detail .sb-branch-facility-grid, body .sb-branch-detail .sb-promotion-grid':
        {
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '16px',
          marginTop: '24px',
        },
      'body .sb-branch-detail .sb-branch-detail-section': { marginTop: '56px' },
      'body .sb-branch-detail .sb-branch-facility-card': {
        minHeight: '0',
        padding: '24px',
      },
      'body .sb-plan-grid': {
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      },
      'body .sb-form, body .sb-form-grid > label': { minWidth: '0' },
      'body .sb-form input, body .sb-form select, body .sb-form textarea': {
        fontSize: '16px',
        minHeight: '48px',
      },
      'body .sb-apply': { scrollMarginTop: '96px' },
      'body .sb-section-heading': { flexWrap: 'wrap', gap: '24px' },
      'body .sb-search': {
        minWidth: '0',
        width: 'min(380px, 100%)',
        minHeight: '48px',
      },
      'body .sb-tabs': {
        gap: '24px',
        scrollPaddingInline: '4px',
        overscrollBehaviorInline: 'contain',
      },
      'body .sb-tabs button': { minHeight: '48px', paddingTop: '12px' },
      'body .sb-footer-main': {
        gridTemplateColumns: '1fr',
        gap: '36px',
        paddingBlock: '56px 40px',
      },
      'body .sb-footer-brand-copy': { maxWidth: '500px', marginTop: '16px' },
      'body .sb-footer-links': {
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '24px',
      },
      'body .sb-footer-links a': {
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        overflowWrap: 'anywhere',
      },
      'body .sb-footer-links > div': { gap: '4px', minWidth: '0' },
      'body .sb-footer-links > div:last-child': { gridColumn: 'auto' },
      'body .sb-footer-bottom': {
        flexWrap: 'wrap',
        gap: '12px',
        paddingBlock: '24px',
      },
      'body .sb-footer-bottom > div': { flexWrap: 'wrap', gap: '16px' },
      'body .sb-footer-bottom a': {
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: '44px',
      },
      'body a:focus-visible, body button:focus-visible': {
        outline: '2px solid var(--sb-gold)',
        outlineOffset: '4px',
      },
      'body .sb-legal': { paddingBlock: '124px 64px' },
      'body .sb-legal h1': {
        fontSize: 'clamp(32px, 5vw, 48px)',
        lineHeight: '1.25',
      },
      'body .sb-service-detail-hero': { minHeight: '0' },
      'body .sb-service-detail-hero-copy': {
        minHeight: '620px',
        width: '100%',
        padding: '150px var(--sb-gutter) 64px',
        justifyContent: 'center',
      },
      'body .sb-service-detail-hero h1': {
        fontSize: 'clamp(40px, 5.5vw, 58px)',
        lineHeight: '1.22',
      },
      'body .sb-service-detail-section': { padding: '64px var(--sb-gutter)' },
      'body .sb-service-detail-intro': {
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: '24px',
        paddingBottom: '48px',
      },
      'body .sb-service-detail-point': {
        gridTemplateColumns: '40px minmax(0, 1fr)',
        gap: '12px 16px',
        paddingBlock: '28px',
      },
      'body .sb-service-detail-point > p': {
        gridColumn: '2',
        margin: '0',
        fontSize: '17px',
      },
    },
  '@media (max-width: 699px)': {
    ':root': { '--sb-gutter': '20px' },
    'body .sb-nav': { gap: '12px' },
    'body .sb-brand': { minWidth: '0', gap: '10px' },
    'body .sb-brand > span': { display: 'none' },
    'body .sb-nav-tools': { gap: '8px' },
    'body .sb-language-switcher': { paddingInline: '12px' },
    'body .sb-home-hero-content, body .sb-inner-copy': {
      minHeight: 'min(760px, max(580px, 85svh))',
      width: '100%',
      padding: '120px var(--sb-gutter) 48px',
      justifyContent: 'flex-end',
    },
    'body .sb-home-hero h1, body .sb-inner-hero h1': {
      fontSize: 'clamp(32px, 8.5vw, 46px)',
    },
    'body .sb-home-hero p, body .sb-inner-hero p': {
      fontSize: '16px',
      marginBlock: '20px',
    },
    'body .sb-home-hero-shade': {
      background:
        'linear-gradient(0deg, rgba(0,0,0,.92), rgba(0,0,0,.4) 70%, rgba(0,0,0,.15))',
    },
    'body .sb-actions': { gap: '12px' },
    'body .sb-home-hero .sb-actions': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    'body .sb-home-hero .sb-button': {
      minHeight: '48px',
      justifyContent: 'space-between',
      paddingInline: '18px',
    },
    'body .sb-hero-services > a': { flexBasis: 'min(78vw, 280px)' },
    'body .sb-hero-stats': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
    'body .sb-hero-stat': {
      padding: '18px 12px',
      minHeight: '108px',
      borderRight: '1px solid rgba(255,255,255,.12)',
      borderBottom: '1px solid rgba(255,255,255,.12)',
    },
    'body .sb-hero-stat:nth-child(3n)': {
      borderRight: '1px solid rgba(255,255,255,.12)',
    },
    'body .sb-hero-stat:nth-child(2n)': { borderRight: '0' },
    'body .sb-hero-stat:nth-last-child(-n + 3)': {
      borderBottom: '1px solid rgba(255,255,255,.12)',
    },
    'body .sb-hero-stat:nth-last-child(-n + 2)': { borderBottom: '0' },
    'body .sb-hero-stat .sb-hero-stat-content': {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '10px',
    },
    'body .sb-hero-stat strong': { fontSize: '26px' },
    'body .sb-promotions': { paddingBlock: '32px' },
    'body .sb-promotions .sb-promotions-heading h2': {
      fontSize: '30px',
      lineHeight: '1.3',
    },
    'body .sb-promotions .sb-promotion-grid': {
      gap: '14px',
      paddingInline: '0',
      scrollPaddingInline: '0',
    },
    'body .sb-promotions .sb-promotion-card': { flexBasis: 'min(78vw, 300px)' },
    'body .sb-promotions .sb-promotion-tabs button': {
      minHeight: '48px',
      paddingInline: '20px',
    },
    'body .sb-story-strip, body .sb-branch-banner, body .sb-franchise-preview':
      { gridTemplateColumns: '1fr' },
    'body .sb-story-strip .sb-story-copy, body .sb-menu-feature-copy, body .sb-branch-banner > div:last-child, body .sb-franchise-preview > div:first-child':
      { padding: '32px 24px' },
    'body .sb-story-strip h2, body .sb-branch-banner h2, body .sb-franchise-preview h2, body .sb-menu-feature h2':
      {
        fontSize: 'clamp(24px, 7vw, 30px)',
        whiteSpace: 'normal',
        lineHeight: '1.25',
      },
    'body .sb-story-strip .sb-photo, body .sb-branch-banner > .sb-photo, body .sb-franchise-preview > .sb-photo':
      {
        minHeight: '0',
        aspectRatio: '4 / 3',
        height: 'auto',
      },
    'body .sb-story-strip .sb-photo::after, body .sb-branch-banner > .sb-photo::after, body .sb-franchise-preview > .sb-photo::after':
      {
        background: 'linear-gradient(0deg, rgba(0,0,0,.4), transparent 65%)',
      },
    'body .sb-menu-feature-mini': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: '12px',
    },
    'body .sb-menu-feature-mini > a': { minHeight: '180px' },
    'body .sb-services-preview .sb-services-intro, body .sb-services-preview .sb-ev-showcase-copy, body .sb-services-preview .sb-mobile-cafe-showcase-copy':
      { padding: '32px 24px' },
    'body .sb-services-preview h2, body .sb-services-preview h3': {
      fontSize: 'clamp(23px, 6.6vw, 30px)',
      lineHeight: '1.25',
    },
    'body .sb-services-preview .sb-services-benefits, body .sb-services-preview .sb-ev-showcase-points, body .sb-services-preview .sb-mobile-cafe-showcase-points':
      { gridTemplateColumns: '1fr' },
    'body .sb-services-preview .sb-services-benefits > div, body .sb-services-preview .sb-ev-showcase-points > div, body .sb-services-preview .sb-mobile-cafe-showcase-points > div':
      { minHeight: '82px', padding: '16px', gap: '14px' },
    'body .sb-services-preview .sb-services-benefits > div:nth-child(odd), body .sb-services-preview .sb-ev-showcase-points > div:nth-child(odd), body .sb-services-preview .sb-mobile-cafe-showcase-points > div:nth-child(odd)':
      { borderRight: '0' },
    'body .sb-services-preview .sb-services-benefits > div:nth-last-child(-n + 2), body .sb-services-preview .sb-ev-showcase-points > div:nth-last-child(-n + 2), body .sb-services-preview .sb-mobile-cafe-showcase-points > div:nth-last-child(-n + 2)':
      { borderBottom: '1px solid rgba(202,164,94,.24)' },
    'body .sb-services-preview .sb-services-benefits > div:last-child, body .sb-services-preview .sb-ev-showcase-points > div:last-child, body .sb-services-preview .sb-mobile-cafe-showcase-points > div:last-child':
      { borderBottom: '0' },
    'body .sb-services-preview strong, body .sb-services-preview small': {
      overflowWrap: 'break-word',
    },
    'body .sb-about-origin, body .sb-about-principles, body .sb-about-grid, body .sb-about-journey, body .sb-franchise-intro, body .sb-contact, body .sb-apply-layout':
      { paddingBlock: '48px' },
    'body .sb-about-principles article': {
      gridTemplateColumns: '36px minmax(0, 1fr)',
      columnGap: '14px',
      rowGap: '14px',
    },
    'body .sb-about-principles article > span': {
      gridColumn: '1',
      gridRow: '1',
    },
    'body .sb-about-principles .sb-about-principle-image': {
      gridColumn: '2',
      gridRow: '1',
      width: '100%',
      height: 'auto',
      aspectRatio: '16 / 9',
    },
    'body .sb-about-principles article h3, body .sb-about-principles article p':
      { gridColumn: '2' },
    'body .sb-about-principles article p': { marginTop: '0' },
    'body .sb-about-quote p': {
      fontSize: 'clamp(28px, 7.5vw, 36px)',
      lineHeight: '1.3',
    },
    'body .sb-branch-row': {
      gridTemplateColumns: '1fr',
      gap: '16px',
      paddingBlock: '24px',
    },
    'body .sb-branch-row > .sb-photo': {
      gridColumn: '1',
      gridRow: '1',
      height: 'auto',
      minHeight: '0',
      aspectRatio: '16 / 10',
    },
    'body .sb-branch-row .sb-branch-info': { gridColumn: '1', gridRow: '2' },
    'body .sb-branch-row .sb-branch-actions': {
      gridColumn: '1',
      gridRow: '3',
      gap: '20px',
    },
    'body .sb-branch-detail .sb-branch-detail-hero': {
      gridTemplateColumns: '1fr',
    },
    'body .sb-branch-detail .sb-branch-detail-hero > .sb-photo': {
      height: 'auto',
      minHeight: '0',
      aspectRatio: '4 / 3',
    },
    'body .sb-branch-detail .sb-branch-detail-hero > div:last-child': {
      padding: '28px 24px',
    },
    'body .sb-branch-detail .sb-branch-staff-grid, body .sb-branch-detail .sb-branch-facility-grid':
      { gridTemplateColumns: '1fr' },
    'body .sb-branch-detail .sb-promotion-grid': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: '12px',
    },
    'body .sb-branch-detail .sb-promotion-card > div:last-child': {
      padding: '12px',
    },
    'body .sb-branch-detail .sb-promotion-card h3': {
      fontSize: '16px',
      lineHeight: '1.5',
    },
    'body .sb-branch-detail .sb-branch-detail-heading h2': {
      fontSize: '28px',
      lineHeight: '1.3',
    },
    'body .sb-plan-grid, body .sb-form-grid': { gridTemplateColumns: '1fr' },
    'body .sb-form': { padding: '24px 20px' },
    'body .sb-form-submit': { width: '100%', justifyContent: 'center' },
    'body .sb-plan-top': { gap: '16px' },
    'body .sb-plan-top > span': { fontSize: '72px' },
    'body .sb-service-row': {
      gridTemplateColumns: '30px minmax(0, 1fr)',
      gap: '16px',
    },
    'body .sb-service-row > .sb-photo': {
      gridColumn: '2',
      height: 'auto',
      aspectRatio: '16 / 9',
    },
    'body .sb-service-row > div:last-child': { gridColumn: '2' },
    'body .sb-service-row h3': { fontSize: '24px', lineHeight: '1.3' },
    'body .sb-menu-grid': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: '12px',
    },
    'body .sb-menu-card, body .sb-menu-card > div:last-child': {
      minHeight: '260px',
    },
    'body .sb-menu-card > div:last-child': { padding: '16px 12px' },
    'body .sb-menu-card h3': { fontSize: '20px', lineHeight: '1.35' },
    'body .sb-menu-card p': { fontSize: '14px' },
    'body .sb-footer-links': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
    'body .sb-footer-links > div:last-child': { gridColumn: '1 / -1' },
    'body .sb-footer-brand-title': {
      whiteSpace: 'normal',
      fontSize: '18px',
      lineHeight: '1.3',
    },
    'body .sb-footer-brand img': { width: '48px', height: '48px' },
    'body .sb-service-detail-hero-copy': {
      minHeight: '580px',
      padding: '120px var(--sb-gutter) 48px',
      justifyContent: 'flex-end',
    },
    'body .sb-service-detail-hero h1': { fontSize: 'clamp(32px, 8.5vw, 46px)' },
    'body .sb-service-detail-hero p': { fontSize: '16px' },
    'body .sb-service-detail-section': { paddingBlock: '48px' },
  },
  '@media (max-width: 374px)': {
    ':root': { '--sb-gutter': '16px' },
    'body .sb-menu-grid, body .sb-branch-detail .sb-promotion-grid': {
      gridTemplateColumns: '1fr',
    },
    'body .sb-services-preview .sb-services-intro, body .sb-services-preview .sb-ev-showcase-copy, body .sb-services-preview .sb-mobile-cafe-showcase-copy':
      { paddingInline: '20px' },
  },
} as const;
