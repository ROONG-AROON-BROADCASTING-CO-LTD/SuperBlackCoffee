import {
  type FormEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Drawer,
  Divider,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  ActionSnackbar,
  DashboardMain,
  EditItemButton,
  ItemActionButtons,
  CartIcon,
  DateField,
  FilterPill,
  INGREDIENT_STATUS_BADGES,
  INVENTORY_UNIT_OPTIONS,
  inventoryUnitSelectSlotProps,
  PlusIcon,
  normalizeInventoryUnit,
  PageIntro,
  SearchField,
  XIcon,
  useMinimumLoading,
  type IngredientStatus,
  type CartIconHandle,
  type PlusIconHandle,
  type XIconHandle,
} from '@stackbuild/ui';
import {
  branchCodeByBranch,
  branches,
  type BranchCodeMap,
} from '../components/sidebar/BranchesSidebar';
import { IngredientsSkeleton } from '../components/skeletons/IngredientsSkeleton';
import { DataLoadNotice } from '../components/DataLoadNotice';
import { useAutoRetry } from '../hooks/useAutoRetry';
import {
  createInventory,
  deleteInventory,
  adjustInventory,
  discardFreshInventoryLot,
  listFreshInventoryLots,
  listInventory,
  receiveFreshInventoryLot,
  updateInventory,
  type FreshInventoryLot,
  type InventoryInput,
} from '../api/inventory';
import { createStockRequest } from '../api/stock-requests';

type Ingredient = {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  unitCost: number;
  trackStock: boolean;
  status: IngredientStatus;
  imageUrl: string;
  expiryDate: string | null;
  expiryStatus: 'none' | 'expiring_soon' | 'expired';
};
type IngredientCartItem = Ingredient & { key: string; quantityToOrder: number };
type InventoryBranch = string;
type FreshLotTarget = { ingredient: Ingredient; branch: InventoryBranch };

const filters = [
  'ทั้งหมด',
  'วัตถุดิบใกล้หมด',
  'วัตถุดิบหมด',
  'วัตถุดิบค้างสต๊อก',
  'ใกล้หมดอายุ',
  'หมดอายุ',
] as const;
type IngredientFilter = (typeof filters)[number];

const expiryBadge = {
  expiring_soon: {
    label: 'ใกล้หมดอายุ',
    color: '#9a5a10',
    background: '#fff0d8',
  },
  expired: { label: 'หมดอายุแล้ว', color: '#b42318', background: '#fde8e7' },
} as const;

