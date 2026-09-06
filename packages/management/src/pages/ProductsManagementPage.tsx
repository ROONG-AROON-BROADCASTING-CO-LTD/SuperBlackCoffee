import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Drawer,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  DashboardMain,
  PlusIcon,
  SearchIcon,
  XIcon,
  type PlusIconHandle,
  type SearchIconHandle,
  type XIconHandle,
} from '@stackbuild/ui';
import {
  branchCodeByBranch,
  branches,
  type Branch,
} from '../components/sidebar/BranchesSidebar';
import { ProductsSkeleton } from '../components/skeletons/ProductsSkeleton';
import { DataLoadNotice } from '../components/DataLoadNotice';
import { useAutoRetry } from '../hooks/useAutoRetry';
import { listInventory } from '../api/inventory';
import { listMenuItems } from '../api/menu';
import coffeeMenuDefaultImage from '../assets/coffee.svg';

type ProductIngredient = { name: string; quantity: string };
type Product = {
  name: string;
  storePrice: number;
  storePriceAvailable: boolean;
  lineManPrice: number;
  lineManPriceAvailable: boolean;
  lineManCostPrice: number;
  costPrice: number;
  category: string;
  status: 'พร้อมขาย' | 'หมดชั่วคราว';
  position: string;
  ingredients: ProductIngredient[];
  imageUrl: string;
};
const filters = [
  'ทั้งหมด',
  'เมนูร้อน',
  'เมนูกาแฟเย็น',
  'เมนูชา',
  'โซดา',
  'เมนูปั่น',
  'เมนูอโวคาโด',
  'เมนูชาร้อน',
  'อาหาร',
  'เบเกอรี่',
] as const;
type ProductFilter = (typeof filters)[number];

const filtersForPlan = (plan?: 'S' | 'M' | 'L') =>
  filters.filter(
    (filter) =>
      plan === 'L' ||
      plan === undefined ||
      (plan === 'M' && filter !== 'เบเกอรี่') ||
      (plan === 'S' && filter !== 'อาหาร' && filter !== 'เบเกอรี่'),
  );

const isCoffeeMenu = (category: string) =>
  category === 'เมนูร้อน' || category === 'เมนูกาแฟเย็น';
const menuImageFallback = (product: Pick<Product, 'category'>) =>
  isCoffeeMenu(product.category) ? coffeeMenuDefaultImage : undefined;

const normalizeMenuCategory = (category: string, name: string) => {
  const normalizedName = name.toLocaleLowerCase('th-TH');
  const knownCategories = new Set([
    'เมนูร้อน',
    'เมนูกาแฟเย็น',
    'เมนูชา',
    'โซดา',
    'เมนูปั่น',
    'เมนูอโวคาโด',
    'เมนูชาร้อน',
    'อาหาร',
    'เบเกอรี่',
  ]);
  if (knownCategories.has(category)) return category;
  if (normalizedName.includes('อโวคาโด')) return 'เมนูอโวคาโด';
  if (normalizedName.includes('ปั่น')) return 'เมนูปั่น';
  if (
    normalizedName.includes('โซดา') ||
    ['บลูเบอร์รี่น้ำผึ้งมะนาว', 'เลม่อนผสมน้ำผึ้ง'].includes(name)
  )
    return 'โซดา';
  if (
    normalizedName.includes('ร้อน') &&
    ['ชา', 'มัทฉะ', 'มัฉฉะ', 'โกโก้', 'นมสด'].some((keyword) =>
      normalizedName.includes(keyword),
    )
  )
    return 'เมนูชาร้อน';
  if (normalizedName.includes('ร้อน')) return 'เมนูร้อน';
  if (
    !normalizedName.includes('cocoa') &&
    !normalizedName.includes('โกโก้') &&
    [
      'กาแฟ',
      'อเมริกาโน่',
      'เอสเปรสโซ่',
      'คาปูชิโน่',
      'คาราเมลมัคคีอาโต้',
      'ลาเต้',
      'มอคค่า',
      'แอโร',
      'ซุปเปอร์แบล็ค',
      'ซุปเปอร์เเบล็ค',
      'super black',
    ].some((keyword) => normalizedName.includes(keyword))
  )
    return 'เมนูกาแฟเย็น';
  if (
    category === 'ชาและมัทฉะ' ||
    [
      'ชา',
      'มัทฉะ',
      'มัฉฉะ',
      'โกโก้',
      'ช็อกโก',
      'ช็อกกาแลต',
      'cocoa',
      'นมสด',
      'นมชมพู',
    ].some((keyword) => normalizedName.includes(keyword))
  )
    return 'เมนูชา';
  return category;
};

