import { useEffect, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
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
import { StockLoginPage } from './features/auth/StockLoginPage';
import { StockAppLayout } from './layouts/StockAppLayout';
import { StockCountPage } from './pages/StockCountPage';
import { StockHistoryPage } from './pages/StockHistoryPage';
import type { StockMovement } from './api/stock';
import { StockOverviewPage } from './pages/StockOverviewPage';
import { MenuConsumptionPage } from './pages/MenuConsumptionPage';
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

export default function App() {
  const [session, setSession] = useState<StockSession | null>(null);
  const [page, setPage] = useState<StockPage>(() =>
    pageFromPath(window.location.pathname),
  );
  const [ingredients, setIngredients] = useState<InventoryItem[]>([]);
  const [drinkStock, setDrinkStock] = useState<InventoryItem[]>([]);
  const [postalStock, setPostalStock] = useState<InventoryItem[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const refreshInventory = async () => {
    const [nextIngredients, nextDrink, nextPostal] = await Promise.all([
      listInventory('ingredient'),
      listInventory('stock', 'drink_equipment'),
      listInventory('stock', 'postal_equipment'),
    ]);
    setIngredients(nextIngredients);
    setDrinkStock(nextDrink);
    setPostalStock(nextPostal);
  };

  useEffect(() => {
    let active = true;
    void restoreStockSession()
      .then((next) => {
        if (active) setSession(next);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    setLoading(true);
    void Promise.all([
      refreshInventory(),
      listMyStockMovements(),
      listMenuItems(),
    ])
      .then(([, nextMovements, nextMenus]) => {
        setMovements(nextMovements);
        setMenus(nextMenus);
      })
      .catch((error) => {
        setNotice(
          error instanceof Error ? error.message : 'ไม่สามารถโหลดสต๊อกได้',
        );
      })
      .finally(() => setLoading(false));
  }, [session]);
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
  const submitLogin = async (username: string, pin: string) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      setSession(await loginStock(username, pin));
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'ไม่สามารถเข้าสู่ระบบได้',
      );
    } finally {
      setLoginLoading(false);
    }
  };
  const signOut = async () => {
    await logoutStock().catch(() => undefined);
    setSession(null);
    setIngredients([]);
    setDrinkStock([]);
    setPostalStock([]);
    setMenus([]);
    setMovements([]);
  };
  const handleAdjust = async (
    item: InventoryItem,
    quantity: number,
    note: string,
  ) => {
    const result = await adjustInventory(item.id, quantity, note);
    const [_, nextMovements] = await Promise.all([
      refreshInventory(),
      listMyStockMovements(),
    ]);
    setMovements(nextMovements);
    setNotice(
      `บันทึก ${item.name} คงเหลือ ${result.quantity} ${item.unit} แล้ว`,
    );
  };
  const handleConsume = async (
    items: Array<{ menuItemId: number; quantity: number }>,
    note: string,
  ) => {
    const result = await consumeStockFromMenus(items, note);
    const [, nextMovements, nextMenus] = await Promise.all([
      refreshInventory(),
      listMyStockMovements(),
      listMenuItems(),
    ]);
    setMovements(nextMovements);
    setMenus(nextMenus);
    setNotice(`ตัดวัตถุดิบจาก ${result.menuCount} เมนูเรียบร้อยแล้ว`);
  };
  const content = useMemo(
    () =>
      page === 'sales' ? (
        <MenuConsumptionPage
          menus={menus}
          loading={loading}
          onConsume={handleConsume}
        />
      ) : page === 'count' ? (
        <StockCountPage
          ingredients={ingredients}
          drinkStock={drinkStock}
          postalStock={postalStock}
          loading={loading}
          onAdjust={handleAdjust}
        />
      ) : page === 'history' ? (
        <StockHistoryPage movements={movements} />
      ) : (
        <StockOverviewPage
          ingredients={ingredients}
          drinkStock={drinkStock}
          postalStock={postalStock}
        />
      ),
    [page, ingredients, drinkStock, postalStock, loading, movements, menus],
  );

  if (loading && !session) return null;
  if (!session)
    return (
      <StockLoginPage
        onLogin={submitLogin}
        error={loginError}
        loading={loginLoading}
      />
    );
  return (
    <>
      <StockAppLayout
        page={page}
        onPage={navigate}
        onLogout={() => void signOut()}
        name={session.user.name}
        branchName={session.user.branchName}
      >
        {content}
      </StockAppLayout>
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3600}
        onClose={() => setNotice('')}
      >
        <Alert severity="success" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      </Snackbar>
    </>
  );
}
