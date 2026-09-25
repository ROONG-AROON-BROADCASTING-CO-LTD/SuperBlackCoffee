import { useEffect, useMemo, useState } from 'react';
import { ActionSnackbar, SbcThemeProvider } from '@stackbuild/ui';
import { ApiRequestError } from './api/client';
import {
  adjustInventory,
  consumeStockFromMenus,
  createStockRequest,
  createExpenseRequest,
  listInventory,
  listMenuItems,
  listMyStockMovements,
  isStockSession,
  loginStock,
  logoutStock,
  restoreStockSession,
  setupStockPIN,
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
  sales: '/sales',
  count: '/count',
  history: '/history',
  promotions: '/promotions',
};
const pageFromPath = (pathname: string): StockPage =>
  pathname.replace(/\/+$/, '') === '/sales'
    ? 'sales'
    : pathname.replace(/\/+$/, '') === '/count'
      ? 'count'
      : pathname.replace(/\/+$/, '') === '/history'
        ? 'history'
        : ['/promotions', '/order'].includes(pathname.replace(/\/+$/, ''))
          ? 'promotions'
          : 'sales';

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
  const [cartItemCount, setCartItemCount] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartMode, setCartMode] = useState<'consume' | 'order'>('consume');
  const [pendingOrderItem, setPendingOrderItem] =
    useState<InventoryItem | null>(null);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [connectionError, setConnectionError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const title = useMemo(
    () =>
      page === 'history'
        ? 'ประวัติที่บันทึก'
        : (stockNavigation.find((item) => item.page === page)?.label ??
          stockNavigation[0].label),
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

  const closeCart = () => setCartOpen(false);
  const navigate = (next: StockPage) => {
    if (cartOpen && next !== page) closeCart();
    if (window.location.pathname !== paths[next])
      window.history.pushState(null, '', paths[next]);
    setPage(next);
  };
  const startSession = (nextSession: StockSession) => {
    setInitialDataLoading(true);
    setSession(nextSession);
    navigate('sales');
  };
  const startLogin = async (username: string): Promise<'pin' | 'setup-pin'> => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const result = await loginStock(username);
      if ('requiresPINSetup' in result) return 'setup-pin';
      if ('requiresPIN' in result) return 'pin';
      if (isStockSession(result)) startSession(result);
      return 'pin';
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'ไม่สามารถเข้าสู่ระบบได้',
      );
      throw error;
    } finally {
      setLoginLoading(false);
    }
  };
  const loginWithPIN = async (username: string, pin: string) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const result = await loginStock(username, pin);
      if (isStockSession(result)) startSession(result);
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'ไม่สามารถเข้าสู่ระบบได้',
      );
      throw error;
    } finally {
      setLoginLoading(false);
    }
  };
  const createPIN = async (username: string, pin: string) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      startSession(await setupStockPIN(username, pin));
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'ไม่สามารถตั้ง PIN ได้',
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
    setCartItemCount(0);
    setCartMode('consume');
    setPendingOrderItem(null);
    setInitialDataLoading(false);
    setConnectionError(false);
    window.history.replaceState(null, '', paths.sales);
    setPage('sales');
  };
  const toggleCart = () => setCartOpen((open) => !open);
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
    items: Array<{
      menuItemId: number;
      quantity: number;
      channel?: 'storefront' | 'lineman';
    }>,
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
    setNotice(
      `ตัดวัตถุดิบและบันทึกยอดขาย ${(result.salesTotal ?? 0).toLocaleString('th-TH')} บาท จาก ${result.menuCount} เมนูแล้ว`,
    );
  };
  const refreshMenus = async () => {
    const nextMenus = await listMenuItems();
    setMenus(nextMenus);
    return nextMenus;
  };
  const handleCreateStockRequest = async (
    items: Array<{
      inventoryItemId: number;
      name: string;
      quantity: number;
      unit: string;
    }>,
    note: string,
  ) => {
    await createStockRequest({ items, note });
    setNotice('ส่งคำสั่งซื้อสินค้าแล้ว');
  };
  const handleCreateExpenseRequest = async (data: {
    title: string;
    category: 'maintenance' | 'office' | 'transport' | 'service' | 'other';
    estimatedAmount: number;
    note: string;
  }) => {
    await createExpenseRequest(data);
    setNotice('ส่งคำขอเบิกค่าใช้จ่ายภายนอกแล้ว');
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
          cartItemCount={cartItemCount}
          cartOpen={cartOpen}
          onToggleCart={toggleCart}
          name={session.user.name}
          branchName={session.user.branchName}
        >
          <StockPageRouter
            page={page}
            ingredients={ingredients}
            drinkStock={drinkStock}
            postalStock={postalStock}
            menus={menus}
            onRefreshMenus={refreshMenus}
            movements={movements}
            isInitialLoading={initialDataLoading}
            onAdjust={handleAdjust}
            onConsume={handleConsume}
            cartOpen={cartOpen}
            onCartOpenChange={setCartOpen}
            onCartItemCountChange={setCartItemCount}
            cartMode={cartMode}
            onCartModeChange={setCartMode}
            isFranchise={session.user.isFranchise}
            branchName={session.user.branchName}
            onCreateStockRequest={handleCreateStockRequest}
            onCreateExpenseRequest={handleCreateExpenseRequest}
            onOpenHistory={() => navigate('history')}
            onOrderIngredients={(item) => {
              setPendingOrderItem(item);
              setCartMode('order');
            }}
            pendingOrderItem={pendingOrderItem}
            onPendingOrderItemAdded={() => setPendingOrderItem(null)}
          />
          <ActionSnackbar
            notice={notice ? { message: notice } : null}
            autoHideDuration={4_000}
            onClose={() => setNotice('')}
          />
          <AutoRetrySnackbar open={connectionError} />
        </StockAppLayout>
      ) : (
        <StockLoginPage
          onUsername={startLogin}
          onPIN={loginWithPIN}
          onSetupPIN={createPIN}
          onClearError={() => setLoginError('')}
          error={loginError}
          loading={loginLoading}
        />
      )}
    </SbcThemeProvider>
  );
}
