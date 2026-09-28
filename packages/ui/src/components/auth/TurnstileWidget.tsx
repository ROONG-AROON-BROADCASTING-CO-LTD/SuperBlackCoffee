import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const scriptId = 'cloudflare-turnstile-script';

export function TurnstileWidget({
  onToken,
}: {
  onToken: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const [ready, setReady] = useState(Boolean(window.turnstile));
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  useEffect(() => {
    if (!siteKey) return;
    const script = document.getElementById(
      scriptId,
    ) as HTMLScriptElement | null;
    const handleLoad = () => setReady(true);
    if (window.turnstile) {
      setReady(true);
      return;
    }
    if (script) {
      script.addEventListener('load', handleLoad);
      return () => script.removeEventListener('load', handleLoad);
    }
    const next = document.createElement('script');
    next.id = scriptId;
    next.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    next.async = true;
    next.defer = true;
    next.addEventListener('load', handleLoad);
    document.head.appendChild(next);
    return () => next.removeEventListener('load', handleLoad);
  }, [siteKey]);

  useEffect(() => {
    if (
      !siteKey ||
      !ready ||
      !window.turnstile ||
      !containerRef.current ||
      widgetId.current
    )
      return;
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onToken,
      'expired-callback': () => onToken(''),
      'error-callback': () => onToken(''),
    });
  }, [onToken, ready, siteKey]);

  if (!siteKey) {
    return (
      <Typography color="error" variant="caption" sx={{ display: 'block' }}>
        ยังไม่ได้ตั้งค่า Cloudflare Turnstile site key
      </Typography>
    );
  }
  return (
    <Box
      ref={containerRef}
      sx={{
        minHeight: 65,
        minWidth: 0,
        display: 'flex',
        justifyContent: 'center',
        '@media (max-width:359px)': {
          '& > *': { transform: 'scale(0.86)', transformOrigin: 'center top' },
        },
      }}
    />
  );
}
