import { useEffect } from 'react';

function disableAutofill(element: Element) {
  if (element instanceof HTMLFormElement) {
    element.autocomplete = 'off';
    return;
  }
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    element.autocomplete =
      element instanceof HTMLInputElement && element.type === 'password'
        ? 'new-password'
        : 'off';
  }
}

/** Disables browser-saved-value suggestions, including fields rendered later in dialogs. */
export function BrowserAutofillGuard() {
  useEffect(() => {
    const apply = (root: ParentNode) => {
      root
        .querySelectorAll('form, input, textarea, select')
        .forEach(disableAutofill);
    };
    apply(document);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            disableAutofill(node);
            apply(node);
          }
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const onFocus = (event: FocusEvent) => {
      if (event.target instanceof Element) disableAutofill(event.target);
    };
    document.addEventListener('focusin', onFocus);
    return () => {
      observer.disconnect();
      document.removeEventListener('focusin', onFocus);
    };
  }, []);
  return null;
}
