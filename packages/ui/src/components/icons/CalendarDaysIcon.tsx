import type { HTMLAttributes } from 'react';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { motion, useAnimation, type Variants } from 'motion/react';

export interface CalendarDaysIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

type CalendarDaysIconProps = HTMLAttributes<HTMLDivElement> & {
  animate?: boolean;
  size?: number;
};

// Source: https://lucide-animated.com/r/calendar-days.json
const dots = [
  { cx: 8, cy: 14 },
  { cx: 12, cy: 14 },
  { cx: 16, cy: 14 },
  { cx: 8, cy: 18 },
  { cx: 12, cy: 18 },
  { cx: 16, cy: 18 },
];

const variants: Variants = {
  normal: { opacity: 1, transition: { duration: 0.2 } },
  animate: (index: number) => ({
    opacity: [1, 0.3, 1],
    transition: { delay: index * 0.1, duration: 0.4, times: [0, 0.5, 1] },
  }),
};

export const CalendarDaysIcon = forwardRef<
  CalendarDaysIconHandle,
  CalendarDaysIconProps
>(({ animate = false, size = 22, style, ...props }, ref) => {
  const controls = useAnimation();

  useEffect(() => {
    void controls.start(animate ? 'animate' : 'normal');
  }, [animate, controls]);

  useImperativeHandle(
    ref,
    () => ({
      startAnimation: () => void controls.start('animate'),
      stopAnimation: () => void controls.start('normal'),
    }),
    [controls],
  );

  return (
    <div
      {...props}
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
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect height="18" rx="2" width="18" x="3" y="4" />
        <path d="M3 10h18" />
        {dots.map((dot, index) => (
          <motion.circle
            key={`${dot.cx}-${dot.cy}`}
            animate={controls}
            custom={index}
            cx={dot.cx}
            cy={dot.cy}
            fill="currentColor"
            initial="normal"
            r="1"
            stroke="none"
            variants={variants}
          />
        ))}
      </svg>
    </div>
  );
});

CalendarDaysIcon.displayName = 'CalendarDaysIcon';
