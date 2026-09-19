import {
  Button,
  Stack,
  type ButtonProps,
  type StackProps,
} from '@mui/material';
import type { ReactNode } from 'react';

type ItemActionButtonProps = Omit<ButtonProps, 'color' | 'variant'>;

const sharedButtonSx = {
  flex: 1,
  minWidth: 0,
  minHeight: 40,
  borderRadius: '12px',
  boxShadow: 'none',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: 'nowrap',
  '&:hover': { boxShadow: 'none' },
} as const;

export function EditItemButton({ sx, ...props }: ItemActionButtonProps) {
  return (
    <Button
      variant="contained"
      {...props}
      sx={{
        ...sharedButtonSx,
        bgcolor: '#6f4731',
        '&:hover': { bgcolor: '#513322', boxShadow: 'none' },
        ...sx,
      }}
    />
  );
}

export function DeleteItemButton({ sx, ...props }: ItemActionButtonProps) {
  return (
    <Button
      variant="contained"
      color="error"
      {...props}
      sx={{
        ...sharedButtonSx,
        bgcolor: '#df2c31',
        '&:hover': { bgcolor: '#bd2026', boxShadow: 'none' },
        ...sx,
      }}
    />
  );
}

export function ItemActionButtons({
  editLabel = 'แก้ไข',
  deleteLabel = 'ลบ',
  onEdit,
  onDelete,
  editButtonProps,
  deleteButtonProps,
  sx,
}: {
  editLabel?: ReactNode;
  deleteLabel?: ReactNode;
  onEdit: ButtonProps['onClick'];
  onDelete: ButtonProps['onClick'];
  editButtonProps?: Omit<ItemActionButtonProps, 'onClick' | 'children'>;
  deleteButtonProps?: Omit<ItemActionButtonProps, 'onClick' | 'children'>;
  sx?: StackProps['sx'];
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ width: '100%', ...sx }}>
      <EditItemButton onClick={onEdit} {...editButtonProps}>
        {editLabel}
      </EditItemButton>
      <DeleteItemButton onClick={onDelete} {...deleteButtonProps}>
        {deleteLabel}
      </DeleteItemButton>
    </Stack>
  );
}
