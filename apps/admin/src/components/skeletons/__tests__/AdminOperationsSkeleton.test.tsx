import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminOperationsSkeleton } from '../AdminOperationsSkeleton';

describe('AdminOperationsSkeleton', () => {
  it('mirrors the operations table column count and loading rows', () => {
    const { container } = render(<AdminOperationsSkeleton columns={4} />);

    expect(
      screen.getByLabelText('กำลังโหลดข้อมูลตรวจมาตรฐานและบริการ'),
    ).toBeTruthy();
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(35);
  });
});
