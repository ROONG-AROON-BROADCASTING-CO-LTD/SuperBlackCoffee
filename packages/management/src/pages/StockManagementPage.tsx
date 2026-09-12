import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Drawer,
  InputAdornment,
  MenuItem,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import {
  CartIcon,
  CircleCheckIcon,
  DashboardMain,
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
import { listInventory } from '../api/inventory';
import { StockSkeleton } from '../components/skeletons/StockSkeleton';
import { DataLoadNotice } from '../components/DataLoadNotice';
import { useAutoRetry } from '../hooks/useAutoRetry';
import { createStockRequest } from '../api/stock-requests';

type StockItem = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  unitCost: number;
  status: IngredientStatus;
  position: string;
  imageUrl: string;
};
type StockCartItem = StockItem & { key: string; quantityToOrder: number };
const filters = ['ทั้งหมด', 'ใกล้หมด', 'หมด', 'ค้างสต๊อก'] as const;
type StockFilter = (typeof filters)[number];

export function StockManagementPage({
  activeBranch,
  readOnly = false,
  allowOrdering = false,
  onRequestCreated,
  stockCategory = 'drink_equipment',
  stockLabel = 'สต๊อกอุปกรณ์เครื่องดื่ม',
  branchOptions = branches,
  branchCodes = branchCodeByBranch,
}: {
  activeBranch: string;
  readOnly?: boolean;
  allowOrdering?: boolean;
  onRequestCreated?: () => void;
  stockCategory?: 'drink_equipment' | 'postal_equipment';
  stockLabel?: string;
  branchOptions?: readonly string[];
  branchCodes?: BranchCodeMap;
}) {
  const plusRef = useRef<PlusIconHandle>(null);
  const searchRef = useRef<SearchIconHandle>(null);
  const closeRef = useRef<XIconHandle>(null);
  const cartCloseRef = useRef<XIconHandle>(null);
  const cartRef = useRef<CartIconHandle>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState<StockFilter>('ทั้งหมด');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [catalogStockItemsByBranch, setCatalogStockItemsByBranch] = useState<
    Record<string, StockItem[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteTargetKey, setDeleteTargetKey] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<StockCartItem[]>([]);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isCartSuccessVisible, setIsCartSuccessVisible] = useState(false);
  const queryClient = useQueryClient();
  const canOrder = allowOrdering && stockCategory === 'drink_equipment';
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
        error instanceof Error
          ? error.message
          : 'ส่งคำขออุปกรณ์เครื่องดื่มไม่สำเร็จ',
      ),
  });
  useAutoRetry(loadError, () => setReloadKey((key) => key + 1));
  const filterItems = (items: StockItem[]) =>
    items.filter(
      (item) =>
        item.name.includes(deferredQuery) &&
        (filter === 'ทั้งหมด' ||
          (filter === 'ใกล้หมด' && item.status === 'วัตถุดิบใกล้หมด') ||
          (filter === 'หมด' && item.status === 'วัตถุดิบหมด') ||
          (filter === 'ค้างสต๊อก' && item.status === 'วัตถุดิบค้างสต๊อก')),
    );
  const availableBranchNames = useMemo(
    () => branchOptions.filter((branch) => branch !== 'ทุกสาขา'),
    [branchOptions],
  );
  const displayedBranches =
    activeBranch === 'ทุกสาขา' ? availableBranchNames : [activeBranch];
  const drawerTitle = editingItem ? `แก้ไข${stockLabel}` : `เพิ่ม${stockLabel}`;
  const imageSource = imagePreviewUrl ?? editingItem?.imageUrl ?? null;

  useEffect(
    () => () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    },
    [imagePreviewUrl],
  );
  useEffect(() => {
    let active = true;
    const loadingStartedAt = performance.now();
    setIsLoading(true);
    setLoadError(false);
    const branchNames =
      activeBranch === 'ทุกสาขา' ? availableBranchNames : [activeBranch];
    void Promise.all(
      branchNames.map(async (branch) => {
        const items = await listInventory(
          'stock',
          branchCodes[branch],
          stockCategory,
        );
        return [
          branch,
          items.map((item, index) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            reorderLevel: item.reorderLevel,
            unitCost: item.unitCost,
            status: (item.status === 'out'
              ? 'วัตถุดิบหมด'
              : item.status === 'low'
                ? 'วัตถุดิบใกล้หมด'
                : 'พร้อมใช้') as IngredientStatus,
            position: `${12 + ((index * 21) % 76)}% ${24 + ((index * 17) % 64)}%`,
            imageUrl: item.imageUrl,
          })),
        ] as const;
      }),
    )
      .then((entries) => {
        if (active)
          setCatalogStockItemsByBranch(
            Object.fromEntries(entries) as Record<string, StockItem[]>,
          );
      })
      .catch(() => {
        if (active) {
          setCatalogStockItemsByBranch({});
          setLoadError(true);
        }
      })
      .finally(() => {
        const remainingSkeletonTime = Math.max(
          0,
          180 - (performance.now() - loadingStartedAt),
        );
        window.setTimeout(() => {
          if (active) setIsLoading(false);
        }, remainingSkeletonTime);
      });
    return () => {
      active = false;
    };
  }, [
    activeBranch,
    availableBranchNames,
    branchCodes,
    reloadKey,
    stockCategory,
  ]);
  const openAdd = () => {
    setEditingItem(null);
    setImagePreviewUrl(null);
    setDrawerOpen(true);
  };
  const openEdit = (item: StockItem) => {
    setEditingItem(item);
    setImagePreviewUrl(null);
    setDrawerOpen(true);
  };
  const cartQuantity = cartItems.reduce(
    (total, item) => total + item.quantityToOrder,
    0,
  );
  const addToCart = (item: StockItem, key: string) => {
    setCartError(null);
    setCartItems((items) => {
      const existing = items.find((cartItem) => cartItem.key === key);
      if (existing)
        return items.map((cartItem) =>
          cartItem.key === key
            ? { ...cartItem, quantityToOrder: cartItem.quantityToOrder + 1 }
            : cartItem,
        );
      return [...items, { ...item, key, quantityToOrder: 1 }];
    });
    requestAnimationFrame(() => cartRef.current?.startAnimation());
  };
  const updateCartQuantity = (key: string, quantityToOrder: number) =>
    setCartItems((items) =>
      quantityToOrder < 1
        ? items.filter((item) => item.key !== key)
        : items.map((item) =>
            item.key === key ? { ...item, quantityToOrder } : item,
          ),
    );

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
        <TextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => searchRef.current?.startAnimation()}
          onBlur={() => searchRef.current?.stopAnimation()}
          placeholder={`ค้นหา${stockLabel}`}
          size="small"
          sx={{
            width: { xs: '100%', lg: 310 },
            '& .MuiOutlinedInput-root': { borderRadius: '12px' },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon ref={searchRef} size={18} />
                </InputAdornment>
              ),
            },
          }}
        />
        {canOrder ? (
          <Button
            aria-label="ตะกร้าอุปกรณ์เครื่องดื่ม"
            onClick={() => setCartOpen(true)}
            onMouseEnter={() => cartRef.current?.startAnimation()}
            onMouseLeave={() => cartRef.current?.stopAnimation()}
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
            <CartIcon ref={cartRef} size={20} />
            <Box component="span" sx={{ ml: 0.75 }}>
              ตะกร้าสั่งอุปกรณ์
            </Box>
          </Button>
        ) : null}
        {!readOnly ? (
          <Button
            variant="contained"
            startIcon={<PlusIcon ref={plusRef} size={16} />}
            onClick={openAdd}
            onMouseEnter={() => plusRef.current?.startAnimation()}
            onMouseLeave={() => plusRef.current?.stopAnimation()}
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
            เพิ่ม{stockLabel}
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
          const filteredItems = filterItems(
            catalogStockItemsByBranch[branch] ?? [],
          );
          return (
            <Box
              key={branch}
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
              {isLoading ? (
                <StockSkeleton readOnly={readOnly} />
              ) : (
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
                  {filteredItems.map((item) => {
                    const badge = INGREDIENT_STATUS_BADGES[item.status];
                    const itemKey = `${branch}-${item.name}`;
                    return (
                      <Card
                        key={itemKey}
                        variant="outlined"
                        sx={{
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          borderRadius: '15px',
                          borderColor: '#e8ddd5',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'relative',
                            aspectRatio: '1 / 1',
                            bgcolor: '#f1e8de',
                            overflow: 'hidden',
                          }}
                        >
                          <Chip
                            label={item.status}
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              height: 25,
                              borderRadius: '12px',
                              bgcolor: badge.main,
                              color: badge.contrastText,
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 11,
                            }}
                          />
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            p: 2.5,
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 18,
                              fontWeight: 500,
                            }}
                          >
                            {item.name}
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
                                {item.quantity} {item.unit}
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
                                {item.unitCost.toFixed(2)} บาท/{item.unit}
                              </Box>
                            </Typography>
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
                              แจ้งเตือนเมื่อเหลือ
                              <Box
                                component="span"
                                sx={{ fontWeight: 700, lineHeight: 1 }}
                              >
                                {item.reorderLevel} {item.unit}
                              </Box>
                            </Typography>
                          </Box>
                          {canOrder ? (
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
                                onClick={() => addToCart(item, itemKey)}
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
                                สั่งอุปกรณ์
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
                                onClick={() => openEdit(item)}
                                sx={{
                                  flex: 1,
                                  minHeight: 34,
                                  borderRadius: '10px',
                                  bgcolor: '#5f4030',
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 12,
                                  boxShadow: 'none',
                                  '&:hover': {
                                    bgcolor: '#3c2d24',
                                    boxShadow: 'none',
                                  },
                                }}
                              >
                                แก้ไขสต๊อก
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                onClick={() => setDeleteTargetKey(itemKey)}
                                sx={{
                                  flex: 1,
                                  minHeight: 34,
                                  borderRadius: '10px',
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 12,
                                  boxShadow: 'none',
                                  '&:hover': { boxShadow: 'none' },
                                }}
                              >
                                ลบสต๊อก
                              </Button>
                            </Box>
                          ) : null}
                        </Box>
                        {!readOnly && deleteTargetKey === itemKey && (
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
                              ยืนยันการลบ{stockLabel}?
                            </Typography>
                            <Typography
                              sx={{
                                color: 'rgba(255,255,255,.75)',
                                fontFamily: 'Kanit, sans-serif',
                                fontSize: 13,
                              }}
                            >
                              รายการนี้จะถูกลบออกจาก{stockLabel}
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
                                onClick={() => setDeleteTargetKey(null)}
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
              )}
            </Box>
          );
        })}
      </Box>
      {Object.values(catalogStockItemsByBranch).every(
        (items) => filterItems(items).length === 0,
      ) && (
        <Typography
          sx={{
            pt: 4,
            textAlign: 'center',
            color: 'text.secondary',
            fontFamily: 'Kanit, sans-serif',
          }}
        >
          ไม่พบรายการสต๊อกที่ค้นหา
        </Typography>
      )}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        transitionDuration={{ enter: 360, exit: 280 }}
        sx={{ zIndex: 1300 }}
        slotProps={{
          paper: {
            sx: {
              left: { md: '280px' },
              width: { md: 'calc(100% - 304px)' },
              height: { xs: '88dvh', sm: 'calc(100dvh - 72px)' },
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
              onClick={() => setDrawerOpen(false)}
              onMouseEnter={() => closeRef.current?.startAnimation()}
              onMouseLeave={() => closeRef.current?.stopAnimation()}
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
                ref={closeRef}
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
            {editingItem
              ? `แก้ไขข้อมูล${stockLabel}`
              : `กรอกข้อมูลเพื่อเพิ่ม${stockLabel}ใหม่`}
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
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                setDrawerOpen(false);
              }}
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
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  aspectRatio: '1 / 1',
                  p: 2,
                  overflow: 'hidden',
                  border: '1.5px dashed #c9b6a9',
                  borderRadius: '16px',
                  bgcolor: '#f7eee8',
                  color: '#5f4b3d',
                  cursor: 'pointer',
                  transition:
                    'background-color .2s ease, border-color .2s ease',
                  '&:hover': { bgcolor: '#f1e4da', borderColor: '#805637' },
                }}
              >
                {imageSource ? (
                  <Box
                    component="img"
                    src={imageSource}
                    alt="ตัวอย่างรูปสต๊อก"
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <>
                    <Box
                      sx={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 44,
                        height: 44,
                        mb: 1,
                        borderRadius: '50%',
                        bgcolor: '#ead9cd',
                        color: '#5f4030',
                        fontSize: 28,
                        lineHeight: 1,
                      }}
                    >
                      +
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 14,
                        fontWeight: 500,
                        textAlign: 'center',
                      }}
                    >
                      เพิ่มรูป{stockLabel}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.25,
                        color: 'text.secondary',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 11,
                        textAlign: 'center',
                      }}
                    >
                      JPG, PNG ไม่เกิน 5 MB
                    </Typography>
                  </>
                )}
                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setImagePreviewUrl(URL.createObjectURL(file));
                  }}
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
                  label={`ชื่อ${stockLabel}`}
                  placeholder="เช่น แก้วกระดาษ 16 oz"
                  defaultValue={editingItem?.name}
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                />
                <TextField
                  required
                  select
                  fullWidth
                  label="หมวดหมู่"
                  defaultValue=""
                >
                  <MenuItem value="" disabled>
                    เลือกหมวดหมู่
                  </MenuItem>
                  <MenuItem value="cup">แก้วและบรรจุภัณฑ์</MenuItem>
                  <MenuItem value="delivery">อุปกรณ์จัดส่ง</MenuItem>
                  <MenuItem value="store">อุปกรณ์หน้าร้าน</MenuItem>
                  <MenuItem value="other">อื่น ๆ</MenuItem>
                </TextField>
                <TextField
                  fullWidth
                  label="จำนวนคงเหลือ"
                  type="number"
                  defaultValue={editingItem?.quantity}
                  slotProps={{ htmlInput: { min: 0 } }}
                />
                <TextField
                  required
                  select
                  fullWidth
                  label="หน่วย"
                  defaultValue="piece"
                >
                  <MenuItem value="piece">ชิ้น</MenuItem>
                  <MenuItem value="cup">ใบ</MenuItem>
                  <MenuItem value="box">กล่อง</MenuItem>
                  <MenuItem value="pack">ห่อ</MenuItem>
                </TextField>
                <TextField
                  fullWidth
                  label="แจ้งเตือนเมื่อคงเหลือ"
                  type="number"
                  slotProps={{ htmlInput: { min: 0 } }}
                />
                <TextField
                  fullWidth
                  label="หมายเหตุ"
                  placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                />
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
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                      minHeight: 40,
                      borderRadius: '12px',
                      color: '#5f4b3d',
                      fontFamily: 'Kanit, sans-serif',
                    }}
                  >
                    {editingItem ? 'ยกเลิกแก้ไข' : 'ยกเลิกเพิ่ม'}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    sx={{
                      minHeight: 40,
                      borderRadius: '12px',
                      bgcolor: '#201914',
                      fontFamily: 'Kanit, sans-serif',
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
                    }}
                  >
                    {editingItem ? 'บันทึกการแก้ไข' : 'บันทึกสต๊อก'}
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
              height: { xs: '88dvh', sm: 'min(82dvh, 720px)' },
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
            <Box>
              <Typography
                sx={{
                  color: '#201914',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                ตะกร้าอุปกรณ์เครื่องดื่ม
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
              aria-label="ปิดตะกร้าอุปกรณ์เครื่องดื่ม"
              onClick={() => setCartOpen(false)}
              onMouseEnter={() => cartCloseRef.current?.startAnimation()}
              onMouseLeave={() => cartCloseRef.current?.stopAnimation()}
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
              <XIcon ref={cartCloseRef} size={20} />
            </Button>
          </Box>
          <Divider
            sx={{
              mt: 2.25,
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
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 1.25,
                    alignItems: 'center',
                    p: 1.25,
                    border: '1px solid #e8ddd5',
                    borderRadius: '12px',
                    bgcolor: '#fff',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
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
                        minWidth: 36,
                        width: 36,
                        height: 36,
                        p: 0,
                        borderRadius: '9px',
                        color: '#5f4b3d',
                        border: '1px solid #d8c8bd',
                      }}
                    >
                      −
                    </Button>
                    <Typography
                      sx={{
                        minWidth: 26,
                        textAlign: 'center',
                        fontFamily: 'Kanit, sans-serif',
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
                        minWidth: 36,
                        width: 36,
                        height: 36,
                        p: 0,
                        borderRadius: '9px',
                        color: '#5f4b3d',
                        border: '1px solid #d8c8bd',
                      }}
                    >
                      +
                    </Button>
                    <Button
                      aria-label={`ลบ ${item.name} ออกจากตะกร้า`}
                      onClick={() => updateCartQuantity(item.key, 0)}
                      sx={{
                        minWidth: 36,
                        width: 36,
                        height: 36,
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
                  เลือกอุปกรณ์จาก card เพื่อเพิ่มลงตะกร้า
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
                  note: 'คำขออุปกรณ์เครื่องดื่มจาก Franchise',
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
              {createRequest.isPending ? 'กำลังส่งคำขอ…' : 'ยืนยันสั่งอุปกรณ์'}
            </Button>
          </Box>
        </Box>
      </Drawer>
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
          sx={{ fontFamily: 'Kanit, sans-serif', fontWeight: 500 }}
        >
          ส่งคำขออุปกรณ์เครื่องดื่มแล้ว
        </Alert>
      </Snackbar>
    </DashboardMain>
  );
}
