'use client';

import Box from '@mui/material/Box';
import Link from 'next/link';
import { ArrowUpRightIcon } from '@stackbuild/ui/icons';
import { englishServiceDetails, type ServiceDetail } from './serviceDetailData';
import { useWebsiteLanguage } from './WebsiteLanguageProvider';
import { websiteSx } from './websiteSx';

export function ServiceDetailContent({ service }: { service: ServiceDetail }) {
  const { isEnglish } = useWebsiteLanguage();
  const copy = isEnglish
    ? { ...service, ...englishServiceDetails[service.slug] }
    : service;
  return (
    <>
      <Box
        component="section"
        className="sb-service-detail-hero"
        sx={{
          // Keep every service hero on the same viewport-based canvas as the
          // home page.  A fixed desktop height made service artwork appear
          // shorter or taller than the landing hero on different screens.
          height: {
            xs: '680px',
            md: 'clamp(640px, calc(100svh - 72px), 940px)',
          },
          minHeight: { xs: '620px', md: '620px' },
          position: 'relative',
          display: 'flex',
          alignItems: 'stretch',
          overflow: 'hidden',
          backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.94) 0%, rgba(0,0,0,.72) 38%, rgba(0,0,0,.12) 76%), linear-gradient(0deg, rgba(0,0,0,.45), rgba(0,0,0,0) 46%), url("${copy.image}")`,
          backgroundPosition: copy.imagePosition ?? 'center 24%',
          backgroundSize: 'cover',
          backgroundColor: '#15120f',
        }}
      >
        <Box
          component="div"
          className="sb-service-detail-hero-copy"
          sx={{
            width: '100%',
            maxWidth: '1680px',
            margin: '0 auto',
            height: '100%',
            minHeight: 0,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: { xs: 'flex-end', md: 'flex-start' },
            padding: {
              xs: '0 var(--sb-gutter) 62px',
              md: '224px 0 0 var(--sb-gutter)',
            },
            '@media (max-width: 800px)': {
              width: 'min(680px, 95vw)',
            },
          }}
        >
          <Box
            component="h1"
            sx={{
              maxWidth: '760px',
              color: '#fff',
              fontFamily: 'var(--font-ibm-plex-thai), sans-serif',
              fontSize: 'clamp(58px, 5vw, 76px)',
              fontWeight: 500,
              lineHeight: 1.22,
              letterSpacing: '-.05em',
              whiteSpace: 'pre-line',
              margin: '0',
              '@media (max-width: 800px)': {
                fontSize: 'clamp(50px, 8vw, 76px)',
              },
              '@media (max-width: 600px)': {
                fontSize: 'clamp(46px, 10vw, 64px)',
              },
            }}
          >
            {copy.title}
          </Box>
          <Box
            component="p"
            sx={{
              maxWidth: '550px',
              margin: { xs: '20px 0 0', md: '30px 0 0' },
              color: 'rgba(255,255,255,.76)',
              font: '400 19px/1.65 var(--font-ibm-plex-thai), sans-serif',
            }}
          >
            {copy.summary}
          </Box>
        </Box>
      </Box>

      <Box
        component="section"
        className="sb-service-detail-section"
        sx={{
          background: '#000',
          color: '#fff',
          padding: {
            xs: '84px var(--sb-gutter)',
            md: '132px var(--sb-gutter)',
          },
        }}
      >
        <Box component="div" sx={{ maxWidth: '1500px', margin: '0 auto' }}>
          <Box
            component="div"
            className="sb-service-detail-intro"
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(0, .88fr) minmax(0, 1.12fr)',
              },
              gap: { xs: '30px', md: '120px' },
              paddingBottom: { xs: '80px', md: '124px' },
              borderBottom: '1px solid rgba(255,255,255,.2)',
            }}
          >
            <Box
              component="h2"
              sx={{
                margin: 0,
                maxWidth: '500px',
                font: '400 clamp(32px, 3.4vw, 56px)/1.13 var(--font-ibm-plex-thai), sans-serif',
                letterSpacing: '-.04em',
              }}
            >
              {copy.introductionTitle}
            </Box>
            <Box
              component="p"
              sx={{
                margin: { xs: 0, md: '12px 0 0' },
                maxWidth: '680px',
                color: 'rgba(255,255,255,.72)',
                font: '400 clamp(18px, 1.55vw, 24px)/1.72 var(--font-ibm-plex-thai), sans-serif',
              }}
            >
              {copy.introduction}
            </Box>
          </Box>

          <Box component="ol" sx={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {copy.points.map((point, index) => (
              <Box
                component="li"
                className="sb-service-detail-point"
                key={point.title}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '50px 1fr',
                    md: '140px minmax(260px, .8fr) minmax(0, 1.2fr)',
                  },
                  gap: { xs: '16px', md: '38px' },
                  alignItems: 'baseline',
                  padding: { xs: '28px 0', md: '42px 0' },
                  borderBottom:
                    index === copy.points.length - 1
                      ? 'none'
                      : '1px solid rgba(255,255,255,.15)',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    color: '#c9a45e',
                    font: '500 14px/1 var(--font-inter), sans-serif',
                    letterSpacing: '.12em',
                  }}
                >
                  0{index + 1}
                </Box>
                <Box
                  component="h3"
                  sx={{
                    margin: 0,
                    font: '400 clamp(20px, 1.7vw, 29px)/1.24 var(--font-ibm-plex-thai), sans-serif',
                  }}
                >
                  {point.title}
                </Box>
                <Box
                  component="p"
                  sx={{
                    margin: { xs: '7px 0 0 66px', md: 0 },
                    gridColumn: { md: '3' },
                    color: 'rgba(255,255,255,.64)',
                    font: '400 18px/1.65 var(--font-ibm-plex-thai), sans-serif',
                  }}
                >
                  {point.description}
                </Box>
              </Box>
            ))}
          </Box>

          {copy.systemScreens?.length ? (
            <Box
              component="section"
              sx={{
                marginTop: { xs: '66px', md: '92px' },
                paddingTop: { xs: '36px', md: '48px' },
                borderTop: '1px solid rgba(255,255,255,.22)',
              }}
            >
              <Box
                component="p"
                sx={{
                  margin: 0,
                  color: '#c9a45e',
                  font: '600 12px/1 var(--font-inter), sans-serif',
                  letterSpacing: '.14em',
                }}
              >
                SYSTEM PREVIEW
              </Box>
              <Box
                component="h3"
                sx={{
                  margin: '14px 0 0',
                  font: '400 clamp(27px, 2.7vw, 42px)/1.2 var(--font-ibm-plex-thai), sans-serif',
                  letterSpacing: '-.035em',
                }}
              >
                {isEnglish
                  ? 'A look at the systems franchise teams use'
                  : 'ดูหน้าตาระบบที่แฟรนไชส์ใช้'}
              </Box>
              <Box
                component="div"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, minmax(0, 1fr))',
                  },
                  gap: { xs: '46px', md: '52px 34px' },
                  marginTop: { xs: '32px', md: '42px' },
                }}
              >
                {copy.systemScreens.map((screen) => (
                  <Box
                    component="article"
                    key={screen.title}
                    sx={{
                      minWidth: 0,
                    }}
                  >
                    <Box
                      component="img"
                      src={screen.image}
                      alt={screen.title}
                      sx={{
                        display: 'block',
                        width: '100%',
                        height: 'auto',
                        border: '1px solid rgba(201,164,94,.55)',
                        borderRadius: '2px',
                        background: '#171513',
                      }}
                    />
                    <Box
                      component="h4"
                      sx={{
                        margin: '19px 0 0',
                        font: '400 clamp(20px, 1.55vw, 25px)/1.3 var(--font-ibm-plex-thai), sans-serif',
                      }}
                    >
                      {screen.title}
                    </Box>
                    <Box
                      component="p"
                      sx={{
                        margin: '9px 0 0',
                        color: 'rgba(255,255,255,.62)',
                        font: '400 16px/1.65 var(--font-ibm-plex-thai), sans-serif',
                      }}
                    >
                      {screen.description}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : null}
        </Box>
      </Box>

      <Box
        component="section"
        className="sb-service-detail-section"
        sx={{
          background: '#0d0c0a',
          color: '#fff',
          padding: {
            xs: '84px var(--sb-gutter)',
            md: '132px var(--sb-gutter)',
          },
        }}
      >
        <Box component="div" sx={{ maxWidth: '1500px', margin: '0 auto' }}>
          <Box
            component="div"
            className="sb-service-detail-intro"
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(280px, .72fr) minmax(0, 1.28fr)',
              },
              gap: { xs: '30px', md: '130px' },
              alignItems: 'start',
              paddingBottom: { xs: '62px', md: '88px' },
            }}
          >
            <Box component="div">
              <Box
                component="h2"
                sx={{
                  margin: 0,
                  maxWidth: '510px',
                  font: '400 clamp(32px, 3.4vw, 53px)/1.13 var(--font-ibm-plex-thai), sans-serif',
                  letterSpacing: '-.04em',
                }}
              >
                {copy.detailTitle}
              </Box>
            </Box>
            <Box
              component="p"
              sx={{
                margin: { xs: 0, md: '11px 0 0' },
                maxWidth: '660px',
                color: 'rgba(255,255,255,.68)',
                font: '400 clamp(18px, 1.45vw, 23px)/1.72 var(--font-ibm-plex-thai), sans-serif',
              }}
            >
              {copy.detailSummary}
            </Box>
            {copy.reference ? (
              <Box
                component="a"
                href={copy.reference.href}
                target="_blank"
                rel="noreferrer"
                sx={{
                  display: 'inline-flex',
                  width: 'fit-content',
                  marginTop: '18px',
                  color: '#d9b66f',
                  font: '600 14px/1.4 var(--font-ibm-plex-thai), sans-serif',
                  textDecoration: 'underline',
                  textUnderlineOffset: '4px',
                  '&:hover': { color: '#fff' },
                }}
              >
                {copy.reference.label}
              </Box>
            ) : null}
          </Box>

          <Box
            component="div"
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, minmax(0, 1fr))',
              },
              borderTop: '1px solid rgba(255,255,255,.22)',
            }}
          >
            {copy.details.map((detail, index) => (
              <Box
                component="article"
                key={detail.title}
                sx={{
                  minHeight: { md: '278px' },
                  padding: { xs: '31px 0', md: '40px 38px 36px' },
                  borderBottom: {
                    xs: '1px solid rgba(255,255,255,.16)',
                    md: 'none',
                  },
                  borderLeft: {
                    md:
                      index === 0 ? 'none' : '1px solid rgba(255,255,255,.16)',
                  },
                  '&:last-child': {
                    borderBottom: { xs: 'none', md: 'none' },
                  },
                  '&:first-of-type': { paddingLeft: { md: 0 } },
                  '&:last-of-type': { paddingRight: { md: 0 } },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    width: '36px',
                    height: '2px',
                    marginBottom: '31px',
                    background: '#c9a45e',
                  }}
                />
                <Box
                  component="h3"
                  sx={{
                    margin: 0,
                    font: '400 clamp(21px, 1.7vw, 28px)/1.25 var(--font-ibm-plex-thai), sans-serif',
                  }}
                >
                  {detail.title}
                </Box>
                <Box
                  component="p"
                  sx={{
                    margin: '16px 0 0',
                    maxWidth: '390px',
                    color: 'rgba(255,255,255,.62)',
                    font: '400 17px/1.68 var(--font-ibm-plex-thai), sans-serif',
                  }}
                >
                  {detail.description}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box
        component="section"
        className="sb-service-detail-section"
        sx={{
          background: '#000',
          color: '#fff',
          padding: {
            xs: '84px var(--sb-gutter)',
            md: '132px var(--sb-gutter) 152px',
          },
        }}
      >
        <Box component="div" sx={{ maxWidth: '1500px', margin: '0 auto' }}>
          <Box
            component="div"
            className="sb-service-detail-intro"
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(0, .9fr) minmax(0, 1.1fr)',
              },
              gap: { xs: '30px', md: '120px' },
              alignItems: 'start',
              marginBottom: { xs: '56px', md: '76px' },
            }}
          >
            <Box component="div">
              <Box
                component="h2"
                sx={{
                  margin: 0,
                  maxWidth: '520px',
                  font: '400 clamp(32px, 3.4vw, 53px)/1.13 var(--font-ibm-plex-thai), sans-serif',
                  letterSpacing: '-.04em',
                }}
              >
                {copy.journeyTitle}
              </Box>
            </Box>
            <Box
              component="p"
              sx={{
                margin: { xs: 0, md: '11px 0 0' },
                maxWidth: '680px',
                color: 'rgba(255,255,255,.68)',
                font: '400 clamp(18px, 1.45vw, 23px)/1.72 var(--font-ibm-plex-thai), sans-serif',
              }}
            >
              {copy.journeySummary}
            </Box>
          </Box>

          <Box
            component="ol"
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, minmax(0, 1fr))',
              },
              gap: { xs: '0', md: '28px' },
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
          >
            {copy.journey.map((step, index) => (
              <Box
                component="li"
                key={step.title}
                sx={{
                  padding: { xs: '27px 0', md: '34px 0 0' },
                  borderTop: '1px solid rgba(201,164,94,.7)',
                  borderBottom: {
                    xs: '1px solid rgba(255,255,255,.14)',
                    md: 'none',
                  },
                  '&:last-child': { borderBottom: { xs: 'none', md: 'none' } },
                }}
              >
                <Box
                  component="p"
                  sx={{
                    margin: 0,
                    color: '#c9a45e',
                    font: '600 11px/1 var(--font-inter), sans-serif',
                    letterSpacing: '.14em',
                  }}
                >
                  STEP {String(index + 1).padStart(2, '0')}
                </Box>
                <Box
                  component="h3"
                  sx={{
                    margin: '22px 0 0',
                    font: '400 clamp(21px, 1.7vw, 28px)/1.25 var(--font-ibm-plex-thai), sans-serif',
                  }}
                >
                  {step.title}
                </Box>
                <Box
                  component="p"
                  sx={{
                    margin: '14px 0 0',
                    maxWidth: '390px',
                    color: 'rgba(255,255,255,.62)',
                    font: '400 17px/1.68 var(--font-ibm-plex-thai), sans-serif',
                  }}
                >
                  {step.description}
                </Box>
              </Box>
            ))}
          </Box>

          <Box
            component="div"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
              gap: { xs: '30px', md: '70px' },
              alignItems: 'end',
              marginTop: { xs: '72px', md: '118px' },
              padding: { xs: '34px 0 0', md: '50px 0 0' },
              borderTop: '1px solid rgba(255,255,255,.22)',
            }}
          >
            <Box component="div">
              <Box
                component="h2"
                sx={{
                  margin: 0,
                  maxWidth: '770px',
                  font: '400 clamp(29px, 2.9vw, 48px)/1.16 var(--font-ibm-plex-thai), sans-serif',
                  letterSpacing: '-.04em',
                }}
              >
                {copy.closingTitle}
              </Box>
              <Box
                component="p"
                sx={{
                  margin: '20px 0 0',
                  maxWidth: '680px',
                  color: 'rgba(255,255,255,.67)',
                  font: '400 18px/1.7 var(--font-ibm-plex-thai), sans-serif',
                }}
              >
                {copy.closingDescription}
              </Box>
            </Box>
            <Box
              component={Link}
              href={copy.actionHref}
              sx={[websiteSx['sb-button'], websiteSx['sb-button-gold']]}
              className="sb-button sb-button-gold"
            >
              {copy.actionLabel}{' '}
              <ArrowUpRightIcon
                aria-hidden="true"
                className="sb-animated-arrow"
                size={24}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}
