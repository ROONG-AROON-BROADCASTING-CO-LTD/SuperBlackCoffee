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
