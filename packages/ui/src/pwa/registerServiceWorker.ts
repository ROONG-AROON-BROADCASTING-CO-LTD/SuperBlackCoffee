import { useEffect, useState } from 'react';

const serviceWorkerUpdateEvent = 'sbc:service-worker-update';
let updateAvailable = false;

function announceServiceWorkerUpdate() {
  updateAvailable = true;
  window.dispatchEvent(new Event(serviceWorkerUpdateEvent));
}

/**
 * Registers the app shell worker only for production builds. An update check
 * occurs when the user returns to the app, not on a timer or WebSocket.
 */
export function registerServiceWorker(enabled: boolean) {
  if (!enabled || !('serviceWorker' in navigator)) return;

  window.addEventListener(
    'load',
    () => {
      const hadController = Boolean(navigator.serviceWorker.controller);
      const onControllerChange = () => {
        // The very first installation also claims this tab. It is not an
        // update, so only notify tabs that were already service-worker owned.
        if (hadController) announceServiceWorkerUpdate();
      };
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        onControllerChange,
      );

      void navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          const checkForUpdateWhenVisible = () => {
            if (document.visibilityState === 'visible') {
              void registration.update().catch(() => undefined);
            }
          };
          document.addEventListener(
            'visibilitychange',
            checkForUpdateWhenVisible,
          );
        })
        .catch(() => undefined);
    },
    { once: true },
  );
}

/** Returns true once a newer app shell has taken control of this browser tab. */
export function useServiceWorkerUpdateAvailable() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(
    () => updateAvailable,
  );

  useEffect(() => {
    const showUpdate = () => setIsUpdateAvailable(true);
    window.addEventListener(serviceWorkerUpdateEvent, showUpdate);
    return () =>
      window.removeEventListener(serviceWorkerUpdateEvent, showUpdate);
  }, []);

  return isUpdateAvailable;
}
