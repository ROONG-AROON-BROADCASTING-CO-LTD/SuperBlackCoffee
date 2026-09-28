import { motion, useAnimation } from 'motion/react';
import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

export interface EyeIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface EyeIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const EyeIcon = forwardRef<EyeIconHandle, EyeIconProps>(
  ({ onMouseEnter, onMouseLeave, size = 22, style, ...props }, ref) => {
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
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) onMouseEnter?.(event);
        else controls.start('animate');
      },
      [controls, onMouseEnter],
    );

    const handleMouseLeave = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
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
        style={{ display: 'flex', ...style }}
      >
        <svg
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
            d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
            style={{ originY: '50%' }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            variants={{
              normal: { scaleY: 1, opacity: 1 },
              animate: { scaleY: [1, 0.1, 1], opacity: [1, 0.3, 1] },
            }}
          />
          <motion.circle
            animate={controls}
            cx="12"
            cy="12"
            r="3"
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            variants={{
              normal: { scale: 1, opacity: 1 },
              animate: { scale: [1, 0.3, 1], opacity: [1, 0.3, 1] },
            }}
          />
        </svg>
      </div>
    );
  },
);

EyeIcon.displayName = 'EyeIcon';

export { EyeIcon };
