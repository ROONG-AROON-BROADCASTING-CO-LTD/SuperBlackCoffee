import { useCallback, useContext, useSyncExternalStore } from 'react';
import { QueryClientContext, type QueryClient } from '@tanstack/react-query';
import { ConnectionRetrySnackbar } from '@stackbuild/ui';
import {
  hasAutoRetryErrors,
  subscribeToAutoRetryErrors,
} from './autoRetryErrorStore';

function useActiveQueryError(queryClient: QueryClient) {
  const queryCache = queryClient.getQueryCache();
  const subscribe = useCallback(
    (onStoreChange: () => void) => queryCache.subscribe(onStoreChange),
    [queryCache],
  );
  const getSnapshot = useCallback(
    () =>
      queryCache
        .getAll()
        .some(
          (query) =>
            query.getObserversCount() > 0 && query.state.status === 'error',
        ),
    [queryCache],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function AutoRetrySnackbar({ open }: { open: boolean }) {
  return <ConnectionRetrySnackbar open={open} />;
}

export function QueryAutoRetrySnackbar() {
  const queryClient = useContext(QueryClientContext);
  if (!queryClient) return null;
  return <QueryAutoRetrySnackbarContent queryClient={queryClient} />;
}

function QueryAutoRetrySnackbarContent({
  queryClient,
}: {
  queryClient: QueryClient;
}) {
  const hasQueryError = useActiveQueryError(queryClient);
  const hasManualLoadError = useSyncExternalStore(
    subscribeToAutoRetryErrors,
    hasAutoRetryErrors,
    () => false,
  );
  return <AutoRetrySnackbar open={hasQueryError || hasManualLoadError} />;
}
