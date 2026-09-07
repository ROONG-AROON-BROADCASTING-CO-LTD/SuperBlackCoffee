import type { HTMLAttributes, MouseEvent } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { motion, useAnimation, type Variants } from 'motion/react';

export interface TimerIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

const handVariants: Variants = {
  normal: {
    rotate: 0,
    originX: '0%',
    originY: '100%',
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
  },
  animate: {
    rotate: 300,
    originX: '0%',
    originY: '100%',
    transition: { delay: 0.1, duration: 0.6, ease: [0.4, 0, 0.2, 1] },
  },
};

const buttonVariants: Variants = {
  normal: { scale: 1, y: 0 },
  animate: {
    scale: [0.9, 1],
    y: [0, 1, 0],
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
};

export const TimerIcon = forwardRef<
  TimerIconHandle,
  HTMLAttributes<HTMLDivElement> & { size?: number }
>(({ onMouseEnter, onMouseLeave, size = 24, ...props }, ref) => {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;
    return {
      startAnimation: () => controls.start('animate'),
      stopAnimation: () => controls.start('normal'),
    };
  });

  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) onMouseEnter?.(event);
      else controls.start('animate');
    },
    [controls, onMouseEnter],
  );
  const handleMouseLeave = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) onMouseLeave?.(event);
      else controls.start('normal');
    },
    [controls, onMouseLeave],
  );

  return (
    <div
      {...props}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <svg
        aria-hidden="true"
        fill="none"
        height={size}
        width={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <motion.line
          animate={controls}
          variants={buttonVariants}
          x1="10"
          x2="14"
          y1="2"
          y2="2"
        />
        <motion.line
          animate={controls}
          initial="normal"
          variants={handVariants}
          x1="12"
          x2="15"
          y1="14"
          y2="11"
        />
        <circle cx="12" cy="14" r="8" />
      </svg>
    </div>
  );
});

TimerIcon.displayName = 'TimerIcon';
