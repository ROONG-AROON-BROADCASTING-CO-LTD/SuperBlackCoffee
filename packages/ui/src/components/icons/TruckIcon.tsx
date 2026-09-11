import { useEffect } from 'react';
import { motion, useAnimation, type Variants } from 'motion/react';

type TruckIconProps = { animate?: boolean; size?: number };

// Source: https://lucide-animated.com/icons/truck
const truckVariants: Variants = {
  normal: { y: 0 },
  animate: {
    y: [0, -1, 0, -0.5, 0],
    transition: { duration: 0.4, ease: 'easeInOut', repeat: Infinity },
  },
};
const wheelVariants: Variants = {
  normal: { rotate: 0 },
  animate: {
    rotate: 360,
    transition: { duration: 0.5, ease: 'linear', repeat: Infinity },
  },
};

export function TruckIcon({ animate = false, size = 22 }: TruckIconProps) {
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
      style={{ overflow: 'visible' }}
      viewBox="0 0 24 24"
      width={size}
    >
      <motion.g animate={controls} initial={false} variants={truckVariants}>
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      </motion.g>
      <motion.g
        animate={controls}
        initial={false}
        style={{ transformOrigin: '7px 18px' }}
        variants={wheelVariants}
      >
        <circle cx="7" cy="18" r="2" />
        <path d="M7 16.5v3M5.5 18h3" strokeWidth="1.5" />
      </motion.g>
      <motion.g
        animate={controls}
        initial={false}
        style={{ transformOrigin: '17px 18px' }}
        variants={wheelVariants}
      >
        <circle cx="17" cy="18" r="2" />
        <path d="M17 16.5v3M15.5 18h3" strokeWidth="1.5" />
      </motion.g>
    </svg>
  );
}
