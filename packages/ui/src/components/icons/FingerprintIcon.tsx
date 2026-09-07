import type { HTMLAttributes } from 'react';
import { useEffect } from 'react';
import { motion, useAnimation, type Variants } from 'motion/react';

type FingerprintIconProps = HTMLAttributes<HTMLDivElement> & {
  animate?: boolean;
  size?: number;
};

// Source: https://lucide-animated.com/r/fingerprint.json
const paths = [
  'M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4',
  'M14 13.12c0 2.38 0 6.38-1 8.88',
  'M17.29 21.02c.12-.6.43-2.3.5-3.02',
  'M2 12a10 10 0 0 1 18-6',
  'M2 16h.01',
  'M21.8 16c.2-2 .131-5.354 0-6',
  'M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2',
  'M8.65 22c.21-.66.45-1.32.57-2',
  'M9 6.8a6 6 0 0 1 9 5.2v2',
];

const pathVariants: Variants = {
  normal: { opacity: 1, pathLength: 1 },
  animate: {
    opacity: [0.15, 1],
    pathLength: [0.15, 1],
    transition: { duration: 0.28, ease: 'easeOut' },
  },
};

export function FingerprintIcon({
  animate = false,
  size = 22,
  style,
  ...props
}: FingerprintIconProps) {
  const controls = useAnimation();

  useEffect(() => {
    void controls.start(animate ? 'animate' : 'normal');
  }, [animate, controls]);

  return (
    <div
      {...props}
      style={{ display: 'flex', alignItems: 'center', lineHeight: 0, ...style }}
    >
      <svg
        aria-hidden="true"
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width={size}
      >
        {paths.map((path) => (
          <motion.path
            key={path}
            animate={controls}
            d={path}
            variants={pathVariants}
          />
        ))}
      </svg>
    </div>
  );
}
