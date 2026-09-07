import type { HTMLAttributes, MouseEvent } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import {
  motion,
  useAnimation,
  type Transition,
  type Variants,
} from 'motion/react';

export interface DeleteIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

const lidVariants: Variants = {
  normal: { y: 0 },
  animate: { y: -1.1 },
};

const springTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
};

export const DeleteIcon = forwardRef<
  DeleteIconHandle,
  HTMLAttributes<HTMLDivElement> & { size?: number }
>(({ onMouseEnter, onMouseLeave, size = 22, ...props }, ref) => {
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
        <motion.g
          animate={controls}
          transition={springTransition}
          variants={lidVariants}
        >
          <path d="M3 6h18" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </motion.g>
        <motion.path
          animate={controls}
          d="M19 8v12c0 1-1 2-2 2H7c-1 0-2-1-2-2V8"
          transition={springTransition}
          variants={{
            normal: { d: 'M19 8v12c0 1-1 2-2 2H7c-1 0-2-1-2-2V8' },
            animate: { d: 'M19 9v12c0 1-1 2-2 2H7c-1 0-2-1-2-2V9' },
          }}
        />
        {[10, 14].map((x) => (
          <motion.line
            key={x}
            animate={controls}
            transition={springTransition}
            variants={{
              normal: { y1: 11, y2: 17 },
              animate: { y1: 11.5, y2: 17.5 },
            }}
            x1={x}
            x2={x}
            y1="11"
            y2="17"
          />
        ))}
      </svg>
    </div>
  );
});

DeleteIcon.displayName = 'DeleteIcon';
