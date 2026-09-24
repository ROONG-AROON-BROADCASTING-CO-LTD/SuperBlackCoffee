import { Box } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import type { ComponentProps } from 'react';

const loaderSpin = keyframes`to { transform: rotate(360deg); }`;

type LoaderIconProps = Omit<ComponentProps<typeof Box>, 'component'> & {
  size?: number;
  animate?: boolean;
};

/** Adapted from lucide-animated.com/r/loader.json for the MUI app. */
export function LoaderIcon({
  animate = false,
  size = 28,
  ...props
}: LoaderIconProps) {
  return (
    <Box
      component="span"
      {...props}
      sx={{
        animation: animate ? `${loaderSpin} 0.8s linear infinite` : 'none',
        display: 'inline-flex',
        flexShrink: 0,
        lineHeight: 0,
      }}
    >
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <path d="M12 2v4" />
          <path d="m16.2 7.8 2.9-2.9" />
          <path d="M18 12h4" />
          <path d="m16.2 16.2 2.9 2.9" />
          <path d="M12 18v4" />
          <path d="m4.9 19.1 2.9-2.9" />
          <path d="M2 12h4" />
          <path d="m4.9 4.9 2.9 2.9" />
        </g>
      </svg>
    </Box>
  );
}
