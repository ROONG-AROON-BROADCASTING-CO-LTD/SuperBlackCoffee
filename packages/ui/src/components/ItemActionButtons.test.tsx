import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ItemActionButtons } from './ItemActionButtons';

describe('ItemActionButtons', () => {
  it('renders the shared edit and destructive actions and delegates each click', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <ItemActionButtons
        editLabel="แก้ไขสินค้า"
        deleteLabel="นำออก"
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขสินค้า' }));
    fireEvent.click(screen.getByRole('button', { name: 'นำออก' }));

    expect(onEdit).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
