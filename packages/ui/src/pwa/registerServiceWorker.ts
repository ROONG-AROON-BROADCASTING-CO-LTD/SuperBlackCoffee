/** Registers the app shell worker only for production builds. */
export function registerServiceWorker(enabled: boolean) {
  if (!enabled || !('serviceWorker' in navigator)) return;

  window.addEventListener(
    'load',
    () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    },
    { once: true },
  );
}
