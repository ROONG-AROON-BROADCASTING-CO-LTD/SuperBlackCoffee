import { useEffect, useMemo, useState } from 'react';
import { Alert, Snackbar, useMediaQuery } from '@mui/material';
import { CircleCheckIcon, SbcThemeProvider } from '@stackbuild/ui';
import { ApiRequestError } from './api/client';
import {
  adjustInventory,
  consumeStockFromMenus,
  listInventory,
  listMenuItems,
  listMyStockMovements,
  loginStock,
  logoutStock,
  restoreStockSession,
  type InventoryItem,
  type MenuItem,
  type StockSession,
} from './api/stock';
import { stockNavigation } from './components/StockNavigation';
import { AutoRetrySnackbar } from './components/AutoRetrySnackbar';
import { StockLoginPage } from './features/auth/StockLoginPage';
import { StockAppLayout } from './layouts/StockAppLayout';
import { StockPageRouter } from './routes/StockPageRouter';
import type { StockMovement } from './api/stock';
import type { StockPage } from './types/stock';

const paths: Record<StockPage, string> = {
  overview: '/',
  sales: '/sales',
  count: '/count',
  history: '/history',
};
const pageFromPath = (pathname: string): StockPage =>
  pathname.replace(/\/+$/, '') === '/sales'
    ? 'sales'
    : pathname.replace(/\/+$/, '') === '/count'
      ? 'count'
      : pathname.replace(/\/+$/, '') === '/history'
        ? 'history'
        : 'overview';

function isInvalidStockSession(error: unknown) {
  return (
    error instanceof ApiRequestError &&
    (error.status === 401 || error.status === 403)
  );
}

