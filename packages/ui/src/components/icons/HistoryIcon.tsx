import type { HTMLAttributes } from 'react';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import {
  motion,
  useAnimation,
  type Transition,
  type Variants,
} from 'motion/react';

export interface HistoryIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

type HistoryIconProps = HTMLAttributes<HTMLDivElement> & {
  animate?: boolean;
  size?: number;
};

// Adapted from https://lucide-animated.com/r/history.json
const arrowTransition: Transition = {
  type: 'spring',
  stiffness: 250,
  damping: 25,
};
const arrowVariants: Variants = {
  normal: { rotate: '0deg' },
  animate: { rotate: '-50deg' },
};
const handVariants: Variants = {
  normal: { rotate: 0, originX: '0%', originY: '100%' },
  animate: { rotate: -360, originX: '0%', originY: '100%' },
};
const minuteHandVariants: Variants = {
  normal: { rotate: 0, originX: '0%', originY: '0%' },
  animate: { rotate: -45, originX: '0%', originY: '0%' },
};

export const HistoryIcon = forwardRef<HistoryIconHandle, HistoryIconProps>(
  ({ animate = false, size = 22, style, ...props }, ref) => {
    const controls = useAnimation();
    const replay = () =>
      controls.start('normal').then(() => controls.start('animate'));

    useEffect(() => {
      if (animate) void replay();
      else void controls.start('normal');
    }, [animate, controls]);

    useImperativeHandle(
      ref,
      () => ({
        startAnimation: () => {
          void replay();
        },
        stopAnimation: () => {
          void controls.start('normal');
        },
      }),
      [controls],
    );

    return (
      <div
        {...props}
        style={{
          display: 'flex',
          alignItems: 'center',
          lineHeight: 0,
          ...style,
        }}
      >
        <svg
          fill="none"
          height={size}
          width={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <motion.g
            animate={controls}
            transition={arrowTransition}
            variants={arrowVariants}
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </motion.g>
          <motion.line
            animate={controls}
            initial="normal"
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            variants={handVariants}
            x1="12"
            x2="12"
            y1="12"
            y2="7"
          />
          <motion.line
            animate={controls}
            initial="normal"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            variants={minuteHandVariants}
            x1="12"
            x2="16"
            y1="12"
            y2="14"
          />
        </svg>
      </div>
    );
  },
);

HistoryIcon.displayName = 'HistoryIcon';
