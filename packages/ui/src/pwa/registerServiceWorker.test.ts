import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  registerServiceWorker,
  useServiceWorkerUpdateAvailable,
} from './registerServiceWorker';

const originalServiceWorker = Object.getOwnPropertyDescriptor(
  navigator,
  'serviceWorker',
);

const workerEvents = new EventTarget();

function setServiceWorker(
  register: ReturnType<typeof vi.fn>,
  controller: ServiceWorker | null = null,
) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      register,
      controller,
      addEventListener: workerEvents.addEventListener.bind(workerEvents),
    },
  });
}

describe('registerServiceWorker', () => {
  afterEach(() => {
    vi.restoreAllMocks();

    if (originalServiceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker);
    } else {
      Reflect.deleteProperty(navigator, 'serviceWorker');
    }
  });

  it('does not register a worker outside a production build', () => {
    const register = vi.fn();
    setServiceWorker(register);

    registerServiceWorker(false);
    window.dispatchEvent(new Event('load'));

    expect(register).not.toHaveBeenCalled();
  });

  it('does not wait for page load in browsers without service worker support', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    Reflect.deleteProperty(navigator, 'serviceWorker');

    registerServiceWorker(true);

    expect(addEventListener).not.toHaveBeenCalledWith(
      'load',
      expect.any(Function),
      expect.anything(),
    );
  });

  it('registers the app worker once after the page has loaded', () => {
    const register = vi.fn().mockResolvedValue({ update: vi.fn() });
    setServiceWorker(register);

    registerServiceWorker(true);
    expect(register).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('load'));
    window.dispatchEvent(new Event('load'));

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('keeps the app usable when service worker registration is rejected', async () => {
    const register = vi.fn().mockRejectedValue(new Error('worker unavailable'));
    setServiceWorker(register);

    registerServiceWorker(true);
    window.dispatchEvent(new Event('load'));
    await Promise.resolve();

    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('does not show an update when the first worker claims the page', async () => {
    const { result } = renderHook(() => useServiceWorkerUpdateAvailable());
    const register = vi.fn().mockResolvedValue({ update: vi.fn() });
    setServiceWorker(register);

    registerServiceWorker(true);
    window.dispatchEvent(new Event('load'));
    await Promise.resolve();
    act(() => workerEvents.dispatchEvent(new Event('controllerchange')));

    expect(result.current).toBe(false);
  });

  it('shows an update only after an existing worker is replaced', async () => {
    const { result } = renderHook(() => useServiceWorkerUpdateAvailable());
    const register = vi.fn().mockResolvedValue({ update: vi.fn() });
    setServiceWorker(register, {} as ServiceWorker);

    registerServiceWorker(true);
    window.dispatchEvent(new Event('load'));
    await Promise.resolve();
    act(() => workerEvents.dispatchEvent(new Event('controllerchange')));

    expect(result.current).toBe(true);
  });
});
