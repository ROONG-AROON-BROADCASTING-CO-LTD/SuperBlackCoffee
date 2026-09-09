import type { HTMLAttributes } from 'react';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { motion, useAnimation, type Variants } from 'motion/react';

export interface FilePenLineIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

type FilePenLineIconProps = HTMLAttributes<HTMLDivElement> & {
  animate?: boolean;
  size?: number;
};

// Adapted from https://lucide-animated.com/r/file-pen-line.json
const penVariants: Variants = {
  normal: { rotate: 0, x: 0, y: 0 },
  animate: {
    rotate: [-0.3, 0.2, -0.4],
    x: [0, -0.5, 1, 0],
    y: [0, 1, -0.5, 0],
    transition: { duration: 0.5, repeat: 1, ease: 'easeInOut' },
  },
};

export const FilePenLineIcon = forwardRef<
  FilePenLineIconHandle,
  FilePenLineIconProps
>(({ animate = false, size = 22, style, ...props }, ref) => {
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
      style={{ display: 'flex', alignItems: 'center', lineHeight: 0, ...style }}
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
        <path d="m18 5-2.414-2.414A2 2 0 0 0 14.172 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" />
        <motion.path
          animate={controls}
          initial="normal"
          variants={penVariants}
          d="M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
        />
        <motion.path
          animate={controls}
          d="M8 18h1"
          transition={{ duration: 0.5 }}
          variants={{ normal: { d: 'M8 18h1' }, animate: { d: 'M8 18h5' } }}
        />
      </svg>
    </div>
  );
});

FilePenLineIcon.displayName = 'FilePenLineIcon';
