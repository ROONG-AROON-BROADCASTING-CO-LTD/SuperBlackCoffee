import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginScreen } from '../LoginScreen';

afterEach(cleanup);

describe('LoginScreen', () => {
  it('marks the credentials as an existing sign-in for password managers', () => {
    const { container } = render(
      <LoginScreen
        headline="Portal"
        description="Sign in"
        submitLabel="เข้าสู่ระบบ"
        onSubmit={vi.fn()}
      />,
    );

    expect(container.querySelector('form')?.getAttribute('method')).toBe(
      'post',
    );
    expect(
      container.querySelector('#login-username')?.getAttribute('autocomplete'),
    ).toBe('username');
    expect(
      container.querySelector('#login-password')?.getAttribute('autocomplete'),
    ).toBe('current-password');
  });

  it('switches the animated visibility icon with the password state', () => {
    const { container } = render(
      <LoginScreen
        headline="Portal"
        description="Sign in"
        submitLabel="เข้าสู่ระบบ"
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'ดูรหัสผ่าน' }));

    expect(
      container.querySelector('#login-password')?.getAttribute('type'),
    ).toBe('text');
    expect(screen.getByRole('button', { name: 'ซ่อนรหัสผ่าน' })).toBeTruthy();
  });
});