export default function App() {
  const [session, setSession] = useState<StockSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [initialDataLoading, setInitialDataLoading] = useState(false);
  const [page, setPage] = useState<StockPage>(() =>
    pageFromPath(window.location.pathname),
  );
  const [ingredients, setIngredients] = useState<InventoryItem[]>([]);
  const [drinkStock, setDrinkStock] = useState<InventoryItem[]>([]);
  const [postalStock, setPostalStock] = useState<InventoryItem[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [connectionError, setConnectionError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const isTabletOrSmaller = useMediaQuery('(max-width:899.95px)');
  const title = useMemo(
    () =>
      stockNavigation.find((item) => item.page === page)?.label ??
      stockNavigation[0].label,
    [page],
  );

  const getInventory = async () => {
    const [nextIngredients, nextDrink, nextPostal] = await Promise.all([
      listInventory('ingredient'),
      listInventory('stock', 'drink_equipment'),
      listInventory('stock', 'postal_equipment'),
    ]);
    return {
      ingredients: nextIngredients,
      drinkStock: nextDrink,
      postalStock: nextPostal,
    };
  };

  const setInventory = ({
    ingredients: nextIngredients,
    drinkStock: nextDrink,
    postalStock: nextPostal,
  }: Awaited<ReturnType<typeof getInventory>>) => {
    setIngredients(nextIngredients);
    setDrinkStock(nextDrink);
    setPostalStock(nextPostal);
  };

  useEffect(() => {
    let active = true;
    void restoreStockSession()
      .then((next) => {
        if (!active) return;
        setInitialDataLoading(true);
        setSession(next);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    let active = true;
    setInitialDataLoading(true);
    void Promise.all([getInventory(), listMyStockMovements(), listMenuItems()])
      .then(([nextInventory, nextMovements, nextMenus]) => {
        if (!active) return;
        setInventory(nextInventory);
        setMovements(nextMovements);
        setMenus(nextMenus);
        setConnectionError(false);
      })
      .catch((error) => {
        if (!active) return;
        if (isInvalidStockSession(error)) {
          setSession(null);
          setIngredients([]);
          setDrinkStock([]);
          setPostalStock([]);
          setMenus([]);
          setMovements([]);
          return;
        }
        setConnectionError(true);
      })
      .finally(() => {
        if (active) setInitialDataLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retryTick, session]);
  useEffect(() => {
    if (!session || !connectionError) return;
    const retry = () => setRetryTick((tick) => tick + 1);
    const interval = window.setInterval(retry, 10_000);
    window.addEventListener('online', retry);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', retry);
    };
  }, [connectionError, session]);
  useEffect(() => {
    const listener = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener('popstate', listener);
    return () => window.removeEventListener('popstate', listener);
  }, []);

  const navigate = (next: StockPage) => {
    if (window.location.pathname !== paths[next])
      window.history.pushState(null, '', paths[next]);
    setPage(next);
  };
  const startSession = (nextSession: StockSession) => {
    setInitialDataLoading(true);
    setSession(nextSession);
    navigate('sales');
  };
  const submitLogin = async (username: string, pin: string) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      startSession(await loginStock(username, pin));
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'ไม่สามารถเข้าสู่ระบบได้',
      );
      throw error;
    } finally {
      setLoginLoading(false);
    }
  };
  const signOut = () => {
    void logoutStock();
    setSession(null);
    setIngredients([]);
    setDrinkStock([]);
    setPostalStock([]);
    setMenus([]);
    setMovements([]);
    setInitialDataLoading(false);
    setConnectionError(false);
    window.history.replaceState(null, '', paths.overview);
    setPage('overview');
  };
  const handleAdjust = async (
    item: InventoryItem,
    quantity: number,
    note: string,
  ) => {
    const result = await adjustInventory(item.id, quantity, note);
    const [nextInventory, nextMovements] = await Promise.all([
      getInventory(),
      listMyStockMovements(),
    ]);
    setInventory(nextInventory);
    setMovements(nextMovements);
    setNotice(
      `บันทึก ${item.name} คงเหลือ ${result.quantity} ${item.unit} แล้ว`,
    );
  };
  const handleConsume = async (
    items: Array<{ menuItemId: number; quantity: number }>,
    note: string,
    channel: 'storefront' | 'lineman',
  ) => {
    const result = await consumeStockFromMenus(items, note, channel);
    const [nextInventory, nextMovements, nextMenus] = await Promise.all([
      getInventory(),
      listMyStockMovements(),
      listMenuItems(),
    ]);
    setInventory(nextInventory);
    setMovements(nextMovements);
    setMenus(nextMenus);
    setNotice(`ตัดวัตถุดิบจาก ${result.menuCount} เมนูเรียบร้อยแล้ว`);
  };
  if (checkingSession) return null;

  return (
    <SbcThemeProvider
      secondary="#805637"
      background="#fbfaf8"
      borderRadius={15}
    >
      {session ? (
        <StockAppLayout
          page={page}
          title={title}
          onPage={navigate}
          onLogout={signOut}
          name={session.user.name}
          branchName={session.user.branchName}
        >
          <StockPageRouter
            page={page}
            ingredients={ingredients}
            drinkStock={drinkStock}
            postalStock={postalStock}
            menus={menus}
            movements={movements}
            isInitialLoading={initialDataLoading}
            onAdjust={handleAdjust}
            onConsume={handleConsume}
          />
          {notice ? (
            <Snackbar
              open
              autoHideDuration={4_000}
              onClose={(_event, reason) => {
                if (reason !== 'clickaway') setNotice('');
              }}
              anchorOrigin={{
                vertical: isTabletOrSmaller ? 'top' : 'bottom',
                horizontal: 'center',
              }}
              sx={
                isTabletOrSmaller
                  ? { top: 'calc(72px + env(safe-area-inset-top) + 12px)' }
                  : { mb: 2 }
              }
            >
              <Alert
                severity="success"
                variant="filled"
                icon={<CircleCheckIcon animate={Boolean(notice)} />}
                sx={{ fontFamily: 'Kanit, sans-serif', fontWeight: 500 }}
              >
                {notice}
              </Alert>
            </Snackbar>
          ) : null}
          <AutoRetrySnackbar open={connectionError} />
        </StockAppLayout>
      ) : (
        <StockLoginPage
          onLogin={submitLogin}
          onClearError={() => setLoginError('')}
          error={loginError}
          loading={loginLoading}
        />
      )}
    </SbcThemeProvider>
  );
}
