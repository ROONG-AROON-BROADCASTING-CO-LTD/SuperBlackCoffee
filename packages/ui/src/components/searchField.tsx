import { useRef } from 'react';
import { InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import { SearchIcon, type SearchIconHandle } from './icons/SearchIcon';

/**
 * Visual baseline for list and catalogue search fields. Page layout may
 * control the width, while the input itself keeps the same height, corners,
 * type scale, and focus treatment everywhere.
 */
export const searchFieldSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 40,
    borderRadius: '12px',
    bgcolor: '#fff',
    fontFamily: 'Kanit, sans-serif',
    fontSize: 14,
    transition: 'border-color 160ms ease, box-shadow 160ms ease',
    '&.Mui-focused': {
      boxShadow: '0 0 0 3px rgba(91, 63, 47, 0.14)',
    },
  },
  '& .MuiOutlinedInput-input': { py: 1 },
  '& .MuiInputAdornment-root': { color: '#7c6a5e' },
};

export type SearchFieldProps = Omit<
  TextFieldProps,
  'onBlur' | 'onFocus' | 'slotProps'
>;

/** A controlled search input with consistent visual and icon-focus behavior. */
export function SearchField({ sx, ...props }: SearchFieldProps) {
  const iconRef = useRef<SearchIconHandle>(null);
  const sxItems = Array.isArray(sx) ? sx : [sx];

  return (
    <TextField
      {...props}
      size="small"
      sx={[searchFieldSx, ...sxItems]}
      onFocus={() => iconRef.current?.startAnimation()}
      onBlur={() => iconRef.current?.stopAnimation()}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon ref={iconRef} size={18} />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
