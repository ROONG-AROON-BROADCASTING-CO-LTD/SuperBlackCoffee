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
  ActionSnackbar,
  type ActionNotice,
} from '../components/ActionSnackbar';
import {
  branchCodeByBranch,
  branches,
  type BranchCodeMap,
} from '../components/sidebar/BranchesSidebar';
import { ProductsSkeleton } from '../components/skeletons/ProductsSkeleton';
import { DataLoadNotice } from '../components/DataLoadNotice';
import { useAutoRetry } from '../hooks/useAutoRetry';
import { listInventory, type InventoryItem } from '../api/inventory';
import {
  createMenuItem,
  listMenuItems,
  updateMenuItem,
  type MenuItem as ApiMenuItem,
} from '../api/menu';

type ProductIngredient = {
  inventoryItemId: number;
  name: string;
  quantity: number;
  unit: string;
};
type ProductIngredientDraft = { name: string; quantity: string };
type RecipeIngredientDraft = {
  inventoryItemId: number | '';
  quantity: number | '';
  unit: string;
};
type IngredientOption = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  branchCode: string;
};
type ProductAvailability =
  'พร้อมขาย' | 'หมดชั่วคราว' | 'ต้องเพิ่มสูตร' | 'วัตถุดิบไม่พอ';
type Product = {
  id: number;
  branchCode: string;
  name: string;
  storePrice: number;
  storePriceAvailable: boolean;
  lineManPrice: number;
  lineManPriceAvailable: boolean;
  lineManCostPrice: number;
  costPrice: number;
  category: string;
  status: ProductAvailability;
  position: string;
  ingredients: ProductIngredient[];
  imageUrl: string;
  preparationSteps: string;
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
type SalesChannel = 'store' | 'lineman';

const filtersForPlan = (plan?: 'S' | 'M' | 'L') =>
  filters.filter(
    (filter) => plan !== 'S' || (filter !== 'อาหาร' && filter !== 'เบเกอรี่'),
  );

const isCoffeeMenu = (category: string) =>
  category === 'เมนูร้อน' || category === 'เมนูกาแฟเย็น';
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

const availabilityFromMenu = (item: ApiMenuItem): ProductAvailability => {
  if (item.recipeStatus === 'missing_recipe') return 'ต้องเพิ่มสูตร';
  if (item.recipeStatus === 'insufficient_stock') return 'วัตถุดิบไม่พอ';
  return item.status === 'soldout' ? 'หมดชั่วคราว' : 'พร้อมขาย';
};

const recipeAvailabilityFromDraft = (
  ingredients: RecipeIngredientDraft[],
  options: IngredientOption[],
): ProductAvailability => {
  if (ingredients.length === 0) return 'ต้องเพิ่มสูตร';
  const quantitiesByIngredient = new Map<number, number>();
  for (const ingredient of ingredients) {
    if (
      ingredient.inventoryItemId === '' ||
      ingredient.quantity === '' ||
      ingredient.quantity <= 0 ||
      !ingredient.unit.trim()
    )
      return 'ต้องเพิ่มสูตร';
    quantitiesByIngredient.set(
      ingredient.inventoryItemId,
      (quantitiesByIngredient.get(ingredient.inventoryItemId) ?? 0) +
        ingredient.quantity,
    );
  }
  for (const [inventoryItemId, quantity] of quantitiesByIngredient) {
    const option = options.find((item) => item.id === inventoryItemId);
    const recipeIngredient = ingredients.find(
      (item) => item.inventoryItemId === inventoryItemId,
    );
    if (
      !option ||
      !recipeIngredient ||
      option.unit.trim().replace(/\.$/, '').toLowerCase() !==
        recipeIngredient.unit.trim().replace(/\.$/, '').toLowerCase() ||
      option.quantity < quantity
    )
      return 'วัตถุดิบไม่พอ';
  }
  return 'พร้อมขาย';
};

const statusChipColor = (status: ProductAvailability) => {
  if (status === 'พร้อมขาย') return '#177245';
  if (status === 'ต้องเพิ่มสูตร') return '#9a5a10';
  if (status === 'วัตถุดิบไม่พอ') return '#b42318';
  return '#805637';
};

export function ProductsManagementPage({
  activeBranch,
  franchisePlan,
  readOnly = false,
  branchOptions = branches,
  branchCodes = branchCodeByBranch,
}: {
  activeBranch: string;
  franchisePlan?: 'S' | 'M' | 'L';
  readOnly?: boolean;
  branchOptions?: readonly string[];
  branchCodes?: BranchCodeMap;
}) {
  const plusRef = useRef<PlusIconHandle>(null);
  const searchRef = useRef<SearchIconHandle>(null);
  const closeRef = useRef<XIconHandle>(null);
  const branchSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const menuCacheRef = useRef(new Map<string, ApiMenuItem[]>());
  const inventoryCacheRef = useRef(new Map<string, InventoryItem[]>());
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState<ProductFilter>('ทั้งหมด');
  const [salesChannel, setSalesChannel] = useState<SalesChannel>('store');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null);
  const [recipeDraft, setRecipeDraft] = useState<RecipeIngredientDraft[]>([]);
  const [recipeStepsDraft, setRecipeStepsDraft] = useState('');
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useAutoRetry(loadError, () => setReloadKey((key) => key + 1));
  const [availableIngredients, setAvailableIngredients] = useState<
    IngredientOption[]
  >([]);
  const [productIngredients, setProductIngredients] = useState<
    ProductIngredientDraft[]
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
          (franchisePlan !== 'S' ||
            (item.category !== 'อาหาร' && item.category !== 'เบเกอรี่')),
      ),
    [catalogProducts, deferredQuery, filter, franchisePlan],
  );

  useEffect(() => {
    if (!filtersForPlan(franchisePlan).includes(filter)) setFilter('ทั้งหมด');
  }, [filter, franchisePlan]);
  const availableBranchNames = useMemo(
    () => branchOptions.filter((branch) => branch !== 'ทุกสาขา'),
    [branchOptions],
  );
  const displayedBranches =
    activeBranch === 'ทุกสาขา' ? availableBranchNames : [activeBranch];
  const recipeIngredientOptions = recipeProduct
    ? availableIngredients.filter(
        (item) => item.branchCode === recipeProduct.branchCode,
      )
    : [];
  const openAdd = () => {
    setEditing(null);
    setPreview(null);
    setProductIngredients([{ name: '', quantity: '' }]);
    setDrawerOpen(true);
  };
  const openEdit = (item: Product) => {
    setEditing(item);
    setPreview(null);
    setProductIngredients(
      item.ingredients.map((ingredient) => ({
        name: ingredient.name,
        quantity: `${ingredient.quantity} ${ingredient.unit}`,
      })),
    );
    setDrawerOpen(true);
  };
  const openRecipe = (item: Product) => {
    setRecipeProduct(item);
    setRecipeStepsDraft(item.preparationSteps);
    setRecipeDraft(
      item.ingredients.map((ingredient) => ({
        inventoryItemId: ingredient.inventoryItemId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
      })),
    );
  };
  const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const branchCode = editing?.branchCode ?? branchCodes[activeBranch];
    if (!branchCode) {
      setActionNotice({
        message: 'กรุณาเลือกสาขาเดียวก่อนเพิ่มเมนูและสินค้า',
        severity: 'error',
      });
      return;
    }
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const category = String(formData.get('category') ?? '').trim();
    const storePrice = Number(formData.get('storePrice'));
    const lineManPrice = Number(formData.get('lineManPrice'));
    const costPrice = Number(formData.get('costPrice'));
    const lineManCostPrice = Number(formData.get('lineManCostPrice'));
    if (
      !name ||
      !category ||
      [storePrice, lineManPrice, costPrice, lineManCostPrice].some(
        (value) => !Number.isFinite(value) || value < 0,
      )
    ) {
      setActionNotice({
        message: 'กรอกข้อมูลเมนูและราคาให้ครบ',
        severity: 'error',
      });
      return;
    }
    const ingredients = [] as {
      inventoryItemId: number;
      quantity: number;
      unit: string;
    }[];
    for (const ingredient of productIngredients) {
      const value = ingredient.quantity.trim();
      if (!ingredient.name && !value) continue;
      const option = availableIngredients.find(
        (item) =>
          item.branchCode === branchCode && item.name === ingredient.name,
      );
      const [quantityText, ...unitParts] = value.split(/\s+/);
      const quantity = Number(quantityText);
      const unit = unitParts.join(' ').trim() || option?.unit || '';
      if (!option || !Number.isFinite(quantity) || quantity <= 0 || !unit) {
        setActionNotice({
          message: 'กรุณาเลือกวัตถุดิบและระบุปริมาณให้ถูกต้อง',
          severity: 'error',
        });
        return;
      }
      ingredients.push({ inventoryItemId: option.id, quantity, unit });
    }
    setIsSavingProduct(true);
    try {
      const payload = {
        name,
        category,
        storePrice,
        linemanPrice: lineManPrice,
        linemanCostPrice: lineManCostPrice,
        costPrice,
        ingredients,
      };
      if (editing) await updateMenuItem(editing.id, payload, branchCode);
      else await createMenuItem(payload, branchCode);
      menuCacheRef.current.delete(branchCode);
      setDrawerOpen(false);
      setReloadKey((key) => key + 1);
      setActionNotice({
        message:
          ingredients.length === 0
            ? 'บันทึกเมนูร่างแล้ว กรุณาเพิ่มสูตรก่อนเปิดขาย'
            : 'บันทึกเมนูและตรวจสอบความพร้อมแล้ว',
        severity: 'success',
      });
    } catch (error) {
      setActionNotice({
        message:
          error instanceof Error
            ? error.message
            : 'ไม่สามารถบันทึกเมนูและสินค้าได้',
        severity: 'error',
      });
    } finally {
      setIsSavingProduct(false);
    }
  };
  const saveRecipe = async () => {
    if (!recipeProduct || readOnly) return;
    const ingredients = recipeDraft.filter(
      (ingredient) =>
        ingredient.inventoryItemId !== '' &&
        ingredient.quantity !== '' &&
        ingredient.quantity > 0 &&
        ingredient.unit.trim() !== '',
    );
    if (ingredients.length !== recipeDraft.length) {
      setActionNotice({
        message: 'กรุณาเลือกวัตถุดิบ ระบุปริมาณ และหน่วยให้ครบ',
        severity: 'error',
      });
      return;
    }
    setIsSavingRecipe(true);
    try {
      await updateMenuItem(
        recipeProduct.id,
        {
          name: recipeProduct.name,
          category: recipeProduct.category,
          storePrice: recipeProduct.storePrice,
          linemanPrice: recipeProduct.lineManPrice,
          linemanCostPrice: recipeProduct.lineManCostPrice,
          costPrice: recipeProduct.costPrice,
          preparationSteps: recipeStepsDraft.trim(),
          ingredients: ingredients.map((ingredient) => ({
            inventoryItemId: ingredient.inventoryItemId as number,
            quantity: ingredient.quantity as number,
            unit: ingredient.unit.trim(),
          })),
        },
        recipeProduct.branchCode,
      );
      const updatedIngredients = ingredients.map((ingredient) => {
        const option = recipeIngredientOptions.find(
          (item) => item.id === ingredient.inventoryItemId,
        );
        const existingIngredient = recipeProduct.ingredients.find(
          (item) => item.inventoryItemId === ingredient.inventoryItemId,
        );
        return {
          inventoryItemId: ingredient.inventoryItemId as number,
          name: option?.name ?? existingIngredient?.name ?? 'วัตถุดิบ',
          quantity: ingredient.quantity as number,
          unit: ingredient.unit.trim(),
        };
      });
      const nextStatus = recipeAvailabilityFromDraft(
        ingredients,
        recipeIngredientOptions,
      );
      setCatalogProducts((items) =>
        items.map((item) =>
          item.id === recipeProduct.id &&
          item.branchCode === recipeProduct.branchCode
            ? {
                ...item,
                ingredients: updatedIngredients,
                preparationSteps: recipeStepsDraft.trim(),
                status: nextStatus,
              }
            : item,
        ),
      );
      menuCacheRef.current.delete(recipeProduct.branchCode);
      setRecipeProduct(null);
      setActionNotice({
        message:
          nextStatus === 'พร้อมขาย'
            ? 'บันทึกสูตรการทำแล้ว เมนูพร้อมขาย'
            : `บันทึกสูตรการทำแล้ว แต่เมนูยัง${nextStatus}`,
        severity: nextStatus === 'พร้อมขาย' ? 'success' : 'error',
      });
    } catch (error) {
      setActionNotice({
        message:
          error instanceof Error
            ? error.message
            : 'ไม่สามารถบันทึกสูตรการทำได้',
        severity: 'error',
      });
    } finally {
      setIsSavingRecipe(false);
    }
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
  }, [activeBranch, availableBranchNames]);

  useEffect(() => {
    let active = true;
    const refresh = reloadKey > 0;
    setLoadError(false);
    const requestedBranchCodes =
      activeBranch === 'ทุกสาขา'
        ? availableBranchNames.map((branch) => branchCodes[branch])
        : [branchCodes[activeBranch]];
    const validBranchCodes = requestedBranchCodes.filter(
      (branchCode): branchCode is string => Boolean(branchCode),
    );
    const loadMenu = async () => {
      try {
        const items = await Promise.all(
          validBranchCodes.map(async (branchCode) => {
            const cached = refresh
              ? undefined
              : menuCacheRef.current.get(branchCode);
            if (cached) return cached;
            const next = await listMenuItems(branchCode);
            menuCacheRef.current.set(branchCode, next);
            return next;
          }),
        );
        if (!active) return;
        const uniqueItems = Array.from(
          new Map(
            items.flatMap((branchItems, branchIndex) =>
              branchItems.map((item) => [
                `${validBranchCodes[branchIndex]}:${item.id}`,
                { item, branchCode: validBranchCodes[branchIndex] },
              ]),
            ),
          ).values(),
        );
        setCatalogProducts(
          uniqueItems.map(({ item, branchCode }, index) => ({
            id: item.id,
            branchCode,
            name: item.name,
            storePrice: item.storePrice,
            storePriceAvailable: item.storePriceAvailable,
            lineManPrice: item.linemanPrice,
            lineManPriceAvailable: item.linemanPriceAvailable,
            lineManCostPrice: item.linemanCostPrice ?? item.costPrice,
            costPrice: item.costPrice,
            category: normalizeMenuCategory(item.category, item.name),
            status: availabilityFromMenu(item),
            position: `${12 + ((index * 21) % 76)}% ${24 + ((index * 17) % 64)}%`,
            imageUrl: item.imageUrl,
            preparationSteps: item.preparationSteps ?? '',
            ingredients: (item.ingredients ?? []).map((ingredient) => ({
              inventoryItemId: ingredient.inventoryItemId,
              name: ingredient.name,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
            })),
          })),
        );
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    const loadInventoryOptions = async () => {
      if (readOnly) return;
      try {
        const inventory = await Promise.all(
          validBranchCodes.map(async (branchCode) => {
            const cached = refresh
              ? undefined
              : inventoryCacheRef.current.get(branchCode);
            if (cached) return cached;
            const [ingredients, stock] = await Promise.all([
              listInventory('ingredient', branchCode),
              listInventory('stock', branchCode),
            ]);
            const next = [...ingredients, ...stock];
            inventoryCacheRef.current.set(branchCode, next);
            return next;
          }),
        );
        if (active) {
          setAvailableIngredients(
            inventory.flatMap((items, index) =>
              items.map((item) => ({
                id: item.id,
                name: item.name,
                unit: item.unit,
                quantity: item.quantity,
                branchCode: validBranchCodes[index],
              })),
            ),
          );
        }
      } catch {
        if (active) setLoadError(true);
      }
    };

    const cachedMenuIsReady = validBranchCodes.every((branchCode) =>
      menuCacheRef.current.has(branchCode),
    );
    setIsLoading(!cachedMenuIsReady || refresh);
    void loadMenu();
    void loadInventoryOptions();
    return () => {
      active = false;
    };
  }, [activeBranch, availableBranchNames, branchCodes, readOnly, reloadKey]);

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
      <Box
        aria-label="ช่องทางขาย"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          mb: 2.5,
        }}
      >
        <Typography
          sx={{
            mr: 0.5,
            color: 'text.secondary',
            fontFamily: 'Kanit, sans-serif',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          แสดงราคา
        </Typography>
        {(
          [
            ['store', 'หน้าร้าน'],
            ['lineman', 'LINE MAN'],
          ] as const
        ).map(([channel, label]) => {
          const selected = salesChannel === channel;
          return (
            <Button
              key={channel}
              size="small"
              variant={selected ? 'contained' : 'outlined'}
              onClick={() => setSalesChannel(channel)}
              sx={{
                minHeight: 34,
                borderRadius: '12px',
                borderColor: selected ? '#201914' : '#d8c8bd',
                bgcolor: selected ? '#201914' : '#fff',
                color: selected ? '#fff' : '#5f4b3d',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 12,
                fontWeight: 600,
                boxShadow: 'none',
                '&:hover': {
                  borderColor: '#201914',
                  bgcolor: selected ? '#3c2d24' : '#f5eee9',
                  boxShadow: 'none',
                },
              }}
            >
              {label}
            </Button>
          );
        })}
      </Box>
      {loadError ? (
        <DataLoadNotice message="โหลดข้อมูลบางส่วนไม่สำเร็จ" />
      ) : null}
      <Box sx={{ display: loadError ? 'none' : 'grid', gap: 4 }}>
        {displayedBranches.map((branch, index) => {
          const visible =
            activeBranch !== 'ทุกสาขา' ||
            index === 0 ||
            visibleBranches.has(branch);
          const loaded =
            activeBranch !== 'ทุกสาขา' || loadedBranches.has(branch);
          const branchCode = branchCodes[branch];
          const branchMatches =
            activeBranch === 'ทุกสาขา'
              ? matches.filter((item) => item.branchCode === branchCode)
              : matches;
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
                <ProductsSkeleton readOnly={readOnly} />
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
                  {branchMatches.map((item) => {
                    const productKey = `${branch}-${item.id}`;
                    const showingLineman = salesChannel === 'lineman';
                    const channelLabel = showingLineman
                      ? 'LINE MAN'
                      : 'หน้าร้าน';
                    const costPrice = showingLineman
                      ? item.lineManCostPrice
                      : item.costPrice;
                    const salePrice = showingLineman
                      ? item.lineManPrice
                      : item.storePrice;
                    const salePriceAvailable = showingLineman
                      ? item.lineManPriceAvailable
                      : item.storePriceAvailable;
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
                          <Chip
                            label={item.status}
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              height: 25,
                              borderRadius: '12px',
                              bgcolor: statusChipColor(item.status),
                              color: '#fff',
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 11,
                            }}
                          />
                          <Chip
                            label={channelLabel}
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 12,
                              left: 12,
                              height: 25,
                              borderRadius: '12px',
                              bgcolor: showingLineman ? '#06C755' : '#805637',
                              color: '#fff',
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 11,
                              fontWeight: 600,
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
                              ต้นทุน {channelLabel}
                              <Box
                                component="span"
                                sx={{
                                  fontSize: 18,
                                  fontWeight: 700,
                                  lineHeight: 1,
                                }}
                              >
                                {costPrice} บาท
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
                              ราคาขาย {channelLabel}
                              <Box
                                component="span"
                                sx={{
                                  fontSize: 20,
                                  fontWeight: 700,
                                  lineHeight: 1,
                                }}
                              >
                                {salePriceAvailable ? `${salePrice} บาท` : '-'}
                              </Box>
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openRecipe(item)}
                            sx={{
                              mt: 1.5,
                              minHeight: 34,
                              borderRadius: '10px',
                              borderColor: '#d8c8bd',
                              color: '#5f4030',
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 12,
                              fontWeight: 600,
                              '&:hover': {
                                borderColor: '#805637',
                                bgcolor: '#f7eee8',
                              },
                            }}
                          >
                            {readOnly
                              ? 'ดูสูตรการทำ'
                              : item.ingredients.length === 0
                                ? 'เพิ่มสูตรการทำ'
                                : 'จัดการสูตรการทำ'}
                          </Button>
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
        open={recipeProduct !== null}
        onClose={() => setRecipeProduct(null)}
        transitionDuration={{ enter: 300, exit: 220 }}
        sx={{ zIndex: 1301 }}
        slotProps={{
          paper: {
            sx: {
              left: { md: '280px' },
              width: { md: 'calc(100% - 304px)' },
              height: { xs: '88dvh', sm: 'calc(100dvh - 72px)' },
              overflow: 'hidden',
              borderRadius: '24px 24px 0 0',
              bgcolor: '#fffaf7',
            },
          },
        }}
      >
        {recipeProduct ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
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
                mb: 2,
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
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 22,
                    fontWeight: 600,
                  }}
                >
                  สูตรการทำ
                </Typography>
                <Typography
                  sx={{
                    color: 'text.secondary',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 14,
                  }}
                >
                  {recipeProduct.name}
                </Typography>
              </Box>
              <Button
                aria-label="ปิดสูตรการทำ"
                onClick={() => setRecipeProduct(null)}
                sx={{
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
                <XIcon size={20} />
              </Button>
            </Box>
            <Divider sx={{ mt: 2, borderColor: '#e8ddd5' }} />
            <Box sx={{ flex: 1, overflowY: 'auto', py: 2.5 }}>
              {readOnly ? (
                recipeProduct.ingredients.length > 0 ||
                recipeProduct.preparationSteps.trim() ? (
                  <Box sx={{ display: 'grid', gap: 2 }}>
                    {recipeProduct.ingredients.length > 0 ? (
                      <Box sx={{ display: 'grid', gap: 1 }}>
                        {recipeProduct.ingredients.map((ingredient, index) => (
                          <Box
                            key={ingredient.inventoryItemId}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 2,
                              px: 2,
                              py: 1.25,
                              border: '1px solid #e8ddd5',
                              borderRadius: '12px',
                              bgcolor: '#fff',
                            }}
                          >
                            <Typography
                              sx={{ fontFamily: 'Kanit, sans-serif' }}
                            >
                              {index + 1}. {ingredient.name}
                            </Typography>
                            <Typography
                              sx={{
                                color: '#805637',
                                fontFamily: 'Kanit, sans-serif',
                                fontWeight: 600,
                              }}
                            >
                              {ingredient.quantity} {ingredient.unit}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : null}
                    {recipeProduct.preparationSteps.trim() ? (
                      <Box
                        sx={{
                          px: 2,
                          py: 1.5,
                          border: '1px solid #e8ddd5',
                          borderRadius: '12px',
                          bgcolor: '#fff',
                        }}
                      >
                        <Typography
                          sx={{
                            mb: 0.75,
                            color: '#805637',
                            fontFamily: 'Kanit, sans-serif',
                            fontWeight: 600,
                          }}
                        >
                          ขั้นตอนการทำ
                        </Typography>
                        <Typography
                          sx={{
                            whiteSpace: 'pre-line',
                            fontFamily: 'Kanit, sans-serif',
                          }}
                        >
                          {recipeProduct.preparationSteps}
                        </Typography>
                      </Box>
                    ) : null}
                  </Box>
                ) : (
                  <Typography
                    sx={{
                      py: 4,
                      textAlign: 'center',
                      color: 'text.secondary',
                      fontFamily: 'Kanit, sans-serif',
                    }}
                  >
                    เมนูนี้ยังไม่มีสูตรการทำ
                  </Typography>
                )
              ) : (
                <Box sx={{ display: 'grid', gap: 1.25 }}>
                  {recipeDraft.map((ingredient, index) => (
                    <Box
                      key={`${ingredient.inventoryItemId}-${index}`}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr 88px 78px 40px',
                          sm: 'minmax(0, 1fr) 120px 110px 40px',
                        },
                        gap: 1,
                        alignItems: 'center',
                      }}
                    >
                      <TextField
                        select
                        size="small"
                        value={ingredient.inventoryItemId}
                        label={index === 0 ? 'วัตถุดิบ' : undefined}
                        onChange={(event) => {
                          const inventoryItemId = Number(event.target.value);
                          const option = recipeIngredientOptions.find(
                            (item) => item.id === inventoryItemId,
                          );
                          setRecipeDraft((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    inventoryItemId,
                                    unit: option?.unit ?? item.unit,
                                  }
                                : item,
                            ),
                          );
                        }}
                      >
                        <MenuItem value="" disabled>
                          เลือกวัตถุดิบ
                        </MenuItem>
                        {recipeIngredientOptions.map((option) => (
                          <MenuItem key={option.id} value={option.id}>
                            {option.name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        size="small"
                        type="number"
                        label={index === 0 ? 'ปริมาณ' : undefined}
                        slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                        value={ingredient.quantity}
                        onChange={(event) =>
                          setRecipeDraft((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    quantity:
                                      event.target.value === ''
                                        ? ''
                                        : Number(event.target.value),
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                      <TextField
                        size="small"
                        label={index === 0 ? 'หน่วย' : undefined}
                        value={ingredient.unit}
                        onChange={(event) =>
                          setRecipeDraft((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, unit: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <Button
                        aria-label="ลบวัตถุดิบจากสูตร"
                        disabled={recipeDraft.length === 0}
                        onClick={() =>
                          setRecipeDraft((items) =>
                            items.filter((_, itemIndex) => itemIndex !== index),
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
                        }}
                      >
                        <XIcon size={18} />
                      </Button>
                    </Box>
                  ))}
                  <Button
                    variant="outlined"
                    onClick={() =>
                      setRecipeDraft((items) => [
                        ...items,
                        { inventoryItemId: '', quantity: '', unit: '' },
                      ])
                    }
                    sx={{
                      justifySelf: 'start',
                      minHeight: 36,
                      borderRadius: '10px',
                      borderColor: '#d8c8bd',
                      color: '#805637',
                      fontFamily: 'Kanit, sans-serif',
                    }}
                  >
                    + เพิ่มวัตถุดิบในสูตร
                  </Button>
                  <TextField
                    multiline
                    minRows={4}
                    label="ขั้นตอนการทำ"
                    placeholder="เช่น 1. เตรียมวัตถุดิบ\n2. ผัดและจัดเสิร์ฟ"
                    value={recipeStepsDraft}
                    onChange={(event) =>
                      setRecipeStepsDraft(event.target.value)
                    }
                    sx={{ mt: 1 }}
                  />
                </Box>
              )}
            </Box>
            {!readOnly ? (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                  onClick={() => setRecipeProduct(null)}
                  sx={{
                    minHeight: 40,
                    borderRadius: '12px',
                    color: '#5f4b3d',
                    fontFamily: 'Kanit, sans-serif',
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="contained"
                  disabled={isSavingRecipe}
                  onClick={() => void saveRecipe()}
                  sx={{
                    minHeight: 40,
                    borderRadius: '12px',
                    bgcolor: '#201914',
                    fontFamily: 'Kanit, sans-serif',
                    '&:hover': { bgcolor: '#3c2d24' },
                  }}
                >
                  {isSavingRecipe ? 'กำลังบันทึก...' : 'บันทึกสูตรการทำ'}
                </Button>
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Drawer>
      <ActionSnackbar
        notice={actionNotice}
        onClose={() => setActionNotice(null)}
      />
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
              onSubmit={saveProduct}
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
                {preview || editing?.imageUrl ? (
                  <Box
                    component="img"
                    src={preview ?? editing?.imageUrl}
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
                  name="name"
                  defaultValue={editing?.name}
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                />
                <TextField
                  required
                  select
                  fullWidth
                  label="หมวดหมู่"
                  name="category"
                  defaultValue={editing?.category ?? 'เมนูร้อน'}
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
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    minHeight: 56,
                    px: 1.5,
                    border: '1px solid #e8ddd5',
                    borderRadius: '12px',
                    bgcolor: '#fffaf7',
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        color: 'text.secondary',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 12,
                      }}
                    >
                      สถานะระบบ
                    </Typography>
                    <Typography
                      sx={{
                        color: 'text.secondary',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 10,
                      }}
                    >
                      ระบบคำนวณจากสูตรและสต๊อก
                    </Typography>
                  </Box>
                  <Chip
                    label={editing?.status ?? 'ต้องเพิ่มสูตร'}
                    size="small"
                    sx={{
                      borderRadius: '12px',
                      bgcolor: statusChipColor(
                        editing?.status ?? 'ต้องเพิ่มสูตร',
                      ),
                      color: '#fff',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <Box
                  role="group"
                  aria-label="ราคาตามช่องทางขาย"
                  sx={{
                    gridColumn: { sm: '1 / -1' },
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'repeat(2, minmax(0, 1fr))',
                    },
                    gap: 1.5,
                  }}
                >
                  <Box
                    component="section"
                    aria-labelledby="store-pricing-title"
                    sx={{
                      p: 1.5,
                      border: '1px solid #e8ddd5',
                      borderRadius: '12px',
                      bgcolor: '#fffaf7',
                    }}
                  >
                    <Typography
                      id="store-pricing-title"
                      sx={{
                        mb: 1,
                        fontFamily: 'Kanit, sans-serif',
                        fontWeight: 700,
                      }}
                    >
                      หน้าร้าน
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: 'repeat(2, minmax(0, 1fr))',
                        },
                        gap: 1.25,
                      }}
                    >
                      <TextField
                        required
                        fullWidth
                        label="ราคาต้นทุนหน้าร้าน"
                        name="costPrice"
                        type="number"
                        defaultValue={editing?.costPrice}
                        helperText="ใช้คำนวณกำไร/ขาดทุน"
                      />
                      <TextField
                        required
                        fullWidth
                        label="ราคาขายหน้าร้าน"
                        name="storePrice"
                        type="number"
                        defaultValue={editing?.storePrice}
                      />
                    </Box>
                  </Box>
                  <Box
                    component="section"
                    aria-labelledby="lineman-pricing-title"
                    sx={{
                      p: 1.5,
                      border: '1px solid #e8ddd5',
                      borderRadius: '12px',
                      bgcolor: '#fffaf7',
                    }}
                  >
                    <Typography
                      id="lineman-pricing-title"
                      sx={{
                        mb: 1,
                        fontFamily: 'Kanit, sans-serif',
                        fontWeight: 700,
                      }}
                    >
                      LINE MAN
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: 'repeat(2, minmax(0, 1fr))',
                        },
                        gap: 1.25,
                      }}
                    >
                      <TextField
                        required
                        fullWidth
                        label="ราคาต้นทุน LINE MAN"
                        name="lineManCostPrice"
                        type="number"
                        defaultValue={editing?.lineManCostPrice}
                        helperText="อ้างอิงต้นทุนจากสูตร LINE MAN"
                        slotProps={{
                          formHelperText: {
                            sx: {
                              whiteSpace: 'nowrap',
                              fontSize: 10,
                              lineHeight: 1.2,
                            },
                          },
                        }}
                      />
                      <TextField
                        required
                        fullWidth
                        label="ราคาขาย LINE MAN"
                        name="lineManPrice"
                        type="number"
                        defaultValue={editing?.lineManPrice}
                      />
                    </Box>
                  </Box>
                </Box>
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
                          {availableIngredients
                            .filter(
                              (option) =>
                                !editing ||
                                option.branchCode === editing.branchCode,
                            )
                            .map((option) => (
                              <MenuItem key={option.id} value={option.name}>
                                {option.name}
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
                    disabled={isSavingProduct}
                    sx={{
                      minHeight: 40,
                      borderRadius: '12px',
                      bgcolor: '#201914',
                      fontFamily: 'Kanit, sans-serif',
                    }}
                  >
                    {isSavingProduct
                      ? 'กำลังบันทึก...'
                      : editing
                        ? 'บันทึกการแก้ไข'
                        : 'บันทึกสินค้า'}
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
