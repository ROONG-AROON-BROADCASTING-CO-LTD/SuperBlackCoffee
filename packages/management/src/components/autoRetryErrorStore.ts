type Listener = () => void;

const activeSources = new Set<symbol>();
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setAutoRetryError(source: symbol, active: boolean) {
  const changed = active
    ? !activeSources.has(source)
    : activeSources.delete(source);
  if (active) activeSources.add(source);
  if (changed) notify();
}

export function subscribeToAutoRetryErrors(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hasAutoRetryErrors() {
  return activeSources.size > 0;
}
