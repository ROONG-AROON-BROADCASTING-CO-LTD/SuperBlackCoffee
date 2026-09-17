import { Box, Button, type ButtonProps } from '@mui/material';
import type { ReactNode } from 'react';

/**
 * Shared styling for compact, mutually-exclusive filters such as menu
 * categories and sales channels. Both states reserve the same geometry so
 * selecting an option never shifts neighbouring controls.
 */
export const selectionPillSx = (selected: boolean) => ({
  minHeight: 40,
  px: { xs: 1.75, sm: 2.25 },
  borderRadius: '14px',
  border: '1px solid',
  borderColor: selected ? '#201914' : '#d8c8bd',
  bgcolor: selected ? '#201914' : '#fff',
  color: selected ? '#fff' : '#5f4b3d',
  fontFamily: 'Kanit, sans-serif',
  fontSize: { xs: 13, sm: 14 },
  fontWeight: 600,
  lineHeight: 1.2,
  textTransform: 'none',
  boxShadow: 'none',
  transform: 'none',
  transition:
    'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
  '&:hover': {
    borderColor: '#201914',
    bgcolor: selected ? '#3c2d24' : '#f5eee9',
    boxShadow: 'none',
  },
  '&:active': { transform: 'none' },
});

type FilterPillProps = Omit<ButtonProps, 'children' | 'onClick'> & {
  children: ReactNode;
  selected: boolean;
  count?: number;
  onClick: () => void;
};

/**
 * Shared filter control whose count sits on its own top-right corner.
 *
 * The badge is centered on this control's top-right rounded corner. Extra end
 * padding reserves a dedicated space for it, so the label stays clear and
 * filter gaps stay consistent.
 */
export function FilterPill({
  children,
  selected,
  count,
  onClick,
  ...buttonProps
}: FilterPillProps) {
  const showsCount = typeof count === 'number' && count > 0;
  return (
    <Button
      {...buttonProps}
      size="small"
      variant={selected ? 'contained' : 'outlined'}
      onClick={onClick}
      sx={{
        position: 'relative',
        overflow: 'visible',
        ...selectionPillSx(selected),
        ...(showsCount ? { pr: 5.5 } : {}),
        ...buttonProps.sx,
      }}
    >
      {children}
      {showsCount ? (
        <Box
          component="span"
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top: -12,
            right: -4,
            display: 'grid',
            placeItems: 'center',
            minWidth: 24,
            height: 24,
            px: 0.5,
            borderRadius: '999px',
            bgcolor: '#df292d',
            color: '#fff',
            fontFamily: 'Kanit, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {count}
        </Box>
      ) : null}
    </Button>
  );
}
