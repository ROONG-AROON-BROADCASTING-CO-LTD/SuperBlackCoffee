import { useEffect } from 'react';
import { motion, useAnimation, type Variants } from 'motion/react';

type CircleCheckIconProps = { animate?: boolean; size?: number };

// Source: https://lucide-animated.com/r/circle-check.json
const pathVariants: Variants = {
  normal: {
    opacity: 1,
    pathLength: 1,
    transition: {
      duration: 0.3,
      opacity: { duration: 0.1 },
    },
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    transition: {
      duration: 0.4,
      opacity: { duration: 0.1 },
    },
  },
};

export function CircleCheckIcon({
  animate = false,
  size = 24,
}: CircleCheckIconProps) {
  const controls = useAnimation();

  useEffect(() => {
    if (!animate) {
      void controls.start('normal');
      return undefined;
    }

    const play = () => {
      controls.set('normal');
      void controls.start('animate');
    };
    play();
    const loop = window.setInterval(play, 1_150);
    return () => window.clearInterval(loop);
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
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" />
      <motion.path
        animate={controls}
        d="m9 12 2 2 4-4"
        initial="normal"
        variants={pathVariants}
      />
    </svg>
  );
}
