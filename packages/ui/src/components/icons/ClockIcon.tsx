import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';

export type ClockIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

export const ClockIcon = forwardRef<
  ClockIconHandle,
  {
    size?: number;
    animated?: boolean;
    animate?: boolean;
  }
>(({ size = 20, animated = false, animate = animated }, ref) => {
  const controls = useAnimation();
  const controlled = useRef(false);

  useEffect(() => {
    void controls.start(animate ? 'animate' : 'normal');
  }, [animate, controls]);

  useImperativeHandle(ref, () => {
    controlled.current = true;
    return {
      startAnimation: () => void controls.start('animate'),
      stopAnimation: () => void controls.start('normal'),
    };
  }, [controls]);

  return (
    <svg
      fill="none"
      height={size}
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" />
      <motion.line
        animate={controls}
        initial="normal"
        variants={{
          normal: { rotate: 0, originX: '0%', originY: '100%' },
          animate: { rotate: 360, originX: '0%', originY: '100%' },
        }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        x1="12"
        x2="12"
        y1="12"
        y2="6"
      />
      <motion.line
        animate={controls}
        initial="normal"
        variants={{
          normal: { rotate: 0, originX: '0%', originY: '100%' },
          animate: { rotate: 45, originX: '0%', originY: '100%' },
        }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        x1="12"
        x2="16"
        y1="12"
        y2="12"
      />
    </svg>
  );
});

ClockIcon.displayName = 'ClockIcon';
