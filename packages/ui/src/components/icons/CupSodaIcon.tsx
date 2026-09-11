import { useEffect } from 'react';
import { motion, useAnimation, type Variants } from 'motion/react';

type CupSodaIconProps = { animate?: boolean; size?: number };

// Source: https://lucide-animated.com/icons/cup-soda
const strawVariants: Variants = {
  normal: { y: 0, scaleY: 1 },
  animate: {
    y: [0, -0.85, 0.15, 0],
    scaleY: [1, 1.06, 0.99, 1],
    transition: { duration: 0.5, times: [0, 0.35, 0.65, 1] },
  },
};
const waveVariants: Variants = {
  normal: { y: 0 },
  animate: {
    y: [0, -1, 0],
    transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
  },
};

export function CupSodaIcon({ animate = false, size = 22 }: CupSodaIconProps) {
  const controls = useAnimation();
  useEffect(() => {
    void controls.start(animate ? 'animate' : 'normal');
  }, [animate, controls]);

  return (
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
      <path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8" />
      <path d="M5 8h14" />
      <motion.path
        animate={controls}
        d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"
        initial={false}
        variants={waveVariants}
      />
      <motion.path
        animate={controls}
        d="m12 8 1-6h2"
        initial={false}
        style={{ transformBox: 'fill-box', originX: '50%', originY: '100%' }}
        variants={strawVariants}
      />
    </svg>
  );
}
