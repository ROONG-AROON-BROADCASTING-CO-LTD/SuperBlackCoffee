import type { HTMLAttributes, MouseEvent } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { motion, useAnimation, type Transition } from 'motion/react';

export interface ChevronDownIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

type ChevronDownIconProps = HTMLAttributes<HTMLDivElement> & {
  size?: number;
};

const defaultTransition: Transition = {
  times: [0, 0.4, 1],
  duration: 0.5,
};

// Source: https://lucide-animated.com/r/chevron-down.json
export const ChevronDownIcon = forwardRef<
  ChevronDownIconHandle,
  ChevronDownIconProps
>(({ onMouseEnter, onMouseLeave, size = 22, style, ...props }, ref) => {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;
    return {
      startAnimation: () => void controls.start('animate'),
      stopAnimation: () => void controls.start('normal'),
    };
  }, [controls]);

  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) onMouseEnter?.(event);
      else void controls.start('animate');
    },
    [controls, onMouseEnter],
  );
  const handleMouseLeave = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) onMouseLeave?.(event);
      else void controls.start('normal');
    },
    [controls, onMouseLeave],
  );

  return (
    <div
      {...props}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
        <motion.path
          animate={controls}
          d="m6 9 6 6 6-6"
          transition={defaultTransition}
          variants={{ normal: { y: 0 }, animate: { y: [0, 2, 0] } }}
        />
      </svg>
    </div>
  );
});

ChevronDownIcon.displayName = 'ChevronDownIcon';