export function ProductsManagementPage({
  activeBranch,
  franchisePlan,
  readOnly = false,
}: {
  activeBranch: Branch;
  franchisePlan?: 'S' | 'M' | 'L';
  readOnly?: boolean;
}) {
  const plusRef = useRef<PlusIconHandle>(null);
  const searchRef = useRef<SearchIconHandle>(null);
  const closeRef = useRef<XIconHandle>(null);
  const branchSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState<ProductFilter>('ทั้งหมด');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useAutoRetry(loadError, () => setReloadKey((key) => key + 1));
  const [availableIngredients, setAvailableIngredients] = useState<string[]>(
    [],
  );
  const [productIngredients, setProductIngredients] = useState<
    ProductIngredient[]
  >([{ name: '', quantity: '' }]);
  const [visibleBranches, setVisibleBranches] = useState<Set<string>>(
    () => new Set(),
  );
  const [loadedBranches, setLoadedBranches] = useState<Set<string>>(
    () => new Set(),
  );
  const matches = useMemo(
    () =>
      catalogProducts.filter(
        (item) =>
          item.name.includes(deferredQuery) &&
          (filter === 'ทั้งหมด' || item.category === filter) &&
          (franchisePlan === 'L' ||
            franchisePlan === undefined ||
            (franchisePlan === 'M' && item.category !== 'เบเกอรี่') ||
            (franchisePlan === 'S' &&
              item.category !== 'อาหาร' &&
              item.category !== 'เบเกอรี่')),
      ),
    [catalogProducts, deferredQuery, filter, franchisePlan],
  );

  useEffect(() => {
    if (!filtersForPlan(franchisePlan).includes(filter)) setFilter('ทั้งหมด');
  }, [filter, franchisePlan]);
  const displayedBranches =
    activeBranch === 'ทุกสาขา' ? branches.slice(1) : [activeBranch];
  const openAdd = () => {
    setEditing(null);
    setPreview(null);
    setProductIngredients([{ name: '', quantity: '' }]);
    setDrawerOpen(true);
  };
  const openEdit = (item: Product) => {
    setEditing(item);
    setPreview(null);
    setProductIngredients(item.ingredients);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (activeBranch !== 'ทุกสาขา') {
      setVisibleBranches(new Set([activeBranch]));
      setLoadedBranches(new Set([activeBranch]));
      return undefined;
    }
    setVisibleBranches(new Set());
    setLoadedBranches(new Set());
    const timers = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const branch = entry.target.getAttribute('data-branch');
          if (!branch) return;
          setVisibleBranches((current) =>
            current.has(branch) ? current : new Set(current).add(branch),
          );
          if (!timers.has(branch))
            timers.set(
              branch,
              window.setTimeout(
                () =>
                  setLoadedBranches((current) =>
                    current.has(branch)
                      ? current
                      : new Set(current).add(branch),
                  ),
                220,
              ),
            );
        }),
      { rootMargin: '0px' },
    );
    Object.values(branchSectionRefs.current).forEach(
      (section) => section && observer.observe(section),
    );
    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activeBranch]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(false);
    const branchCodes =
      activeBranch === 'ทุกสาขา'
        ? branches
            .slice(1)
            .map(
              (branch) =>
                branchCodeByBranch[branch as Exclude<Branch, 'ทุกสาขา'>],
            )
        : [branchCodeByBranch[activeBranch as Exclude<Branch, 'ทุกสาขา'>]];
    Promise.allSettled([
      Promise.all(branchCodes.map((branchCode) => listMenuItems(branchCode))),
      Promise.all(
        branchCodes.map((branchCode) =>
          listInventory('ingredient', branchCode),
        ),
      ),
      Promise.all(
        branchCodes.map((branchCode) => listInventory('stock', branchCode)),
      ),
    ])
      .then(([itemsResult, ingredientsResult, stockResult]) => {
        if (!active) return;
        if (
          itemsResult.status === 'rejected' ||
          ingredientsResult.status === 'rejected' ||
          stockResult.status === 'rejected'
        ) {
          setLoadError(true);
        }
        const items =
          itemsResult.status === 'fulfilled' ? itemsResult.value : [];
        const ingredients =
          ingredientsResult.status === 'fulfilled'
            ? ingredientsResult.value
            : [];
        const stock =
          stockResult.status === 'fulfilled' ? stockResult.value : [];
        setAvailableIngredients(
          [...ingredients.flat(), ...stock.flat()].map((item) => item.name),
        );
        const uniqueItems = Array.from(
          new Map(items.flat().map((item) => [item.id, item])).values(),
        );
        setCatalogProducts(
          uniqueItems.map((item, index) => ({
            name: item.name,
            storePrice: item.storePrice,
            storePriceAvailable: item.storePriceAvailable,
            lineManPrice: item.linemanPrice,
            lineManPriceAvailable: item.linemanPriceAvailable,
            lineManCostPrice: item.linemanCostPrice ?? item.costPrice,
            costPrice: item.costPrice,
            category: normalizeMenuCategory(item.category, item.name),
            status: item.status === 'soldout' ? 'หมดชั่วคราว' : 'พร้อมขาย',
            position: `${12 + ((index * 21) % 76)}% ${24 + ((index * 17) % 64)}%`,
            imageUrl: item.imageUrl,
            ingredients: (item.ingredients ?? []).map((ingredient) => ({
              name: ingredient.name,
              quantity: `${ingredient.quantity} ${ingredient.unit}`,
            })),
          })),
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeBranch, reloadKey]);

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
          placeholder="ค้นหาเมนูและสินค้า"
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
            เพิ่มเมนูและสินค้า
          </Button>
        ) : null}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {filtersForPlan(franchisePlan).map((item) => (
          <Button
            key={item}
            onClick={() => setFilter(item)}
            size="small"
            variant={filter === item ? 'contained' : 'outlined'}
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
      {loadError ? (
        <DataLoadNotice message="โหลดข้อมูลบางส่วนไม่สำเร็จ" />
      ) : null}
      <Box sx={{ display: loadError ? 'none' : 'grid', gap: 4 }}>
        {displayedBranches.map((branch, index) => {
          const visible =
            activeBranch !== 'ทุกสาขา' || visibleBranches.has(branch);
          const loaded =
            activeBranch !== 'ทุกสาขา' || loadedBranches.has(branch);
          return (
            <Box
              key={branch}
              ref={(node: HTMLDivElement | null) => {
                branchSectionRefs.current[branch] = node;
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
              {!visible ? (
                <Box sx={{ minHeight: 420 }} />
              ) : isLoading || !loaded ? (
                <ProductsSkeleton />
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
                  {matches.map((item, itemIndex) => {
                    const productKey = `${branch}-${item.name}-${itemIndex}`;
                    const imageSource =
                      item.imageUrl || menuImageFallback(item);
                    const isDefaultCoffeeImage =
                      !item.imageUrl && isCoffeeMenu(item.category);
                    return (
                      <Card
                        key={productKey}
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
                          {imageSource && (
                            <Box
                              component="img"
                              src={imageSource}
                              alt={item.name}
                              loading="lazy"
                              decoding="async"
                              onError={(event) => {
                                const fallback = menuImageFallback(item);
                                if (fallback)
                                  (
                                    event.currentTarget as HTMLImageElement
                                  ).src = fallback;
                                else event.currentTarget.remove();
                              }}
                              sx={{
                                display: 'block',
                                boxSizing: 'border-box',
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: isDefaultCoffeeImage
                                  ? 'contain'
                                  : 'cover',
                                objectPosition: item.position,
                                p: isDefaultCoffeeImage ? { xs: 8, md: 10 } : 0,
                              }}
                            />
                          )}
                          <Chip
                            label={item.status}
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              height: 25,
                              borderRadius: '12px',
                              bgcolor:
                                item.status === 'พร้อมขาย'
                                  ? '#177245'
                                  : '#805637',
                              color: '#fff',
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
                          <Typography
                            sx={{
                              mt: 0.6,
                              color: 'text.secondary',
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 13,
                            }}
                          >
                            {item.category}
                          </Typography>
                          <Box
                            sx={{
                              display: 'grid',
                              gap: 0.35,
                              mt: 0.8,
                            }}
                          >
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
                              ราคาต้นทุนหน้าร้าน
                              <Box
                                component="span"
                                sx={{
                                  fontSize: 18,
                                  fontWeight: 700,
                                  lineHeight: 1,
                                }}
                              >
                                {item.costPrice} บาท
                              </Box>
                            </Typography>
                            <Typography
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: 1,
                                py: 0.45,
                                borderRadius: '8px',
                                color: '#06C755',
                                fontFamily: 'Kanit, sans-serif',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              ราคาต้นทุน LINE MAN
                              <Box
                                component="span"
                                sx={{
                                  fontSize: 18,
                                  fontWeight: 700,
                                  lineHeight: 1,
                                }}
                              >
                                {item.lineManCostPrice} บาท
                              </Box>
                            </Typography>
                            <Box
                              aria-hidden="true"
                              sx={{
                                mx: 1,
                                my: 0.45,
                                borderTop: '1px solid rgba(95, 64, 48, 0.16)',
                              }}
                            />
                            <Typography
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: 1,
                                py: 0.45,
                                borderRadius: '8px',
                                color: '#805637',
                                fontFamily: 'Kanit, sans-serif',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              ราคาหน้าร้าน
                              <Box
                                component="span"
                                sx={{
                                  fontSize: 20,
                                  fontWeight: 700,
                                  lineHeight: 1,
                                }}
                              >
                                {item.storePriceAvailable
                                  ? `${item.storePrice} บาท`
                                  : '-'}
                              </Box>
                            </Typography>
                            <Typography
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: 1,
                                py: 0.45,
                                borderRadius: '8px',
                                color: '#06C755',
                                fontFamily: 'Kanit, sans-serif',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              ราคา LINE MAN
                              <Box
                                component="span"
                                sx={{
                                  fontSize: 20,
                                  fontWeight: 700,
                                  lineHeight: 1,
                                }}
                              >
                                {item.lineManPriceAvailable
                                  ? `${item.lineManPrice} บาท`
                                  : '-'}
                              </Box>
                            </Typography>
                          </Box>
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
                                แก้ไขสินค้า
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                onClick={() => setDeleting(productKey)}
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
                                ลบสินค้า
                              </Button>
                            </Box>
                          ) : null}
                        </Box>
                        {!readOnly && deleting === productKey && (
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
                              bgcolor: 'rgba(32,25,20,.94)',
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
                              ยืนยันการลบสินค้า?
                            </Typography>
                            <Typography
                              sx={{
                                color: 'rgba(255,255,255,.75)',
                                fontFamily: 'Kanit, sans-serif',
                                fontSize: 13,
                              }}
                            >
                              รายการนี้จะถูกลบออกจากเมนู
                            </Typography>
                            <Box
                              sx={{ display: 'flex', width: '100%', gap: 1 }}
                            >
                              <Button
                                fullWidth
                                onClick={() => setDeleting(null)}
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
                                onClick={() => setDeleting(null)}
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
      {matches.length === 0 && (
        <Typography
          sx={{
            pt: 4,
            textAlign: 'center',
            color: 'text.secondary',
            fontFamily: 'Kanit, sans-serif',
          }}
        >
          ไม่พบเมนูหรือสินค้าที่ค้นหา
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
              height: { xs: '82vh', sm: 'min(82vh, 720px)' },
              overflow: 'hidden',
              borderRadius: '24px 24px 0 0',
              bgcolor: '#fffaf7',
              boxShadow: '0 -12px 32px rgba(50,35,25,.18)',
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
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Kanit, sans-serif',
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {editing ? 'แก้ไขเมนูและสินค้า' : 'เพิ่มเมนูและสินค้า'}
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
              <XIcon ref={closeRef} size={20} />
            </Button>
          </Box>
          <Typography
            sx={{
              mt: 0.5,
              color: 'text.secondary',
              fontFamily: 'Kanit, sans-serif',
            }}
          >
            {editing
              ? 'แก้ไขข้อมูลสินค้าในเมนู'
              : 'กรอกข้อมูลเพื่อเพิ่มสินค้าใหม่'}
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
                  alignItems: 'center',
                  justifyContent: 'center',
                  aspectRatio: '1 / 1',
                  overflow: 'hidden',
                  border: '1.5px dashed #c9b6a9',
                  borderRadius: '16px',
                  bgcolor: '#f7eee8',
                  cursor: 'pointer',
                }}
              >
                {preview ||
                editing?.imageUrl ||
                (editing && isCoffeeMenu(editing.category)) ? (
                  <Box
                    component="img"
                    src={
                      preview ??
                      editing?.imageUrl ??
                      (editing ? menuImageFallback(editing) : undefined)
                    }
                    alt="ตัวอย่างรูปสินค้า"
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <Typography sx={{ fontFamily: 'Kanit, sans-serif' }}>
                    + เพิ่มรูปสินค้า
                  </Typography>
                )}
                {editing && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 1,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'rgba(32, 25, 20, .42)',
                      color: '#fff',
                      fontFamily: 'Kanit, sans-serif',
                    }}
                  >
                    เปลี่ยนรูปสินค้า
                  </Box>
                )}
                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setPreview(URL.createObjectURL(file));
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
                  label="ชื่อสินค้า"
                  defaultValue={editing?.name}
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                />
                <TextField
                  required
                  select
                  fullWidth
                  label="หมวดหมู่"
                  defaultValue="เมนูร้อน"
                >
                  <MenuItem value="เมนูร้อน">เมนูร้อน</MenuItem>
                  <MenuItem value="เมนูกาแฟเย็น">เมนูกาแฟเย็น</MenuItem>
                  <MenuItem value="เมนูชา">เมนูชา</MenuItem>
                  <MenuItem value="โซดา">โซดา</MenuItem>
                  <MenuItem value="เมนูปั่น">เมนูปั่น</MenuItem>
                  <MenuItem value="เมนูอโวคาโด">เมนูอโวคาโด</MenuItem>
                  <MenuItem value="เมนูชาร้อน">เมนูชาร้อน</MenuItem>
                  <MenuItem value="อาหาร">อาหาร</MenuItem>
                  <MenuItem value="เบเกอรี่">เบเกอรี่</MenuItem>
                </TextField>
                <TextField
                  required
                  fullWidth
                  label="ราคาหน้าร้าน"
                  type="number"
                  defaultValue={editing?.storePrice}
                />
                <TextField
                  required
                  fullWidth
                  label="ราคา LINE MAN"
                  type="number"
                  defaultValue={editing?.lineManPrice}
                />
                <TextField
                  required
                  fullWidth
                  label="ราคาต้นทุน LINE MAN"
                  type="number"
                  defaultValue={editing?.lineManCostPrice}
                  helperText="อ้างอิงต้นทุนจากสูตร LINE MAN"
                />
                <TextField
                  required
                  fullWidth
                  label="ราคาต้นทุนหน้าร้าน"
                  type="number"
                  defaultValue={editing?.costPrice}
                  helperText="ใช้คำนวณกำไร/ขาดทุนสำหรับหน้าร้าน"
                />
                <TextField
                  required
                  select
                  fullWidth
                  label="สถานะ"
                  defaultValue="available"
                >
                  <MenuItem value="available">พร้อมขาย</MenuItem>
                  <MenuItem value="soldout">หมดชั่วคราว</MenuItem>
                </TextField>
                <Box
                  sx={{
                    gridColumn: { sm: '1 / -1' },
                    p: 2,
                    border: '1px solid #e8ddd5',
                    borderRadius: '12px',
                    bgcolor: '#fff',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          color: '#3c2d24',
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        วัตถุดิบและส่วนผสม
                      </Typography>
                      <Typography
                        sx={{
                          color: 'text.secondary',
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 11,
                        }}
                      >
                        ระบุวัตถุดิบที่ใช้ต่อ 1 เมนู
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      onClick={() =>
                        setProductIngredients((items) => [
                          ...items,
                          { name: '', quantity: '' },
                        ])
                      }
                      sx={{
                        minHeight: 34,
                        borderRadius: '10px',
                        color: '#805637',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      + เพิ่มส่วนผสม
                    </Button>
                  </Box>
                  <Box sx={{ display: 'grid', gap: 2 }}>
                    {productIngredients.map((ingredient, index) => (
                      <Box
                        key={`${ingredient.name}-${index}`}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns:
                            'minmax(0, 1fr) minmax(110px, .55fr) 40px',
                          gap: 2,
                          alignItems: 'center',
                        }}
                      >
                        <TextField
                          select
                          value={ingredient.name}
                          onChange={(event) =>
                            setProductIngredients((items) =>
                              items.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, name: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          placeholder="เลือกวัตถุดิบ"
                          slotProps={{
                            select: {
                              displayEmpty: true,
                              renderValue: (value) =>
                                typeof value === 'string' && value
                                  ? value
                                  : 'เลือกวัตถุดิบ',
                            },
                          }}
                        >
                          <MenuItem value="" disabled>
                            เลือกวัตถุดิบ
                          </MenuItem>
                          {availableIngredients.map((name) => (
                            <MenuItem key={name} value={name}>
                              {name}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          value={ingredient.quantity}
                          onChange={(event) =>
                            setProductIngredients((items) =>
                              items.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, quantity: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          placeholder="ปริมาณ"
                        />
                        <Button
                          aria-label="ลบส่วนผสม"
                          disabled={productIngredients.length === 1}
                          onClick={() =>
                            setProductIngredients((items) =>
                              items.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                          sx={{
                            minWidth: 40,
                            width: 40,
                            height: 40,
                            p: 0,
                            borderRadius: '10px',
                            bgcolor: '#fff0ee',
                            color: '#b42318',
                            '&:hover': { bgcolor: '#fbded9' },
                          }}
                        >
                          <XIcon size={18} />
                        </Button>
                      </Box>
                    ))}
                  </Box>
                </Box>
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
                    {editing ? 'ยกเลิกแก้ไข' : 'ยกเลิกเพิ่ม'}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    sx={{
                      minHeight: 40,
                      borderRadius: '12px',
                      bgcolor: '#201914',
                      fontFamily: 'Kanit, sans-serif',
                    }}
                  >
                    {editing ? 'บันทึกการแก้ไข' : 'บันทึกสินค้า'}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </DashboardMain>
  );
}
