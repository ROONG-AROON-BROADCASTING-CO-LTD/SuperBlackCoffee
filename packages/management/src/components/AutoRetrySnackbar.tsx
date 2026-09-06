import {
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { QueryClientContext, type QueryClient } from '@tanstack/react-query';
import { Alert, Box, Snackbar } from '@mui/material';
import { BadgeAlertIcon } from '@stackbuild/ui';

const retrySeconds = 10;

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
  const [secondsRemaining, setSecondsRemaining] = useState(retrySeconds);

  useEffect(() => {
    if (!open) return;
    setSecondsRemaining(retrySeconds);
    const interval = window.setInterval(() => {
      setSecondsRemaining((seconds) =>
        seconds <= 1 ? retrySeconds : seconds - 1,
      );
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [open]);

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ mb: 2 }}
    >
      <Alert
        severity="error"
        variant="filled"
        icon={<BadgeAlertIcon animate={open} />}
        sx={{ fontFamily: 'Kanit, sans-serif' }}
      >
        เชื่อมต่อระบบไม่ได้ จะลองใหม่ใน{' '}
        <Box
          component="span"
          sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}
        >
          {secondsRemaining}
        </Box>{' '}
        วินาที
      </Alert>
    </Snackbar>
  );
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
  return <AutoRetrySnackbar open={hasQueryError} />;
}