function formatExpiryDate(expiryDate: string | null) {
  if (!expiryDate) return null;
  const parsed = new Date(
    expiryDate.length === 10 ? `${expiryDate}T00:00:00Z` : expiryDate,
  );
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function inputDateValue(expiryDate: string | null) {
  return expiryDate?.slice(0, 10) ?? '';
}

export function IngredientsManagementPage({
  activeBranch,
  franchisePlan,
  readOnly = false,
  allowEditing = false,
  cardColumns = 4,
  allowOrdering = false,
  onRequestCreated,
  branchOptions = branches,
  branchCodes = branchCodeByBranch,
  ingredientScope = 'regular',
}: {
  activeBranch: string;
  franchisePlan?: 'S' | 'M' | 'L';
  readOnly?: boolean;
  allowEditing?: boolean;
  cardColumns?: 4 | 5;
  allowOrdering?: boolean;
  onRequestCreated?: () => void;
  branchOptions?: readonly string[];
  branchCodes?: BranchCodeMap;
  ingredientScope?: 'regular' | 'fresh';
}) {
  const isFreshIngredientsPage = ingredientScope === 'fresh';
  const plusIconRef = useRef<PlusIconHandle>(null);
  const closeIconRef = useRef<XIconHandle>(null);
  const cartCloseIconRef = useRef<XIconHandle>(null);
  const cartIconRef = useRef<CartIconHandle>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState<IngredientFilter>('ทั้งหมด');
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null,
  );
  const [editingBranch, setEditingBranch] = useState<InventoryBranch | null>(
    null,
  );
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [catalogIngredientsByBranch, setCatalogIngredientsByBranch] = useState<
    Record<string, Ingredient[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const showSkeleton = useMinimumLoading(isLoading);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteTargetKey, setDeleteTargetKey] = useState<string | null>(null);
  const [discardTargetKey, setDiscardTargetKey] = useState<string | null>(null);
  const [freshLotTarget, setFreshLotTarget] = useState<FreshLotTarget | null>(
    null,
  );
  const [freshLots, setFreshLots] = useState<FreshInventoryLot[]>([]);
  const [isFreshLotsLoading, setIsFreshLotsLoading] = useState(false);
  const [freshLotDiscardID, setFreshLotDiscardID] = useState<number | null>(
    null,
  );
  const [inventoryNotice, setInventoryNotice] = useState<{
    severity: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isSavingInventory, setIsSavingInventory] = useState(false);
  useAutoRetry(loadError, () => setReloadKey((key) => key + 1));
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<IngredientCartItem[]>([]);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isCartSuccessVisible, setIsCartSuccessVisible] = useState(false);
  const queryClient = useQueryClient();
  const createRequest = useMutation({
    mutationFn: createStockRequest,
    onSuccess: () => {
      setCartItems([]);
      setCartError(null);
      setCartOpen(false);
      setIsCartSuccessVisible(true);
      void queryClient.invalidateQueries({
        queryKey: ['franchise-stock-requests'],
      });
    },
    onError: (error) =>
      setCartError(
        error instanceof Error ? error.message : 'ส่งคำขอวัตถุดิบไม่สำเร็จ',
      ),
  });
  const [visibleBranchNames, setVisibleBranchNames] = useState<Set<string>>(
    () => new Set(),
  );
  const [loadedBranchNames, setLoadedBranchNames] = useState<Set<string>>(
    () => new Set(),
  );
  const branchSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const availableBranchNames = useMemo(
    () => branchOptions.filter((branch) => branch !== 'ทุกสาขา'),
    [branchOptions],
  );
  const matchesIngredientFilter = (
    ingredient: Ingredient,
    selectedFilter: IngredientFilter,
  ) => {
    if (!ingredient.trackStock) return selectedFilter === 'ทั้งหมด';
    return (
      selectedFilter === 'ทั้งหมด' ||
      ingredient.status === selectedFilter ||
      (selectedFilter === 'ใกล้หมดอายุ' &&
        ingredient.expiryStatus === 'expiring_soon') ||
      (selectedFilter === 'หมดอายุ' && ingredient.expiryStatus === 'expired')
    );
  };
  const filterCounts = useMemo(() => {
    const ingredients = Object.values(catalogIngredientsByBranch).flat();
    return Object.fromEntries(
      filters.map((selectedFilter) => [
        selectedFilter,
        ingredients.filter(
          (ingredient) =>
            (isFreshIngredientsPage
              ? ingredient.category === 'fresh'
              : ingredient.category !== 'fresh') &&
            matchesIngredientFilter(ingredient, selectedFilter),
        ).length,
      ]),
    ) as Record<IngredientFilter, number>;
  }, [catalogIngredientsByBranch, isFreshIngredientsPage]);
  const filterIngredients = (items: Ingredient[]) =>
    items.filter((ingredient) => {
      const matchesQuery = ingredient.name
        .toLowerCase()
        .includes(deferredQuery.trim().toLowerCase());
      return (
        matchesQuery &&
        (isFreshIngredientsPage
          ? ingredient.category === 'fresh'
          : ingredient.category !== 'fresh') &&
        matchesIngredientFilter(ingredient, filter)
      );
    });
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(false);
    const branchNames: InventoryBranch[] =
      activeBranch === 'ทุกสาขา' ? availableBranchNames : [activeBranch];
    void Promise.all(
      branchNames.map(async (branch) => {
        const items = await listInventory('ingredient', branchCodes[branch]);
        return [
          branch,
          items.map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            reorderLevel: item.reorderLevel,
            unitCost: item.unitCost,
            trackStock: item.trackStock !== false,
            status: (item.trackStock === false || item.status === 'cost_only'
              ? 'คิดต้นทุนเท่านั้น'
              : item.status === 'out'
                ? 'วัตถุดิบหมด'
                : item.status === 'low'
                  ? 'วัตถุดิบใกล้หมด'
                  : item.status === 'stale'
                    ? 'วัตถุดิบค้างสต๊อก'
                    : 'พร้อมใช้') as IngredientStatus,
            imageUrl: item.imageUrl,
            expiryDate: item.expiryDate ?? null,
            expiryStatus: item.expiryStatus ?? 'none',
          })),
        ] as const;
      }),
    )
      .then((entries) => {
        if (active)
          setCatalogIngredientsByBranch(
            Object.fromEntries(entries) as Record<string, Ingredient[]>,
          );
      })
      .catch(() => {
        if (active) {
          setCatalogIngredientsByBranch({});
          setLoadError(true);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeBranch, availableBranchNames, branchCodes, reloadKey]);
  useEffect(() => {
    if (activeBranch !== 'ทุกสาขา') {
      setVisibleBranchNames(new Set([activeBranch]));
      setLoadedBranchNames(new Set([activeBranch]));
      return undefined;
    }
    setVisibleBranchNames(new Set());
    setLoadedBranchNames(new Set());
    const timers = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const branch = entry.target.getAttribute('data-branch');
          if (!branch) return;
          setVisibleBranchNames((names) =>
            names.has(branch) ? names : new Set(names).add(branch),
          );
          if (!timers.has(branch))
            timers.set(
              branch,
              window.setTimeout(
                () =>
                  setLoadedBranchNames((names) =>
                    names.has(branch) ? names : new Set(names).add(branch),
                  ),
                branch === availableBranchNames[0] ? 360 : 220,
              ),
            );
        });
      },
      { rootMargin: '0px' },
    );
    Object.values(branchSectionRefs.current).forEach(
      (section) => section && observer.observe(section),
    );
    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activeBranch, availableBranchNames]);
  const displayedBranches =
    activeBranch === 'ทุกสาขา' ? availableBranchNames : [activeBranch];
  const ingredientLabel = isFreshIngredientsPage ? 'วัตถุดิบของสด' : 'วัตถุดิบ';
  const drawerTitle = editingIngredient
    ? `แก้ไข${ingredientLabel}`
    : `เพิ่ม${ingredientLabel}`;
  const isLimitedEdit = readOnly && allowEditing && editingIngredient !== null;
  const cartQuantity = cartItems.reduce(
    (total, item) => total + item.quantityToOrder,
    0,
  );
  const addToCart = (ingredient: Ingredient, key: string) => {
    setCartError(null);
    setCartItems((items) => {
      const existing = items.find((item) => item.key === key);
      if (existing)
        return items.map((item) =>
          item.key === key
            ? { ...item, quantityToOrder: item.quantityToOrder + 1 }
            : item,
        );
      return [...items, { ...ingredient, key, quantityToOrder: 1 }];
    });
    requestAnimationFrame(() => {
      cartIconRef.current?.startAnimation();
    });
  };
  const updateCartQuantity = (key: string, quantityToOrder: number) =>
    setCartItems((items) =>
      quantityToOrder < 1
        ? items.filter((item) => item.key !== key)
        : items.map((item) =>
            item.key === key ? { ...item, quantityToOrder } : item,
          ),
    );

  const saveIngredient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const branch =
      editingBranch ??
      (activeBranch === 'ทุกสาขา'
        ? (String(formData.get('branch')) as InventoryBranch)
        : activeBranch);
    const expiryDate = String(formData.get('expiryDate') ?? '').trim();
    const trackStockValue = String(formData.get('trackStock') ?? '');
    const data: InventoryInput = {
      name: isLimitedEdit
        ? (editingIngredient?.name ?? '')
        : String(formData.get('name') ?? '').trim(),
      category: isFreshIngredientsPage
        ? 'fresh'
        : isLimitedEdit
          ? (editingIngredient?.category ?? 'other')
          : String(formData.get('category') ?? 'other'),
      kind: 'ingredient',
      quantity: Number(formData.get('quantity') ?? 0),
      unit: isLimitedEdit
        ? (editingIngredient?.unit ?? '')
        : String(formData.get('unit') ?? ''),
      reorderLevel: Number(formData.get('reorderLevel') ?? 0),
      unitCost: isLimitedEdit
        ? (editingIngredient?.unitCost ?? 0)
        : Number(formData.get('unitCost') ?? 0),
      trackStock: isFreshIngredientsPage
        ? true
        : isLimitedEdit
          ? editingIngredient?.trackStock
          : trackStockValue === ''
            ? undefined
            : trackStockValue === 'true',
      imageUrl: isLimitedEdit
        ? (editingIngredient?.imageUrl ?? '')
        : (imagePreviewUrl ?? editingIngredient?.imageUrl ?? ''),
      expiryDate: expiryDate || null,
    };
    if (!data.name || !data.unit || Number.isNaN(data.quantity)) return;
    setIsSavingInventory(true);
    try {
      if (editingIngredient) {
        await updateInventory(editingIngredient.id, data, branchCodes[branch]);
      } else {
        await createInventory(data, branchCodes[branch]);
      }
      setIsAddDrawerOpen(false);
      setEditingIngredient(null);
      setEditingBranch(null);
      setImagePreviewUrl(null);
      setReloadKey((key) => key + 1);
      setInventoryNotice({
        severity: 'success',
        message: editingIngredient ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มวัตถุดิบแล้ว',
      });
    } catch (error) {
      setInventoryNotice({
        severity: 'error',
        message:
          error instanceof Error ? error.message : 'บันทึกวัตถุดิบไม่สำเร็จ',
      });
    } finally {
      setIsSavingInventory(false);
    }
  };

  const removeIngredient = async (
    ingredient: Ingredient,
    branch: InventoryBranch,
  ) => {
    setDeleteTargetKey(null);
    setIsSavingInventory(true);
    try {
      await deleteInventory(ingredient.id, branchCodes[branch]);
      setReloadKey((key) => key + 1);
      setInventoryNotice({ severity: 'success', message: 'ลบวัตถุดิบแล้ว' });
    } catch (error) {
      setInventoryNotice({
        severity: 'error',
        message: error instanceof Error ? error.message : 'ลบวัตถุดิบไม่สำเร็จ',
      });
    } finally {
      setIsSavingInventory(false);
    }
  };

  const discardExpiredIngredient = async (
    ingredient: Ingredient,
    branch: InventoryBranch,
  ) => {
    setDiscardTargetKey(null);
    setIsSavingInventory(true);
    try {
      await adjustInventory(
        ingredient.id,
        0,
        'ตัดทิ้งวัตถุดิบหมดอายุ',
        branchCodes[branch],
      );
      setReloadKey((key) => key + 1);
      setInventoryNotice({
        severity: 'success',
        message: 'ตัดทิ้งวัตถุดิบหมดอายุและบันทึกประวัติแล้ว',
      });
    } catch (error) {
      setInventoryNotice({
        severity: 'error',
        message:
          error instanceof Error ? error.message : 'ตัดทิ้งวัตถุดิบไม่สำเร็จ',
      });
    } finally {
      setIsSavingInventory(false);
    }
  };

  const loadFreshLots = async (target: FreshLotTarget) => {
    setIsFreshLotsLoading(true);
    try {
      setFreshLots(
        await listFreshInventoryLots(
          target.ingredient.id,
          branchCodes[target.branch],
        ),
      );
    } catch (error) {
      setInventoryNotice({
        severity: 'error',
        message:
          error instanceof Error ? error.message : 'โหลดล็อตของสดไม่สำเร็จ',
      });
    } finally {
      setIsFreshLotsLoading(false);
    }
  };

  const openFreshLots = (ingredient: Ingredient, branch: InventoryBranch) => {
    const target = { ingredient, branch };
    setFreshLotTarget(target);
    setFreshLots([]);
    setFreshLotDiscardID(null);
    void loadFreshLots(target);
  };

  const receiveFreshLot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!freshLotTarget) return;
    const formData = new FormData(event.currentTarget);
    const receivedAt = String(formData.get('receivedAt') ?? '');
    const expiryDate = String(formData.get('expiryDate') ?? '');
    if (!receivedAt || !expiryDate || expiryDate < receivedAt) {
      setInventoryNotice({
        severity: 'error',
        message: 'กรุณาระบุวันรับเข้าและวันหมดอายุให้ถูกต้อง',
      });
      return;
    }
    setIsSavingInventory(true);
    try {
      await receiveFreshInventoryLot(
        freshLotTarget.ingredient.id,
        {
          lotNumber: String(formData.get('lotNumber') ?? '').trim(),
          receivedAt,
          expiryDate,
          quantity: Number(formData.get('quantity') ?? 0),
          unitCost: Number(formData.get('unitCost') ?? 0),
          note: String(formData.get('note') ?? '').trim(),
        },
        branchCodes[freshLotTarget.branch],
      );
      event.currentTarget.reset();
      await loadFreshLots(freshLotTarget);
      setReloadKey((key) => key + 1);
      setInventoryNotice({ severity: 'success', message: 'รับล็อตของสดแล้ว' });
    } catch (error) {
      setInventoryNotice({
        severity: 'error',
        message:
          error instanceof Error ? error.message : 'รับล็อตของสดไม่สำเร็จ',
      });
    } finally {
      setIsSavingInventory(false);
    }
  };

  const discardFreshLot = async (lot: FreshInventoryLot) => {
    if (!freshLotTarget) return;
    setIsSavingInventory(true);
    try {
      await discardFreshInventoryLot(
        lot.id,
        lot.quantityRemaining,
        'ตัดทิ้งล็อตของสด',
        branchCodes[freshLotTarget.branch],
      );
      setFreshLotDiscardID(null);
      await loadFreshLots(freshLotTarget);
      setReloadKey((key) => key + 1);
      setInventoryNotice({
        severity: 'success',
        message: 'ตัดทิ้งล็อตของสดแล้ว',
      });
    } catch (error) {
      setInventoryNotice({
        severity: 'error',
        message:
          error instanceof Error ? error.message : 'ตัดทิ้งล็อตของสดไม่สำเร็จ',
      });
    } finally {
      setIsSavingInventory(false);
    }
  };

  return (
    <DashboardMain>
      <PageIntro
        title={ingredientLabel}
        description={
          readOnly
            ? allowEditing
              ? `ตรวจสอบและแก้ไข${ingredientLabel}ของสาขา`
              : `ตรวจสอบ${ingredientLabel}ของสาขา`
            : franchisePlan
              ? `ตรวจสอบและจัดการ${ingredientLabel}ของสาขาแฟรนไชส์`
              : `ตรวจสอบและจัดการ${ingredientLabel}ของสาขา SBC`
        }
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: { xs: 'stretch', lg: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            width: readOnly ? '100%' : { xs: '100%', lg: 'auto' },
            alignItems: 'center',
            gap: 1,
          }}
        >
          <SearchField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`ค้นหา${ingredientLabel}`}
            size="small"
            name="ingredient-search"
            autoComplete="off"
            sx={{ flex: { xs: 1, lg: '0 1 auto' }, width: { lg: 310 } }}
          />
          {allowOrdering ? (
            <Button
              aria-label="ตะกร้าวัตถุดิบ"
              onClick={() => setCartOpen(true)}
              onMouseEnter={() => cartIconRef.current?.startAnimation()}
              onMouseLeave={() => cartIconRef.current?.stopAnimation()}
              sx={{
                minWidth: 'fit-content',
                minHeight: 40,
                ml: { lg: 'auto' },
                px: 1.25,
                position: 'relative',
                borderRadius: '12px',
                color: '#fff',
                bgcolor: '#805637',
                '&:hover': { bgcolor: '#60412a' },
              }}
            >
              {cartQuantity > 0 ? (
                <Box
                  component="span"
                  aria-label={`${cartQuantity} รายการในตะกร้า`}
                  sx={{
                    position: 'absolute',
                    top: -7,
                    right: -7,
                    display: 'grid',
                    placeItems: 'center',
                    minWidth: 23,
                    height: 23,
                    px: 0.75,
                    borderRadius: 99,
                    bgcolor: '#d92d28',
                    color: '#fff',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 11.5,
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  {cartQuantity}
                </Box>
              ) : null}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  lineHeight: 0,
                }}
              >
                <CartIcon
                  ref={cartIconRef}
                  size={20}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    lineHeight: 0,
                  }}
                />
              </Box>
              <Box component="span" sx={{ ml: 0.75 }}>
                ตะกร้าสั่งวัตถุดิบ
              </Box>
            </Button>
          ) : null}
        </Box>
        {!readOnly ? (
          <Button
            variant="contained"
            startIcon={<PlusIcon ref={plusIconRef} size={16} />}
            onClick={() => {
              setEditingIngredient(null);
              setImagePreviewUrl(null);
              setEditingBranch(
                activeBranch === 'ทุกสาขา'
                  ? availableBranchNames[0]
                  : activeBranch,
              );
              setIsAddDrawerOpen(true);
            }}
            onMouseEnter={() => plusIconRef.current?.startAnimation()}
            onMouseLeave={() => plusIconRef.current?.stopAnimation()}
            sx={{
              minHeight: 40,
              borderRadius: '12px',
              bgcolor: '#201914',
              fontFamily: 'Kanit, sans-serif',
              fontWeight: 500,
              boxShadow: 'none',
              '& .MuiButton-startIcon': { ml: 0.5, mr: 0.75 },
              '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
            }}
          >
            เพิ่ม{ingredientLabel}
          </Button>
        ) : null}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {filters.map((item) => (
          <FilterPill
            key={item}
            onClick={() => setFilter(item)}
            selected={filter === item}
            count={item === 'ทั้งหมด' ? undefined : filterCounts[item]}
            aria-label={`${item} ${filterCounts[item]} รายการ`}
          >
            {item}
          </FilterPill>
        ))}
      </Box>
      {loadError ? <DataLoadNotice /> : null}
      <Box sx={{ display: loadError ? 'none' : 'grid', gap: 4 }}>
        {displayedBranches.map((branch, index) => {
          const filteredIngredients = filterIngredients(
            catalogIngredientsByBranch[branch] ?? [],
          );
          const isBranchVisible =
            activeBranch !== 'ทุกสาขา' ||
            index === 0 ||
            visibleBranchNames.has(branch);
          const isBranchLoaded =
            activeBranch !== 'ทุกสาขา' || loadedBranchNames.has(branch);
          return (
            <Box
              key={branch}
              ref={(section: HTMLDivElement | null) => {
                branchSectionRefs.current[branch] = section;
              }}
              data-branch={branch}
              sx={
                index === 0
                  ? undefined
                  : {
                      position: 'relative',
                      pt: 4,
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-40px',
                        right: '-40px',
                        borderTop: '1px solid #e8ddd5',
                      },
                    }
              }
            >
              {activeBranch === 'ทุกสาขา' && (
                <Typography
                  sx={{
                    mb: 1.5,
                    color: '#3c2d24',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 19,
                    fontWeight: 600,
                  }}
                >
                  สาขา {branch}
                </Typography>
              )}
              {!isBranchVisible ? (
                <Box sx={{ minHeight: 420 }} />
              ) : showSkeleton || !isBranchLoaded ? (
                <IngredientsSkeleton
                  readOnly={readOnly}
                  allowOrdering={allowOrdering}
                  cardColumns={cardColumns}
                />
              ) : (
                <>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, minmax(0, 1fr))',
                        md: `repeat(${cardColumns}, minmax(0, 1fr))`,
                      },
                      gap: '16px',
                    }}
                  >
                    {filteredIngredients.map((ingredient, ingredientIndex) => {
                      const statusBadge =
                        INGREDIENT_STATUS_BADGES[ingredient.status];
                      const ingredientKey = `${branch}-${ingredient.name}`;
                      const hasAvailabilityExpiryWarning =
                        ingredient.trackStock &&
                        ingredient.status === 'พร้อมใช้' &&
                        ingredient.expiryStatus === 'expiring_soon';
                      return (
                        <Card
                          key={ingredientKey}
                          variant="outlined"
                          sx={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            overflow: 'hidden',
                            borderRadius: '15px',
                            borderColor: '#e8ddd5',
                            contentVisibility: {
                              xs: 'visible',
                              xl: ingredientIndex >= 5 ? 'auto' : 'visible',
                            },
                            containIntrinsicSize: {
                              xl: ingredientIndex >= 5 ? 'auto 430px' : 'auto',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              position: 'relative',
                              display: 'flex',
                              justifyContent: 'flex-end',
                              gap: 0.75,
                              aspectRatio: '1 / 1',
                              px: 1.5,
                              pt: 1.5,
                              bgcolor: '#f1e8de',
                              overflow: 'hidden',
                            }}
                          >
                            {ingredient.imageUrl ? (
                              <Box
                                component="img"
                                src={ingredient.imageUrl}
                                alt={`รูป${ingredient.name}`}
                                sx={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : null}
                            {ingredient.category === 'fresh' ? (
                              <Chip
                                label="ของสด"
                                size="small"
                                sx={{
                                  height: 25,
                                  borderRadius: '12px',
                                  bgcolor: '#e5f4e9',
                                  color: '#257142',
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  position: 'relative',
                                  zIndex: 1,
                                }}
                              />
                            ) : null}
                            {ingredient.expiryStatus !== 'expired' ? (
                              <Chip
                                label={
                                  hasAvailabilityExpiryWarning
                                    ? 'มีของ แต่ใกล้หมดอายุ'
                                    : ingredient.status
                                }
                                size="small"
                                sx={{
                                  height: 25,
                                  borderRadius: '12px',
                                  bgcolor: hasAvailabilityExpiryWarning
                                    ? expiryBadge.expiring_soon.background
                                    : statusBadge.main,
                                  color: hasAvailabilityExpiryWarning
                                    ? expiryBadge.expiring_soon.color
                                    : statusBadge.contrastText,
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 11,
                                  fontWeight: 500,
                                  position: 'relative',
                                  zIndex: 1,
                                }}
                              />
                            ) : null}
                            {ingredient.expiryStatus !== 'none' &&
                            !hasAvailabilityExpiryWarning ? (
                              <Chip
                                label={
                                  expiryBadge[ingredient.expiryStatus].label
                                }
                                size="small"
                                sx={{
                                  height: 25,
                                  borderRadius: '12px',
                                  bgcolor:
                                    expiryBadge[ingredient.expiryStatus]
                                      .background,
                                  color:
                                    expiryBadge[ingredient.expiryStatus].color,
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  position: 'relative',
                                  zIndex: 1,
                                }}
                              />
                            ) : null}
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              flex: 1,
                              p: 2.5,
                              pt: 1.25,
                            }}
                          >
                            <Typography
                              sx={{
                                fontFamily: 'Kanit, sans-serif',
                                fontSize: 18,
                                fontWeight: 500,
                              }}
                            >
                              {ingredient.name}
                            </Typography>
                            <Box sx={{ display: 'grid', gap: 0.35, mt: 0.8 }}>
                              {ingredient.trackStock ? (
                                <Typography
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    px: 1,
                                    py: 0.45,
                                    color: '#5f4b3d',
                                    fontFamily: 'Kanit, sans-serif',
                                    fontSize: 12,
                                    fontWeight: 600,
                                  }}
                                >
                                  คงเหลือ
                                  <Box
                                    component="span"
                                    sx={{
                                      fontSize: 18,
                                      fontWeight: 700,
                                      lineHeight: 1,
                                    }}
                                  >
                                    {ingredient.quantity} {ingredient.unit}
                                  </Box>
                                </Typography>
                              ) : (
                                <Typography
                                  sx={{
                                    px: 1,
                                    py: 0.45,
                                    color: '#5f4b3d',
                                    fontFamily: 'Kanit, sans-serif',
                                    fontSize: 12,
                                    fontWeight: 600,
                                  }}
                                >
                                  ใช้คิดต้นทุนตามสูตร · ไม่ต้องเติมหรือตรวจนับ
                                </Typography>
                              )}
                              <Typography
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  px: 1,
                                  py: 0.45,
                                  color: '#805637',
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                ต้นทุน
                                <Box
                                  component="span"
                                  sx={{
                                    fontSize: 18,
                                    fontWeight: 700,
                                    lineHeight: 1,
                                  }}
                                >
                                  {ingredient.unitCost.toFixed(2)} บาท/
                                  {ingredient.unit}
                                </Box>
                              </Typography>
                              {ingredient.trackStock ? (
                                <Typography
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    px: 1,
                                    py: 0.45,
                                    color:
                                      ingredient.expiryStatus === 'expired'
                                        ? '#b42318'
                                        : ingredient.expiryStatus ===
                                            'expiring_soon'
                                          ? '#9a5a10'
                                          : '#5f4b3d',
                                    fontFamily: 'Kanit, sans-serif',
                                    fontSize: 12,
                                    fontWeight: 600,
                                  }}
                                >
                                  วันหมดอายุ
                                  <Box
                                    component="span"
                                    sx={{
                                      display: 'inline-block',
                                      minWidth: 108,
                                      fontSize: 17,
                                      fontWeight: 700,
                                      lineHeight: 1.1,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {formatExpiryDate(ingredient.expiryDate) ??
                                      'ไม่ระบุ'}
                                  </Box>
                                </Typography>
                              ) : null}
                            </Box>
                            {allowOrdering && ingredient.trackStock ? (
                              <Box
                                sx={{
                                  display: 'flex',
                                  gap: 1,
                                  mt: 'auto',
                                  pt: 2,
                                }}
                              >
                                <Button
                                  size="small"
                                  variant="contained"
                                  fullWidth
                                  onClick={() =>
                                    addToCart(ingredient, ingredientKey)
                                  }
                                  sx={{
                                    minHeight: 34,
                                    borderRadius: '10px',
                                    bgcolor: '#805637',
                                    color: '#fff',
                                    fontFamily: 'Kanit, sans-serif',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    boxShadow: 'none',
                                    '&:hover': {
                                      bgcolor: '#60412a',
                                      boxShadow: 'none',
                                    },
                                  }}
                                >
                                  สั่งวัตถุดิบ
                                </Button>
                              </Box>
                            ) : null}
                            {!readOnly ? (
                              <>
                                {ingredient.category === 'fresh' ? (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    fullWidth
                                    onClick={() =>
                                      openFreshLots(
                                        ingredient,
                                        branch as InventoryBranch,
                                      )
                                    }
                                    sx={{
                                      mt: 'auto',
                                      pt: 2,
                                      minHeight: 34,
                                      borderRadius: '10px',
                                      borderColor: '#805637',
                                      color: '#5f4030',
                                      fontFamily: 'Kanit, sans-serif',
                                      fontSize: 12,
                                      fontWeight: 600,
                                    }}
                                  >
                                    จัดการล็อตของสด
                                  </Button>
                                ) : ingredient.expiryStatus === 'expired' &&
                                  ingredient.quantity > 0 ? (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="error"
                                    fullWidth
                                    onClick={() =>
                                      setDiscardTargetKey(ingredientKey)
                                    }
                                    sx={{
                                      mt: 'auto',
                                      pt: 2,
                                      minHeight: 34,
                                      borderRadius: '10px',
                                      fontFamily: 'Kanit, sans-serif',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      boxShadow: 'none',
                                      '&:hover': { boxShadow: 'none' },
                                    }}
                                  >
                                    ตัดทิ้งวัตถุดิบหมดอายุ
                                  </Button>
                                ) : null}
                                <ItemActionButtons
                                  editLabel="แก้ไขวัตถุดิบ"
                                  deleteLabel="ลบวัตถุดิบ"
                                  onEdit={() => {
                                    setEditingIngredient(ingredient);
                                    setEditingBranch(branch as InventoryBranch);
                                    setImagePreviewUrl(null);
                                    setIsAddDrawerOpen(true);
                                  }}
                                  onDelete={() =>
                                    setDeleteTargetKey(ingredientKey)
                                  }
                                  sx={{
                                    mt:
                                      ingredient.category === 'fresh' ||
                                      ingredient.expiryStatus === 'expired'
                                        ? 1
                                        : 'auto',
                                    pt:
                                      ingredient.category === 'fresh' ||
                                      ingredient.expiryStatus === 'expired'
                                        ? 0
                                        : 2,
                                  }}
                                />
                              </>
                            ) : allowEditing ? (
                              <Box sx={{ mt: 'auto', pt: 2 }}>
                                <EditItemButton
                                  fullWidth
                                  onClick={() => {
                                    setEditingIngredient(ingredient);
                                    setEditingBranch(branch as InventoryBranch);
                                    setImagePreviewUrl(null);
                                    setIsAddDrawerOpen(true);
                                  }}
                                >
                                  แก้ไขวัตถุดิบ
                                </EditItemButton>
                              </Box>
                            ) : null}
                          </Box>
                          {!readOnly && discardTargetKey === ingredientKey && (
                            <Box
                              sx={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                p: 2.5,
                                bgcolor: 'rgba(32, 25, 20, .94)',
                                color: '#fff',
                                textAlign: 'center',
                              }}
                            >
                              <Typography
                                sx={{
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 18,
                                  fontWeight: 600,
                                }}
                              >
                                ตัดทิ้งวัตถุดิบหมดอายุ?
                              </Typography>
                              <Typography
                                sx={{
                                  color: 'rgba(255,255,255,.75)',
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 13,
                                }}
                              >
                                ระบบจะปรับยอดคงเหลือเป็น 0
                                และบันทึกประวัติการตัดทิ้ง
                              </Typography>
                              <Box
                                sx={{ display: 'flex', width: '100%', gap: 1 }}
                              >
                                <Button
                                  fullWidth
                                  onClick={() => setDiscardTargetKey(null)}
                                  sx={{
                                    minHeight: 38,
                                    borderRadius: '10px',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,.45)',
                                    fontFamily: 'Kanit, sans-serif',
                                  }}
                                >
                                  ยกเลิก
                                </Button>
                                <Button
                                  fullWidth
                                  variant="contained"
                                  color="error"
                                  disabled={isSavingInventory}
                                  onClick={() =>
                                    void discardExpiredIngredient(
                                      ingredient,
                                      branch as InventoryBranch,
                                    )
                                  }
                                  sx={{
                                    minHeight: 38,
                                    borderRadius: '10px',
                                    fontFamily: 'Kanit, sans-serif',
                                    boxShadow: 'none',
                                  }}
                                >
                                  ยืนยันตัดทิ้ง
                                </Button>
                              </Box>
                            </Box>
                          )}
                          {!readOnly && deleteTargetKey === ingredientKey && (
                            <Box
                              sx={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                p: 2.5,
                                bgcolor: 'rgba(32, 25, 20, .94)',
                                color: '#fff',
                                textAlign: 'center',
                              }}
                            >
                              <Typography
                                sx={{
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 18,
                                  fontWeight: 600,
                                }}
                              >
                                ยืนยันการลบวัตถุดิบ?
                              </Typography>
                              <Typography
                                sx={{
                                  color: 'rgba(255,255,255,.75)',
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 13,
                                }}
                              >
                                รายการนี้จะถูกลบออกจากสต๊อก
                              </Typography>
                              <Box
                                sx={{ display: 'flex', width: '100%', gap: 1 }}
                              >
                                <Button
                                  fullWidth
                                  onClick={() => setDeleteTargetKey(null)}
                                  sx={{
                                    minHeight: 38,
                                    borderRadius: '10px',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,.45)',
                                    fontFamily: 'Kanit, sans-serif',
                                  }}
                                >
                                  ยกเลิก
                                </Button>
                                <Button
                                  fullWidth
                                  variant="contained"
                                  color="error"
                                  disabled={isSavingInventory}
                                  onClick={() =>
                                    void removeIngredient(
                                      ingredient,
                                      branch as InventoryBranch,
                                    )
                                  }
                                  sx={{
                                    minHeight: 38,
                                    borderRadius: '10px',
                                    fontFamily: 'Kanit, sans-serif',
                                    boxShadow: 'none',
                                  }}
                                >
                                  ยืนยันลบ
                                </Button>
                              </Box>
                            </Box>
                          )}
                        </Card>
                      );
                    })}
                  </Box>
                </>
              )}
            </Box>
          );
        })}
      </Box>
      {Object.values(catalogIngredientsByBranch).every(
        (items) => filterIngredients(items).length === 0,
      ) && (
        <Typography
          sx={{
            pt: 4,
            textAlign: 'center',
            color: 'text.secondary',
            fontFamily: 'Kanit, sans-serif',
          }}
        >
          ไม่พบวัตถุดิบที่ค้นหา
        </Typography>
      )}
      <Drawer
        anchor="bottom"
        open={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        transitionDuration={{ enter: 360, exit: 280 }}
        sx={{ zIndex: 1300 }}
        slotProps={{
          paper: {
            sx: {
              left: { md: '280px' },
              width: { md: 'calc(100% - 304px)' },
              height: { xs: '88dvh', sm: 'calc(100dvh - 72px)' },
              overflow: 'hidden',
              borderRadius: '16px 16px 0 0',
              bgcolor: '#fffaf7',
            },
          },
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 2.5, sm: 4 },
            pt: 1.5,
            pb: 3.5,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 5,
              mx: 'auto',
              mb: 2.5,
              borderRadius: 99,
              bgcolor: '#d8c8bd',
            }}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Typography
              sx={{
                color: '#201914',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {drawerTitle}
            </Typography>
            <Button
              aria-label="ปิด"
              onClick={() => setIsAddDrawerOpen(false)}
              onMouseEnter={() => closeIconRef.current?.startAnimation()}
              onMouseLeave={() => closeIconRef.current?.stopAnimation()}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 40,
                width: 40,
                height: 40,
                p: 0,
                borderRadius: '12px',
                bgcolor: '#f7eee8',
                color: '#5f4b3d',
                '&:hover': { bgcolor: '#f1e4da' },
              }}
            >
              <XIcon
                ref={closeIconRef}
                size={20}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 0,
                }}
              />
            </Button>
          </Box>
          <Typography
            sx={{
              mt: 0.5,
              color: 'text.secondary',
              fontFamily: 'Kanit, sans-serif',
            }}
          >
            {editingIngredient
              ? 'แก้ไขข้อมูลวัตถุดิบในสต๊อก'
              : 'กรอกข้อมูลวัตถุดิบเพื่อเพิ่มเข้าสต๊อก'}
          </Typography>
          {isLimitedEdit ? (
            <Typography
              sx={{
                mt: 0.5,
                color: 'text.secondary',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 13,
              }}
            >
              แก้ไขได้เฉพาะจำนวนคงเหลือ แจ้งเตือนเมื่อคงเหลือ และวันหมดอายุ
            </Typography>
          ) : null}
          <Divider
            sx={{
              mt: 2.25,
              mb: 0,
              mx: { xs: -2.5, sm: -4 },
              borderColor: '#e8ddd5',
            }}
          />
          <Box
            sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pt: 2.25, pr: 0.5 }}
          >
            <Box
              key={
                editingIngredient?.id ?? `new-${editingBranch ?? activeBranch}`
              }
              component="form"
              onSubmit={(event) => void saveIngredient(event)}
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'minmax(0, 1fr) minmax(0, 2fr)',
                },
                gap: 2.5,
                mt: 0,
                '& .MuiOutlinedInput-root': { borderRadius: '12px' },
              }}
            >
              <Box
                component="label"
                sx={{
                  alignItems: 'center',
                  alignSelf: 'start',
                  aspectRatio: '1 / 1',
                  bgcolor: '#f7eee8',
                  border: '1.5px dashed #c9b6a9',
                  borderRadius: '16px',
                  color: '#5f4b3d',
                  cursor: isLimitedEdit ? 'default' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': isLimitedEdit
                    ? undefined
                    : { bgcolor: '#f1e4da', borderColor: '#805637' },
                }}
              >
                {imagePreviewUrl || editingIngredient?.imageUrl ? (
                  <Box
                    component="img"
                    src={imagePreviewUrl ?? editingIngredient?.imageUrl}
                    alt={`ตัวอย่างรูป${ingredientLabel}`}
                    sx={{
                      height: '100%',
                      inset: 0,
                      objectFit: 'cover',
                      position: 'absolute',
                      width: '100%',
                    }}
                  />
                ) : null}
                <Typography
                  sx={{
                    bgcolor:
                      imagePreviewUrl || editingIngredient?.imageUrl
                        ? 'rgba(32, 25, 20, .58)'
                        : 'transparent',
                    borderRadius: 1.5,
                    color:
                      imagePreviewUrl || editingIngredient?.imageUrl
                        ? '#fff'
                        : 'inherit',
                    fontFamily: 'Kanit, sans-serif',
                    fontWeight: 500,
                    px: 1.25,
                    py: 0.5,
                    position: 'relative',
                  }}
                >
                  {imagePreviewUrl || editingIngredient?.imageUrl
                    ? `เปลี่ยนรูป${ingredientLabel}`
                    : `เพิ่มรูป${ingredientLabel}`}
                </Typography>
                {!imagePreviewUrl && !editingIngredient?.imageUrl ? (
                  <Typography
                    sx={{
                      color: 'text.secondary',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 12,
                      mt: 0.25,
                    }}
                  >
                    JPG หรือ PNG ขนาดไม่เกิน 5 MB
                  </Typography>
                ) : null}
                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      setInventoryNotice({
                        severity: 'error',
                        message: 'รูปภาพต้องมีขนาดไม่เกิน 5 MB',
                      });
                      return;
                    }
                    const reader = new FileReader();
                    reader.addEventListener('load', () =>
                      setImagePreviewUrl(String(reader.result)),
                    );
                    reader.readAsDataURL(file);
                  }}
                  disabled={isLimitedEdit}
                />
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                  },
                  gap: 2,
                }}
              >
                <TextField
                  required
                  fullWidth
                  name="name"
                  label="ชื่อวัตถุดิบ"
                  placeholder="เช่น เมล็ดกาแฟคั่วกลาง"
                  defaultValue={editingIngredient?.name}
                  disabled={isLimitedEdit}
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                />
                {isFreshIngredientsPage ? (
                  <TextField
                    fullWidth
                    disabled
                    label="หมวดหมู่"
                    value="ของสด"
                    helperText="รายการในหน้านี้จะถูกจัดเป็นของสดอัตโนมัติ"
                  />
                ) : (
                  <TextField
                    required
                    select
                    fullWidth
                    name="category"
                    label="หมวดหมู่"
                    defaultValue={editingIngredient?.category ?? 'other'}
                    disabled={isLimitedEdit}
                  >
                    <MenuItem value="coffee">เมล็ดกาแฟ</MenuItem>
                    <MenuItem value="milk">นมและครีม</MenuItem>
                    <MenuItem value="syrup">ไซรัปและผงชง</MenuItem>
                    <MenuItem value="other">อื่น ๆ</MenuItem>
                  </TextField>
                )}
                {!isFreshIngredientsPage ? (
                  <TextField
                    select
                    fullWidth
                    name="trackStock"
                    label="การจัดการสต๊อก"
                    defaultValue={
                      editingIngredient
                        ? String(editingIngredient.trackStock)
                        : ''
                    }
                    helperText={
                      editingIngredient
                        ? 'การเปลี่ยนค่านี้จะมีผลกับรายการชื่อเดียวกันทุกสาขา'
                        : 'หากเพิ่มชื่อที่มีอยู่แล้ว ระบบจะใช้การตั้งค่ากลางเดิม'
                    }
                    disabled={isLimitedEdit}
                  >
                    {!editingIngredient ? (
                      <MenuItem value="">ใช้การตั้งค่ากลางเดิม</MenuItem>
                    ) : null}
                    <MenuItem value="true">ติดตามสต๊อกและแจ้งเตือน</MenuItem>
                    <MenuItem value="false">คิดต้นทุนเท่านั้น</MenuItem>
                  </TextField>
                ) : null}
                <TextField
                  fullWidth
                  required
                  name="quantity"
                  label="จำนวนคงเหลือ"
                  type="number"
                  defaultValue={editingIngredient?.quantity}
                  slotProps={{ htmlInput: { min: 0 } }}
                />
                <TextField
                  required
                  select
                  fullWidth
                  name="unit"
                  label="หน่วย"
                  defaultValue={normalizeInventoryUnit(
                    editingIngredient?.unit ?? 'กิโลกรัม',
                  )}
                  slotProps={inventoryUnitSelectSlotProps}
                  disabled={isLimitedEdit}
                >
                  {INVENTORY_UNIT_OPTIONS.map((unit) => (
                    <MenuItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  name="reorderLevel"
                  label="แจ้งเตือนเมื่อคงเหลือ"
                  type="number"
                  defaultValue={editingIngredient?.reorderLevel ?? 0}
                  slotProps={{ htmlInput: { min: 0 } }}
                />
                <TextField
                  fullWidth
                  required
                  name="unitCost"
                  label="ต้นทุนต่อหน่วย"
                  type="number"
                  defaultValue={editingIngredient?.unitCost ?? 0}
                  slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                  disabled={isLimitedEdit}
                />
                <DateField
                  fullWidth
                  required={isFreshIngredientsPage && !editingIngredient}
                  name="expiryDate"
                  label="วันหมดอายุ"
                  defaultValue={inputDateValue(
                    editingIngredient?.expiryDate ?? null,
                  )}
                  helperText={
                    isFreshIngredientsPage && !editingIngredient
                      ? 'ของสดที่มีจำนวนตั้งต้นต้องระบุวันหมดอายุเพื่อสร้างล็อตแรก'
                      : 'เว้นว่างได้หากวัตถุดิบไม่มีวันหมดอายุ'
                  }
                />
                {activeBranch === 'ทุกสาขา' && !editingIngredient ? (
                  <TextField
                    required
                    select
                    fullWidth
                    name="branch"
                    label="สาขา"
                    defaultValue={editingBranch ?? availableBranchNames[0]}
                  >
                    {availableBranchNames.map((branch) => (
                      <MenuItem key={branch} value={branch}>
                        {branch}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : null}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 1.25,
                    mt: 1,
                    gridColumn: { sm: '1 / -1' },
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => setIsAddDrawerOpen(false)}
                    sx={{
                      minHeight: 40,
                      borderRadius: '12px',
                      color: '#5f4b3d',
                      fontFamily: 'Kanit, sans-serif',
                    }}
                  >
                    {editingIngredient ? 'ยกเลิกแก้ไข' : 'ยกเลิกเพิ่ม'}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSavingInventory}
                    sx={{
                      minHeight: 40,
                      borderRadius: '12px',
                      bgcolor: '#201914',
                      fontFamily: 'Kanit, sans-serif',
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
                    }}
                  >
                    {isSavingInventory
                      ? 'กำลังบันทึก…'
                      : editingIngredient
                        ? 'บันทึกการแก้ไข'
                        : 'บันทึกวัตถุดิบ'}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Drawer>
      <Drawer
        anchor="bottom"
        open={freshLotTarget !== null}
        onClose={() => setFreshLotTarget(null)}
        transitionDuration={{ enter: 360, exit: 280 }}
        sx={{ zIndex: 1301 }}
        slotProps={{
          paper: {
            sx: {
              left: { md: '280px' },
              width: { md: 'calc(100% - 304px)' },
              height: { xs: '88dvh', sm: 'calc(100dvh - 72px)' },
              overflow: 'hidden',
              bgcolor: '#fffaf7',
              borderRadius: '16px 16px 0 0',
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            px: { xs: 2.5, sm: 4 },
            pt: 1.5,
            pb: 3,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 5,
              mx: 'auto',
              mb: 2.5,
              borderRadius: 99,
              bgcolor: '#d8c8bd',
            }}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography
                sx={{
                  color: '#201914',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                ล็อตของสด
                {freshLotTarget ? ` · ${freshLotTarget.ingredient.name}` : ''}
              </Typography>
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontFamily: 'Kanit, sans-serif',
                }}
              >
                ระบบตัดตามล็อตที่หมดอายุก่อน (FEFO) และไม่ใช้ล็อตหมดอายุ
              </Typography>
            </Box>
            <Button
              aria-label="ปิดล็อตของสด"
              onClick={() => setFreshLotTarget(null)}
              sx={{
                minWidth: 40,
                width: 40,
                height: 40,
                p: 0,
                borderRadius: '12px',
                bgcolor: '#f7eee8',
                color: '#5f4b3d',
              }}
            >
              <XIcon size={20} />
            </Button>
          </Box>
          <Divider
            sx={{ mt: 2.25, mx: { xs: -2.5, sm: -4 }, borderColor: '#e8ddd5' }}
          />
          <Box
            sx={{ flex: 1, minHeight: 0, overflowY: 'auto', py: 2.25, pr: 0.5 }}
          >
            <Box
              component="form"
              onSubmit={(event) => void receiveFreshLot(event)}
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(3, minmax(0, 1fr))',
                },
                gap: 1.25,
                p: 2,
                border: '1px solid #e8ddd5',
                borderRadius: '16px',
                bgcolor: '#fff',
                '& .MuiOutlinedInput-root': { borderRadius: '10px' },
              }}
            >
              <Typography
                sx={{
                  gridColumn: { md: '1 / -1' },
                  fontFamily: 'Kanit, sans-serif',
                  fontWeight: 600,
                }}
              >
                รับล็อตใหม่
              </Typography>
              <TextField
                name="lotNumber"
                label="เลขล็อต (ถ้ามี)"
                size="small"
              />
              <TextField
                name="receivedAt"
                label="วันที่รับเข้า"
                type="date"
                required
                size="small"
                defaultValue={new Date().toISOString().slice(0, 10)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                name="expiryDate"
                label="วันหมดอายุ"
                type="date"
                required
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                name="quantity"
                label={`จำนวน (${freshLotTarget?.ingredient.unit ?? ''})`}
                type="number"
                required
                size="small"
                slotProps={{ htmlInput: { min: 0.01, step: '0.01' } }}
              />
              <TextField
                name="unitCost"
                label="ต้นทุนต่อหน่วย"
                type="number"
                required
                size="small"
                defaultValue={freshLotTarget?.ingredient.unitCost ?? 0}
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
              />
              <TextField name="note" label="หมายเหตุ" size="small" />
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gridColumn: { md: '1 / -1' },
                }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSavingInventory}
                  sx={{
                    minHeight: 38,
                    borderRadius: '10px',
                    bgcolor: '#201914',
                    fontFamily: 'Kanit, sans-serif',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
                  }}
                >
                  {isSavingInventory ? 'กำลังบันทึก…' : 'รับล็อตเข้าสต๊อก'}
                </Button>
              </Box>
            </Box>
            <Typography
              sx={{
                mt: 2.5,
                mb: 1,
                fontFamily: 'Kanit, sans-serif',
                fontSize: 17,
                fontWeight: 600,
              }}
            >
              รายการล็อต
            </Typography>
            {isFreshLotsLoading ? (
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontFamily: 'Kanit, sans-serif',
                }}
              >
                กำลังโหลดล็อต…
              </Typography>
            ) : freshLots.length === 0 ? (
              <Alert severity="info" sx={{ fontFamily: 'Kanit, sans-serif' }}>
                ยังไม่มีล็อตของสด ให้รับล็อตแรกเพื่อเริ่มตัดแบบ FEFO
              </Alert>
            ) : (
              <Box sx={{ display: 'grid', gap: 1 }}>
                {freshLots.map((lot) => {
                  const canDiscard =
                    lot.status === 'active' && lot.quantityRemaining > 0;
                  const lotStatus =
                    lot.expiryStatus === 'expired'
                      ? 'หมดอายุ'
                      : lot.expiryStatus === 'expiring_soon'
                        ? 'ใกล้หมดอายุ'
                        : lot.status === 'discarded'
                          ? 'ตัดทิ้งแล้ว'
                          : 'พร้อมใช้';
                  return (
                    <Box
                      key={lot.id}
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 1.25,
                        p: 1.5,
                        border: '1px solid #e8ddd5',
                        borderRadius: '14px',
                        bgcolor: '#fff',
                      }}
                    >
                      <Box sx={{ flex: '1 1 260px' }}>
                        <Typography
                          sx={{
                            fontFamily: 'Kanit, sans-serif',
                            fontWeight: 600,
                          }}
                        >
                          {lot.lotNumber || `ล็อต #${lot.id}`}
                        </Typography>
                        <Typography
                          sx={{
                            color: 'text.secondary',
                            fontFamily: 'Kanit, sans-serif',
                            fontSize: 13,
                          }}
                        >
                          รับเข้า {formatExpiryDate(lot.receivedAt)} · หมดอายุ{' '}
                          {formatExpiryDate(lot.expiryDate)}
                        </Typography>
                      </Box>
                      <Chip
                        label={lotStatus}
                        size="small"
                        color={
                          lot.expiryStatus === 'expired'
                            ? 'error'
                            : lot.expiryStatus === 'expiring_soon'
                              ? 'warning'
                              : 'default'
                        }
                        sx={{ fontFamily: 'Kanit, sans-serif' }}
                      />
                      <Typography
                        sx={{
                          minWidth: 110,
                          textAlign: { xs: 'left', sm: 'right' },
                          fontFamily: 'Kanit, sans-serif',
                          fontWeight: 600,
                        }}
                      >
                        เหลือ {lot.quantityRemaining}{' '}
                        {freshLotTarget?.ingredient.unit}
                      </Typography>
                      {canDiscard ? (
                        freshLotDiscardID === lot.id ? (
                          <Box sx={{ display: 'flex', gap: 0.75 }}>
                            <Button
                              size="small"
                              onClick={() => setFreshLotDiscardID(null)}
                              sx={{ fontFamily: 'Kanit, sans-serif' }}
                            >
                              ยกเลิก
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              disabled={isSavingInventory}
                              onClick={() => void discardFreshLot(lot)}
                              sx={{
                                fontFamily: 'Kanit, sans-serif',
                                boxShadow: 'none',
                              }}
                            >
                              ยืนยันตัดทิ้ง
                            </Button>
                          </Box>
                        ) : (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => setFreshLotDiscardID(lot.id)}
                            sx={{ fontFamily: 'Kanit, sans-serif' }}
                          >
                            ตัดทิ้ง
                          </Button>
                        )
                      ) : null}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>
      <Drawer
        anchor="bottom"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        transitionDuration={{ enter: 360, exit: 280 }}
        sx={{ zIndex: 1300 }}
        slotProps={{
          paper: {
            sx: {
              left: { md: '280px' },
              width: { md: 'calc(100% - 304px)' },
              height: { xs: '88dvh', sm: 'calc(100dvh - 72px)' },
              overflow: 'hidden',
              bgcolor: '#fffaf7',
              borderRadius: '16px 16px 0 0',
            },
          },
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 2.5, sm: 4 },
            pt: 1.5,
            pb: 3.5,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 5,
              mx: 'auto',
              mb: 2.5,
              borderRadius: 99,
              bgcolor: '#d8c8bd',
            }}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography
                sx={{
                  color: '#201914',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                ตะกร้าวัตถุดิบ
              </Typography>
              <Typography
                sx={{
                  mt: 0.25,
                  color: 'text.secondary',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 13,
                }}
              >
                {cartQuantity
                  ? `${cartQuantity} รายการที่ต้องการสั่ง`
                  : 'ยังไม่มีรายการในตะกร้า'}
              </Typography>
            </Box>
            <Button
              aria-label="ปิดตะกร้าวัตถุดิบ"
              onClick={() => setCartOpen(false)}
              onMouseEnter={() => cartCloseIconRef.current?.startAnimation()}
              onMouseLeave={() => cartCloseIconRef.current?.stopAnimation()}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 40,
                width: 40,
                height: 40,
                p: 0,
                borderRadius: '12px',
                bgcolor: '#f7eee8',
                color: '#5f4b3d',
                '&:hover': { bgcolor: '#f1e4da' },
              }}
            >
              <XIcon
                ref={cartCloseIconRef}
                size={20}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 0,
                }}
              />
            </Button>
          </Box>
          <Divider
            sx={{
              mt: 2.25,
              mb: 0,
              mx: { xs: -2.5, sm: -4 },
              borderColor: '#e8ddd5',
            }}
          />
          <Box
            sx={{
              display: 'grid',
              alignContent: 'start',
              gap: 1.25,
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              pt: 2.25,
            }}
          >
            {cartItems.length ? (
              cartItems.map((item) => (
                <Box
                  key={item.key}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '56px minmax(0, 1fr) auto',
                    gap: 1.25,
                    alignItems: 'center',
                    p: 1.25,
                    border: '1px solid #e8ddd5',
                    borderRadius: '12px',
                    bgcolor: '#fff',
                  }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'grid',
                      placeItems: 'center',
                      width: 56,
                      height: 56,
                      overflow: 'hidden',
                      borderRadius: '10px',
                      bgcolor: '#f4eae3',
                      color: '#805637',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    <Box component="span">{item.name.slice(0, 1)}</Box>
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        noWrap
                        sx={{
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {item.name}
                      </Typography>
                      {item.status !== 'พร้อมใช้' ? (
                        <Chip
                          label={
                            item.status === 'วัตถุดิบหมด' ? 'หมด' : 'ใกล้หมด'
                          }
                          size="small"
                          sx={{
                            flexShrink: 0,
                            height: 20,
                            bgcolor: INGREDIENT_STATUS_BADGES[item.status].main,
                            color:
                              INGREDIENT_STATUS_BADGES[item.status]
                                .contrastText,
                            fontFamily: 'Kanit, sans-serif',
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        />
                      ) : null}
                    </Box>
                    <Typography
                      sx={{
                        mt: 0.15,
                        color: 'text.secondary',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 12,
                      }}
                    >
                      คงเหลือ {item.quantity} {item.unit}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}
                  >
                    <Button
                      aria-label={`ลดจำนวน ${item.name}`}
                      onClick={() =>
                        updateCartQuantity(item.key, item.quantityToOrder - 1)
                      }
                      sx={{
                        flex: '0 0 40px',
                        minWidth: 40,
                        width: 40,
                        minHeight: 40,
                        height: 40,
                        maxHeight: 40,
                        aspectRatio: '1 / 1',
                        boxSizing: 'border-box',
                        p: 0,
                        borderRadius: '9px',
                        color: '#5f4b3d',
                        border: '1px solid #d8c8bd',
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          display: 'block',
                          fontFamily: 'Arial, sans-serif',
                          fontSize: 20,
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        −
                      </Box>
                    </Button>
                    <Typography
                      sx={{
                        minWidth: 26,
                        textAlign: 'center',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {item.quantityToOrder}
                    </Typography>
                    <Button
                      aria-label={`เพิ่มจำนวน ${item.name}`}
                      onClick={() =>
                        updateCartQuantity(item.key, item.quantityToOrder + 1)
                      }
                      sx={{
                        flex: '0 0 40px',
                        minWidth: 40,
                        width: 40,
                        minHeight: 40,
                        height: 40,
                        maxHeight: 40,
                        aspectRatio: '1 / 1',
                        boxSizing: 'border-box',
                        p: 0,
                        borderRadius: '9px',
                        color: '#5f4b3d',
                        border: '1px solid #d8c8bd',
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          display: 'block',
                          fontFamily: 'Arial, sans-serif',
                          fontSize: 20,
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        +
                      </Box>
                    </Button>
                    <Button
                      aria-label={`ลบ ${item.name} ออกจากตะกร้า`}
                      onClick={() => updateCartQuantity(item.key, 0)}
                      sx={{
                        flex: '0 0 40px',
                        minWidth: 40,
                        width: 40,
                        minHeight: 40,
                        height: 40,
                        maxHeight: 40,
                        aspectRatio: '1 / 1',
                        boxSizing: 'border-box',
                        ml: 0.5,
                        p: 0,
                        borderRadius: '9px',
                        color: '#b42318',
                        '&:hover': { bgcolor: '#fff0ee' },
                      }}
                    >
                      <XIcon size={16} />
                    </Button>
                  </Box>
                </Box>
              ))
            ) : (
              <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                <CartIcon size={32} />
                <Typography
                  sx={{ mt: 1, fontFamily: 'Kanit, sans-serif', fontSize: 14 }}
                >
                  เลือกวัตถุดิบจาก card เพื่อเพิ่มลงตะกร้า
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              pt: 2.25,
            }}
          >
            {cartItems.length ? (
              <Typography
                sx={{
                  alignSelf: 'stretch',
                  mb: 1.25,
                  px: 1.25,
                  py: 0.75,
                  border: '1px solid #e4d3c6',
                  borderRadius: '10px',
                  bgcolor: '#f7eee8',
                  color: '#5f4030',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: 'right',
                }}
              >
                สรุป {cartItems.length} รายการ · จำนวนที่เลือก {cartQuantity}
              </Typography>
            ) : null}
            <Button
              variant="contained"
              disabled={cartItems.length === 0 || createRequest.isPending}
              onClick={() =>
                createRequest.mutate({
                  note: 'คำขอวัตถุดิบจาก Franchise',
                  items: cartItems.map((item) => ({
                    inventoryItemId: item.id,
                    name: item.name,
                    quantity: item.quantityToOrder,
                    unit: item.unit,
                  })),
                })
              }
              sx={{
                minHeight: 40,
                px: 2,
                borderRadius: '12px',
                bgcolor: '#805637',
                fontFamily: 'Kanit, sans-serif',
                fontWeight: 500,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#60412a', boxShadow: 'none' },
              }}
            >
              {createRequest.isPending ? 'กำลังส่งคำขอ…' : 'ยืนยันสั่งวัตถุดิบ'}
            </Button>
          </Box>
        </Box>
      </Drawer>
      <ActionSnackbar
        notice={cartError ? { message: cartError, severity: 'error' } : null}
        onClose={() => setCartError(null)}
      />
      <ActionSnackbar
        notice={inventoryNotice}
        autoHideDuration={5_000}
        desktopSx={{ mb: isCartSuccessVisible ? 10 : 2 }}
        onClose={() => setInventoryNotice(null)}
      />
      <ActionSnackbar
        notice={
          isCartSuccessVisible ? { message: 'ส่งคำขอวัตถุดิบแล้ว' } : null
        }
        autoHideDuration={5_000}
        action={
          onRequestCreated ? (
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setIsCartSuccessVisible(false);
                onRequestCreated();
              }}
              sx={{ fontFamily: 'Kanit, sans-serif' }}
            >
              ดูคำขอ
            </Button>
          ) : undefined
        }
        onClose={() => setIsCartSuccessVisible(false)}
      />
    </DashboardMain>
  );
}
