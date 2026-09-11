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
  InputAdornment,
  MenuItem,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import {
  DashboardMain,
  CircleCheckIcon,
  CartIcon,
  INGREDIENT_STATUS_BADGES,
  PlusIcon,
  SearchIcon,
  XIcon,
  type IngredientStatus,
  type CartIconHandle,
  type PlusIconHandle,
  type SearchIconHandle,
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
  listInventory,
  updateInventory,
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
  status: IngredientStatus;
  imageUrl: string;
  expiryDate: string | null;
  expiryStatus: 'none' | 'expiring_soon' | 'expired';
};
type IngredientCartItem = Ingredient & { key: string; quantityToOrder: number };
type InventoryBranch = string;

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
  allowOrdering = false,
  onRequestCreated,
  branchOptions = branches,
  branchCodes = branchCodeByBranch,
}: {
  activeBranch: string;
  franchisePlan?: 'S' | 'M' | 'L';
  readOnly?: boolean;
  allowOrdering?: boolean;
  onRequestCreated?: () => void;
  branchOptions?: readonly string[];
  branchCodes?: BranchCodeMap;
}) {
  const plusIconRef = useRef<PlusIconHandle>(null);
  const searchIconRef = useRef<SearchIconHandle>(null);
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
  const [catalogIngredientsByBranch, setCatalogIngredientsByBranch] = useState<
    Record<string, Ingredient[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteTargetKey, setDeleteTargetKey] = useState<string | null>(null);
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
  const filterIngredients = (items: Ingredient[]) =>
    items.filter((ingredient) => {
      const matchesQuery = ingredient.name
        .toLowerCase()
        .includes(deferredQuery.trim().toLowerCase());
      const matchesFilter =
        filter === 'ทั้งหมด' ||
        ingredient.status === filter ||
        (filter === 'ใกล้หมดอายุ' &&
          ingredient.expiryStatus === 'expiring_soon') ||
        (filter === 'หมดอายุ' && ingredient.expiryStatus === 'expired');
      return matchesQuery && matchesFilter;
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
            status: (item.status === 'out'
              ? 'วัตถุดิบหมด'
              : item.status === 'low'
                ? 'วัตถุดิบใกล้หมด'
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
  const drawerTitle = editingIngredient ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบ';
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
      activeBranch === 'ทุกสาขา'
        ? (String(formData.get('branch')) as InventoryBranch)
        : (editingBranch ?? activeBranch);
    const expiryDate = String(formData.get('expiryDate') ?? '').trim();
    const data: InventoryInput = {
      name: String(formData.get('name') ?? '').trim(),
      category: String(formData.get('category') ?? 'other'),
      kind: 'ingredient',
      quantity: Number(formData.get('quantity') ?? 0),
      unit: String(formData.get('unit') ?? ''),
      reorderLevel: Number(formData.get('reorderLevel') ?? 0),
      unitCost: Number(formData.get('unitCost') ?? 0),
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

  return (
    <DashboardMain>
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
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => searchIconRef.current?.startAnimation()}
            onBlur={() => searchIconRef.current?.stopAnimation()}
            placeholder="ค้นหาวัตถุดิบ"
            size="small"
            name="ingredient-search"
            autoComplete="off"
            sx={{
              flex: { xs: 1, lg: '0 1 auto' },
              width: { lg: 310 },
              '& .MuiOutlinedInput-root': { borderRadius: '12px' },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment
                    position="start"
                    sx={{
                      alignSelf: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      height: 18,
                    }}
                  >
                    <SearchIcon ref={searchIconRef} size={18} />
                  </InputAdornment>
                ),
              },
            }}
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
            เพิ่มวัตถุดิบ
          </Button>
        ) : null}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {filters.map((item) => (
          <Button
            key={item}
            size="small"
            variant={filter === item ? 'contained' : 'outlined'}
            onClick={() => setFilter(item)}
            sx={{
              minHeight: 34,
              borderRadius: '12px',
              border: '1px solid',
              borderColor: filter === item ? '#201914' : '#d8c8bd',
              bgcolor: filter === item ? '#201914' : '#fff',
              color: filter === item ? '#fff' : '#5f4b3d',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 12,
              fontWeight: 500,
              boxShadow: 'none',
              '&:hover': {
                borderColor: '#201914',
                bgcolor: filter === item ? '#3c2d24' : '#f5eee9',
                boxShadow: 'none',
              },
            }}
          >
            {item}
          </Button>
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
              ) : isLoading || !isBranchLoaded ? (
                <IngredientsSkeleton
                  readOnly={readOnly}
                  allowOrdering={allowOrdering}
                />
              ) : (
                <>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, minmax(0, 1fr))',
                        md: 'repeat(4, minmax(0, 1fr))',
                      },
                      gap: '16px',
                    }}
                  >
                    {filteredIngredients.map((ingredient, ingredientIndex) => {
                      const statusBadge =
                        INGREDIENT_STATUS_BADGES[ingredient.status];
                      const ingredientKey = `${branch}-${ingredient.name}`;
                      return (
                        <Card
                          key={ingredientKey}
                          variant="outlined"
                          sx={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
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
                            <Chip
                              label={ingredient.status}
                              size="small"
                              sx={{
                                height: 25,
                                borderRadius: '12px',
                                bgcolor: statusBadge.main,
                                color: statusBadge.contrastText,
                                fontFamily: 'Kanit, sans-serif',
                                fontSize: 11,
                                fontWeight: 500,
                                position: 'relative',
                              }}
                            />
                            {ingredient.expiryStatus !== 'none' ? (
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
                                  sx={{ fontWeight: 700, lineHeight: 1 }}
                                >
                                  {formatExpiryDate(ingredient.expiryDate) ??
                                    'ไม่ระบุ'}
                                </Box>
                              </Typography>
                            </Box>
                            {allowOrdering ? (
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
                                  onClick={() => {
                                    setEditingIngredient(ingredient);
                                    setEditingBranch(branch as InventoryBranch);
                                    setIsAddDrawerOpen(true);
                                  }}
                                  sx={{
                                    flex: 1,
                                    minHeight: 34,
                                    borderRadius: '10px',
                                    bgcolor: '#5f4030',
                                    color: '#fff',
                                    fontFamily: 'Kanit, sans-serif',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    boxShadow: 'none',
                                    '&:hover': {
                                      bgcolor: '#3c2d24',
                                      boxShadow: 'none',
                                    },
                                  }}
                                >
                                  แก้ไขวัตถุดิบ
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="error"
                                  onClick={() =>
                                    setDeleteTargetKey(ingredientKey)
                                  }
                                  sx={{
                                    flex: 1,
                                    minHeight: 34,
                                    borderRadius: '10px',
                                    fontFamily: 'Kanit, sans-serif',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    boxShadow: 'none',
                                    '&:hover': { boxShadow: 'none' },
                                  }}
                                >
                                  ลบวัตถุดิบ
                                </Button>
                              </Box>
                            ) : null}
                          </Box>
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
              height: { xs: '82vh', sm: 'min(82vh, 720px)' },
              overflow: 'hidden',
              borderRadius: '24px 24px 0 0',
              bgcolor: '#fffaf7',
              boxShadow: '0 -12px 32px rgba(50, 35, 25, .18)',
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
                gap: 2.5,
                mt: 0,
                '& .MuiOutlinedInput-root': { borderRadius: '12px' },
              }}
            >
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
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                />
                <TextField
                  required
                  select
                  fullWidth
                  name="category"
                  label="หมวดหมู่"
                  defaultValue={editingIngredient?.category ?? 'other'}
                >
                  <MenuItem value="coffee">เมล็ดกาแฟ</MenuItem>
                  <MenuItem value="milk">นมและครีม</MenuItem>
                  <MenuItem value="syrup">ไซรัปและผงชง</MenuItem>
                  <MenuItem value="other">อื่น ๆ</MenuItem>
                </TextField>
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
                  defaultValue={editingIngredient?.unit ?? 'kg'}
                >
                  <MenuItem value="kg">กิโลกรัม</MenuItem>
                  <MenuItem value="liter">ลิตร</MenuItem>
                  <MenuItem value="bottle">ขวด</MenuItem>
                  <MenuItem value="piece">ชิ้น</MenuItem>
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
                />
                <TextField
                  fullWidth
                  name="expiryDate"
                  label="วันหมดอายุ"
                  type="date"
                  defaultValue={inputDateValue(
                    editingIngredient?.expiryDate ?? null,
                  )}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText="เว้นว่างได้หากวัตถุดิบไม่มีวันหมดอายุ"
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
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        transitionDuration={{ enter: 360, exit: 280 }}
        sx={{ zIndex: 1300 }}
        slotProps={{
          paper: {
            sx: {
              left: { md: '280px' },
              width: { md: 'calc(100% - 304px)' },
              height: { xs: '82vh', sm: 740 },
              maxHeight: '88vh',
              overflow: 'hidden',
              bgcolor: '#fffaf7',
              borderRadius: '24px 24px 0 0',
              boxShadow: '0 -12px 32px rgba(50, 35, 25, .18)',
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
            {cartError ? (
              <Typography
                sx={{
                  alignSelf: 'stretch',
                  mb: 1,
                  color: 'error.main',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 13,
                }}
              >
                {cartError}
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
      <Snackbar
        open={Boolean(inventoryNotice)}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: isCartSuccessVisible ? 10 : 2 }}
        onClose={() => setInventoryNotice(null)}
      >
        <Alert
          severity={inventoryNotice?.severity ?? 'success'}
          variant="filled"
          sx={{ fontFamily: 'Kanit, sans-serif', fontWeight: 500 }}
        >
          {inventoryNotice?.message}
        </Alert>
      </Snackbar>
      <Snackbar
        open={isCartSuccessVisible}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 2 }}
        onClose={() => setIsCartSuccessVisible(false)}
      >
        <Alert
          severity="success"
          variant="filled"
          icon={<CircleCheckIcon animate={isCartSuccessVisible} />}
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
          sx={{
            fontFamily: 'Kanit, sans-serif',
            fontWeight: 500,
          }}
        >
          ส่งคำขอวัตถุดิบแล้ว
        </Alert>
      </Snackbar>
    </DashboardMain>
  );
}
