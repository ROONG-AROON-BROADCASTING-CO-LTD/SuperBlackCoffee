import { forwardRef, useImperativeHandle, useRef } from 'react';
import { InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import {
  CalendarDaysIcon,
  type CalendarDaysIconHandle,
} from './icons/CalendarDaysIcon';

export type DateFieldProps = Omit<
  TextFieldProps,
  'type' | 'size' | 'slotProps'
> & {
  min?: string;
  max?: string;
};

/**
 * Shared date entry field.  It deliberately replaces the browser's varying
 * date icon with the same calendar affordance used by the inspection screen.
 */
export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  ({ min, max, onClick, sx, ...props }, forwardedRef) => {
    const calendarIconRef = useRef<CalendarDaysIconHandle>(null);
    const nativeDateInputRef = useRef<HTMLInputElement>(null);
    const sxItems = Array.isArray(sx) ? sx : [sx];

    useImperativeHandle(forwardedRef, () => nativeDateInputRef.current!, []);

    return (
      <TextField
        {...props}
        fullWidth={props.fullWidth ?? true}
        inputRef={nativeDateInputRef}
        type="date"
        onClick={(event) => {
          onClick?.(event);
          calendarIconRef.current?.startAnimation();
          window.setTimeout(
            () => calendarIconRef.current?.stopAnimation(),
            950,
          );

          try {
            nativeDateInputRef.current?.showPicker?.();
          } catch {
            // Safari and older browsers retain their native click behavior.
          }
        }}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { min, max },
          input: {
            endAdornment: (
              <InputAdornment
                position="end"
                sx={{ color: '#878787', pointerEvents: 'none' }}
              >
                <CalendarDaysIcon ref={calendarIconRef} size={22} />
              </InputAdornment>
            ),
          },
        }}
        sx={[
          {
            '& .MuiOutlinedInput-root': {
              minHeight: 56,
              borderRadius: '16px',
              bgcolor: '#fff',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 16,
              '&.Mui-focused': {
                boxShadow: '0 0 0 3px rgba(91, 63, 47, 0.1)',
              },
            },
            '& .MuiInputLabel-root': {
              fontFamily: 'Kanit, sans-serif',
              color: '#777',
            },
            '& input::-webkit-calendar-picker-indicator': {
              display: 'none',
            },
          },
          ...sxItems,
        ]}
      />
    );
  },
);

DateField.displayName = 'DateField';
