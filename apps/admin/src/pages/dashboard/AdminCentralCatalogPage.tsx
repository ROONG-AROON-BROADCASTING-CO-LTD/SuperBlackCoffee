import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DashboardMain, PageIntro } from '@stackbuild/ui';
import {
  createCatalogTemplateInventoryItem,
  createCatalogTemplateMenuItem,
  getCatalogTemplate,
  getCatalogTemplateImpact,
  listBranchCatalogSelections,
  setBranchCatalogSelection,
  listCatalogTemplates,
  retireCatalogTemplateInventoryItem,
  retireCatalogTemplateMenuItem,
  replaceCatalogTemplateMenuRecipes,
  syncCatalogTemplate,
  updateCatalogTemplateInventoryItem,
  updateCatalogTemplateMenuItem,
  type CatalogTemplate,
  type CatalogTemplateImpact,
  type CatalogTemplateInventoryItem,
  type CatalogTemplateMenuItem,
  type CatalogTemplateInventoryPatch,
  type CatalogTemplateMenuPatch,
  type CatalogTemplateSize,
  type CatalogTemplateSummary,
} from '../../api/catalogTemplates';

const sizes: CatalogTemplateSize[] = ['S', 'M', 'L'];

const catalogTabs = [
  { value: 'menu', label: 'เมนูและสินค้า' },
  { value: 'inventory', label: 'วัตถุดิบและอุปกรณ์' },
] as const;

type CatalogTab = (typeof catalogTabs)[number]['value'];

type InventoryEditorState = {
  type: 'inventory';
  item: CatalogTemplateInventoryItem;
  draft: {
    name: string;
    category: string;
    stockCategory: string;
    kind: 'ingredient' | 'stock';
    unit: string;
    unitCost: string;
    reorderLevel: string;
    trackStock: boolean;
    availableSizes: CatalogTemplateSize[];
  };
};

type MenuEditorState = {
  type: 'menu';
  item: CatalogTemplateMenuItem;
  draft: {
    name: string;
    category: string;
    storePrice: string;
    linemanPrice: string;
    status: 'available' | 'soldout';
    availableSizes: CatalogTemplateSize[];
    recipes: {
      catalogItemId: number;
      channel: 'storefront' | 'lineman';
      quantity: string;
    }[];
  };
};

type TemplateEditorState = InventoryEditorState | MenuEditorState;

const templateCardSx = {
  borderColor: '#eadfd7',
  boxShadow: 'none',
  borderRadius: 3,
};

const numberFormatter = new Intl.NumberFormat('th-TH');

function formatCurrency(value: number) {
  return `${numberFormatter.format(value)} บาท`;
}

function nonNegativeNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function TemplateDetail({
  template,
  size,
  search,
  onSearchChange,
  onSizeChange,
  tab,
  onTabChange,
  onEditInventory,
  onEditMenu,
  onRetireInventory,
  onRetireMenu,
  onAdd,
}: {
  template: CatalogTemplate;
  size: CatalogTemplateSize | 'ALL';
  search: string;
  onSearchChange: (value: string) => void;
  onSizeChange: (value: CatalogTemplateSize | 'ALL') => void;
  tab: CatalogTab;
  onTabChange: (tab: CatalogTab) => void;
  onEditInventory: (item: CatalogTemplateInventoryItem) => void;
  onEditMenu: (item: CatalogTemplateMenuItem) => void;
  onRetireInventory: (item: CatalogTemplateInventoryItem) => void;
  onRetireMenu: (item: CatalogTemplateMenuItem) => void;
  onAdd: () => void;
}) {
  const [requestedPage, setRequestedPage] = useState(0);
  const normalizedSearch = search.trim().toLocaleLowerCase('th-TH');
  const matches = (item: {
    name: string;
    category: string;
    availableSizes: CatalogTemplateSize[];
  }) =>
    (size === 'ALL' || item.availableSizes.includes(size)) &&
    `${item.name} ${item.category}`
      .toLocaleLowerCase('th-TH')
      .includes(normalizedSearch);
  const visibleMenus = template.menuItems.filter(matches);
  const visibleInventory = template.inventoryItems.filter(matches);
  const items = tab === 'menu' ? visibleMenus : visibleInventory;
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, pageCount - 1);
  const pageStart = page * pageSize;
  return (
    <Card variant="outlined" sx={templateCardSx}>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Box
          role="tablist"
          aria-label="ประเภทข้อมูลกลาง"
          sx={{
            display: 'flex',
            gap: 0,
            px: 2,
            borderBottom: '1px solid #eee3dc',
          }}
        >
          {catalogTabs.map((item) => (
            <Button
              key={item.value}
              role="tab"
              aria-selected={tab === item.value}
              onClick={() => {
                setRequestedPage(0);
                onTabChange(item.value);
              }}
              size="small"
              variant="text"
              sx={{
                minHeight: 48,
                borderRadius: 0,
                borderBottom:
                  tab === item.value
                    ? '3px solid #805637'
                    : '3px solid transparent',
                color: tab === item.value ? '#674633' : '#6c625c',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 13,
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ p: 2, gap: 1, alignItems: { md: 'center' } }}
        >
          <TextField
            size="small"
            label="ค้นหารายการกลาง"
            value={search}
            onChange={(event) => {
              setRequestedPage(0);
              onSearchChange(event.target.value);
            }}
            sx={{ flex: 1, minWidth: 180 }}
          />
          <Stack direction="row" spacing={0.5} aria-label="กรองขนาดสาขา">
            {(['ALL', ...sizes] as const).map((item) => (
              <Button
                key={item}
                size="small"
                onClick={() => {
                  setRequestedPage(0);
                  onSizeChange(item);
                }}
                variant={size === item ? 'contained' : 'outlined'}
                aria-pressed={size === item}
                sx={{ ...tabButtonSx(size === item), minWidth: 38 }}
              >
                {item === 'ALL' ? 'ทั้งหมด' : item}
              </Button>
            ))}
          </Stack>
          <Button
            variant="contained"
            onClick={onAdd}
            sx={{ ...tabButtonSx(true), minHeight: 38, whiteSpace: 'nowrap' }}
          >
            + เพิ่ม{tab === 'menu' ? 'เมนู' : 'รายการคลัง'}
          </Button>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0,1fr) auto',
              md: 'minmax(0,2fr) minmax(80px,1fr) 84px minmax(100px,1fr) auto',
            },
            gap: 1,
            px: 2,
            py: 1,
            bgcolor: '#faf8f6',
            borderBlock: '1px solid #eee3dc',
          }}
        >
          <Typography sx={itemMetaSx}>
            ชื่อรายการ · {numberFormatter.format(items.length)} รายการ
          </Typography>
          <Typography
            sx={{ ...itemMetaSx, display: { xs: 'none', md: 'block' } }}
          >
            หมวดหมู่
          </Typography>
          <Typography
            sx={{ ...itemMetaSx, display: { xs: 'none', md: 'block' } }}
          >
            ขนาดที่ใช้
          </Typography>
          <Typography
            sx={{ ...itemMetaSx, display: { xs: 'none', md: 'block' } }}
          >
            {tab === 'menu' ? 'ราคา' : 'ต้นทุน'}
          </Typography>
          <Typography sx={itemMetaSx}>จัดการ</Typography>
        </Box>

        {items.length === 0 ? (
          <Typography
            sx={{
              py: 4,
              textAlign: 'center',
              color: 'text.secondary',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 13,
            }}
          >
            ยังไม่มี{tab === 'menu' ? 'เมนูและสินค้า' : 'วัตถุดิบหรืออุปกรณ์'}
            ที่ตรงกับตัวกรอง ลองเปลี่ยนคำค้นหรือขนาดสาขา
          </Typography>
        ) : (
          <Box
            role="tabpanel"
            sx={{
              display: 'grid',
              overflow: 'hidden',
            }}
          >
            {tab === 'menu'
              ? visibleMenus
                  .slice(pageStart, pageStart + pageSize)
                  .map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'minmax(0,1fr) auto',
                          md: 'minmax(0,2fr) minmax(80px,1fr) 84px minmax(100px,1fr) auto',
                        },
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1.25,
                        borderBottom: '1px solid #f0e7e1',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={itemTitleSx}>{item.name}</Typography>
                        <Typography sx={itemMetaSx}>
                          สูตร {item.recipes.length} รายการ
                        </Typography>
                        <Typography
                          sx={{
                            ...itemMetaSx,
                            display: { xs: 'block', md: 'none' },
                          }}
                        >
                          {item.category} · {item.availableSizes.join(' / ')} ·{' '}
                          {formatCurrency(item.storePrice)}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          ...itemMetaSx,
                          display: { xs: 'none', md: 'block' },
                        }}
                      >
                        {item.category}
                      </Typography>
                      <Typography
                        sx={{
                          ...itemMetaSx,
                          display: { xs: 'none', md: 'block' },
                        }}
                      >
                        {item.availableSizes.join(' / ')}
                      </Typography>
                      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                        <Typography sx={itemTitleSx}>
                          {formatCurrency(item.storePrice)}
                        </Typography>
                        <Typography sx={itemMetaSx}>
                          LINE MAN {formatCurrency(item.linemanPrice)}
                        </Typography>
                      </Box>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ alignItems: 'center', flexShrink: 0 }}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onEditMenu(item)}
                          sx={editButtonSx}
                        >
                          แก้ไข
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => onRetireMenu(item)}
                          sx={editButtonSx}
                        >
                          นำออก
                        </Button>
                      </Stack>
                    </Box>
                  ))
              : visibleInventory
                  .slice(pageStart, pageStart + pageSize)
                  .map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'minmax(0,1fr) auto',
                          md: 'minmax(0,2fr) minmax(80px,1fr) 84px minmax(100px,1fr) auto',
                        },
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1.25,
                        borderBottom: '1px solid #f0e7e1',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={itemTitleSx}>{item.name}</Typography>
                        <Typography sx={itemMetaSx}>
                          {item.trackStock === false
                            ? 'คิดต้นทุนเท่านั้น'
                            : 'ติดตามสต๊อก'}
                        </Typography>
                        <Typography
                          sx={{
                            ...itemMetaSx,
                            display: { xs: 'block', md: 'none' },
                          }}
                        >
                          {item.category} · {item.availableSizes.join(' / ')} ·{' '}
                          {formatCurrency(item.unitCost)}/{item.unit}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          ...itemMetaSx,
                          display: { xs: 'none', md: 'block' },
                        }}
                      >
                        {item.category}
                      </Typography>
                      <Typography
                        sx={{
                          ...itemMetaSx,
                          display: { xs: 'none', md: 'block' },
                        }}
                      >
                        {item.availableSizes.join(' / ')}
                      </Typography>
                      <Typography
                        sx={{
                          ...itemTitleSx,
                          display: { xs: 'none', md: 'block' },
                        }}
                      >
                        {formatCurrency(item.unitCost)}/{item.unit}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ alignItems: 'center', flexShrink: 0 }}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onEditInventory(item)}
                          sx={editButtonSx}
                        >
                          แก้ไข
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => onRetireInventory(item)}
                          sx={editButtonSx}
                        >
                          นำออก
                        </Button>
                      </Stack>
                    </Box>
                  ))}
          </Box>
        )}
        <Stack
          direction="row"
          sx={{
            px: 2,
            py: 1.5,
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography sx={itemMetaSx}>
            {items.length === 0
              ? '0 รายการ'
              : `แสดง ${numberFormatter.format(pageStart + 1)}–${numberFormatter.format(Math.min(pageStart + pageSize, items.length))} จาก ${numberFormatter.format(items.length)} รายการ`}
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <Button
              size="small"
              disabled={page === 0}
              onClick={() => setRequestedPage(page - 1)}
              sx={editButtonSx}
            >
              ก่อนหน้า
            </Button>
            <Typography
              sx={{
                ...itemMetaSx,
                alignSelf: 'center',
                minWidth: 35,
                textAlign: 'center',
              }}
            >
              {page + 1}/{pageCount}
            </Typography>
            <Button
              size="small"
              disabled={page + 1 >= pageCount}
              onClick={() => setRequestedPage(page + 1)}
              sx={editButtonSx}
            >
              ถัดไป
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

const itemTitleSx = {
  color: '#3c2d24',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.4,
};

const itemMetaSx = {
  mt: 0.15,
  color: 'text.secondary',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 11,
  lineHeight: 1.4,
};

const editButtonSx = {
  minWidth: 0,
  minHeight: 30,
  borderRadius: 1.75,
  borderColor: '#ddcec5',
  color: '#674633',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 11,
  fontWeight: 500,
  '&:hover': {
    borderColor: '#805637',
    bgcolor: '#faf4f0',
  },
};

function tabButtonSx(selected: boolean) {
  return {
    minHeight: 32,
    borderRadius: 2,
    borderColor: selected ? '#805637' : '#ddcec5',
    bgcolor: selected ? '#805637' : '#fff',
    color: selected ? '#fff' : '#5d4030',
    fontFamily: 'Kanit, sans-serif',
    fontSize: 12,
    fontWeight: 500,
    boxShadow: 'none',
    '&:hover': {
      borderColor: '#674633',
      bgcolor: selected ? '#674633' : '#faf4f0',
      boxShadow: 'none',
    },
  };
}

export function AdminCentralCatalogPage() {
  const [size, setSize] = useState<CatalogTemplateSize | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState<CatalogTemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [template, setTemplate] = useState<CatalogTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<CatalogTab>('menu');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [impact, setImpact] = useState<CatalogTemplateImpact | null>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [impactError, setImpactError] = useState('');
  const [isImpactDialogOpen, setIsImpactDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<TemplateEditorState | null>(null);
  const [isSavingEditor, setIsSavingEditor] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [branchId, setBranchId] = useState<number | null>(null);
  const [branchSearch, setBranchSearch] = useState('');
  const [branchSelections, setBranchSelections] = useState<Set<string>>(
    new Set(),
  );
  const [selectionError, setSelectionError] = useState('');
  const [isSavingSelection, setIsSavingSelection] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoadingTemplates(true);
    setLoadError('');
    setImpact(null);
    setImpactError('');
    void listCatalogTemplates()
      .then((items) => {
        if (!active) return;
        setTemplates(items);
        setSelectedTemplateId((current) =>
          items.some((item) => item.id === current)
            ? current
            : (items[0]?.id ?? null),
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        setTemplates([]);
        setSelectedTemplateId(null);
        setLoadError(
          error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลกลางได้',
        );
      })
      .finally(() => {
        if (active) setIsLoadingTemplates(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (branchId === null) return;
    let active = true;
    setSelectionError('');
    void listBranchCatalogSelections(branchId)
      .then((items) => {
        if (active)
          setBranchSelections(
            new Set(
              items
                .filter((item) => !item.enabled)
                .map((item) => `${item.entityType}:${item.sourceKey}`),
            ),
          );
      })
      .catch((error: unknown) => {
        if (active)
          setSelectionError(
            error instanceof Error
              ? error.message
              : 'โหลดรายการของสาขาไม่สำเร็จ',
          );
      });
    return () => {
      active = false;
    };
  }, [branchId, reloadKey]);

  useEffect(() => {
    if (selectedTemplateId === null) {
      setTemplate(null);
      return undefined;
    }
    let active = true;
    setIsLoadingTemplate(true);
    void getCatalogTemplate(selectedTemplateId)
      .then((item) => {
        if (active) setTemplate(item);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setTemplate(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : 'ไม่สามารถโหลดรายละเอียดข้อมูลกลางได้',
        );
      })
      .finally(() => {
        if (active) setIsLoadingTemplate(false);
      });
    return () => {
      active = false;
    };
  }, [selectedTemplateId]);

  const selectedSummary = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  const previewImpact = async (openDialog: boolean) => {
    if (selectedTemplateId === null) return;
    setImpactError('');
    setIsLoadingImpact(true);
    try {
      const nextImpact = await getCatalogTemplateImpact(selectedTemplateId);
      setImpact(nextImpact);
      if (openDialog) setIsImpactDialogOpen(true);
    } catch (error) {
      setImpactError(
        error instanceof Error
          ? error.message
          : 'ไม่สามารถคำนวณผลกระทบของข้อมูลกลางได้',
      );
    } finally {
      setIsLoadingImpact(false);
    }
  };

  useEffect(() => {
    if (selectedTemplateId === null) return;
    let active = true;
    void getCatalogTemplateImpact(selectedTemplateId)
      .then((result) => {
        if (active) setImpact(result);
      })
      .catch(() => {
        /* The explicit preview action shows fetch errors. */
      });
    return () => {
      active = false;
    };
  }, [selectedTemplateId, reloadKey]);

  const openSyncDialog = () => {
    if (impact) {
      setIsImpactDialogOpen(true);
      return;
    }
    void previewImpact(true);
  };

  const syncTemplate = async () => {
    if (selectedTemplateId === null || !impact || impact.count === 0) return;
    setIsSyncing(true);
    try {
      const result = await syncCatalogTemplate(selectedTemplateId);
      setIsImpactDialogOpen(false);
      setNotice(
        `อัปเดตข้อมูลกลางไปยัง ${numberFormatter.format(result.syncedBranches)} สาขาแล้ว`,
      );
      setReloadKey((current) => current + 1);
    } catch (error) {
      setImpactError(
        error instanceof Error
          ? error.message
          : 'ไม่สามารถกระจายการเปลี่ยนแปลงได้',
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const openInventoryEditor = (item: CatalogTemplateInventoryItem) => {
    setEditorError('');
    setEditor({
      type: 'inventory',
      item,
      draft: {
        name: item.name,
        category: item.category,
        stockCategory: item.stockCategory ?? '',
        kind: item.kind ?? 'ingredient',
        unit: item.unit,
        unitCost: String(item.unitCost),
        reorderLevel: String(item.reorderLevel),
        trackStock: item.trackStock !== false,
        availableSizes: item.availableSizes,
      },
    });
  };

  const openMenuEditor = (item: CatalogTemplateMenuItem) => {
    setEditorError('');
    setEditor({
      type: 'menu',
      item,
      draft: {
        name: item.name,
        category: item.category,
        storePrice: String(item.storePrice),
        linemanPrice: String(item.linemanPrice),
        status: item.status ?? 'available',
        availableSizes: item.availableSizes,
        recipes: item.recipes.map((recipe) => ({
          catalogItemId: recipe.catalogItemId,
          channel: recipe.channel,
          quantity: String(recipe.quantity),
        })),
      },
    });
  };

  const openCreateEditor = () => {
    setEditorError('');
    if (activeTab === 'inventory') {
      setEditor({
        type: 'inventory',
        item: {
          id: 0,
          name: '',
          category: 'วัตถุดิบ',
          kind: 'ingredient',
          unit: 'กรัม',
          unitCost: 0,
          reorderLevel: 0,
          trackStock: true,
          availableSizes: size === 'ALL' ? [...sizes] : [size],
        },
        draft: {
          name: '',
          category: 'วัตถุดิบ',
          stockCategory: '',
          kind: 'ingredient',
          unit: 'กรัม',
          unitCost: '0',
          reorderLevel: '0',
          trackStock: true,
          availableSizes: size === 'ALL' ? [...sizes] : [size],
        },
      });
      return;
    }
    setEditor({
      type: 'menu',
      item: {
        id: 0,
        name: '',
        category: 'เครื่องดื่ม',
        storePrice: 0,
        linemanPrice: 0,
        status: 'available',
        recipes: [],
        availableSizes: size === 'ALL' ? [...sizes] : [size],
      },
      draft: {
        name: '',
        category: 'เครื่องดื่ม',
        storePrice: '0',
        linemanPrice: '0',
        status: 'available',
        recipes: [],
        availableSizes: size === 'ALL' ? [...sizes] : [size],
      },
    });
  };

  const saveEditor = async () => {
    if (!editor || !template) return;
    setEditorError('');
    if (
      !editor.draft.name.trim() ||
      !editor.draft.category.trim() ||
      editor.draft.availableSizes.length === 0 ||
      (editor.type === 'inventory' && !editor.draft.unit.trim())
    ) {
      setEditorError('กรุณากรอกข้อมูลที่จำเป็นให้ครบ');
      return;
    }
    const unitCost =
      editor.type === 'inventory'
        ? nonNegativeNumber(editor.draft.unitCost)
        : null;
    const reorderLevel =
      editor.type === 'inventory'
        ? nonNegativeNumber(editor.draft.reorderLevel)
        : null;
    const storePrice =
      editor.type === 'menu'
        ? nonNegativeNumber(editor.draft.storePrice)
        : null;
    const linemanPrice =
      editor.type === 'menu'
        ? nonNegativeNumber(editor.draft.linemanPrice)
        : null;
    if (
      (editor.type === 'inventory' &&
        (unitCost === null || reorderLevel === null)) ||
      (editor.type === 'menu' && (storePrice === null || linemanPrice === null))
    ) {
      setEditorError('ราคาและจุดแจ้งเตือนต้องเป็นเลขศูนย์หรือมากกว่า');
      return;
    }

    setIsSavingEditor(true);
    try {
      if (editor.type === 'inventory') {
        const data: CatalogTemplateInventoryPatch = {
          category: editor.draft.category.trim(),
          stockCategory: editor.draft.stockCategory || undefined,
          kind: editor.draft.kind,
          unit: editor.draft.unit.trim(),
          unitCost: unitCost!,
          reorderLevel: reorderLevel!,
          trackStock: editor.draft.trackStock,
          availableSizes: editor.draft.availableSizes,
        };
        if (editor.item.id === 0) {
          await createCatalogTemplateInventoryItem(template.id, {
            name: editor.draft.name.trim(),
            ...data,
          });
        } else {
          await updateCatalogTemplateInventoryItem(
            template.id,
            editor.item.id,
            data,
          );
        }
      } else {
        const recipes = editor.draft.recipes.map((recipe) => {
          const inventoryItem = template.inventoryItems.find(
            (item) => item.id === recipe.catalogItemId,
          );
          const quantity = Number(recipe.quantity);
          if (!inventoryItem || !Number.isFinite(quantity) || quantity <= 0) {
            throw new Error('สูตรต้องเลือกวัตถุดิบและระบุจำนวนมากกว่า 0');
          }
          return {
            catalogItemId: inventoryItem.id,
            channel: recipe.channel,
            quantity,
            unit: inventoryItem.unit,
            costAmount: Number((quantity * inventoryItem.unitCost).toFixed(4)),
          };
        });
        const data: CatalogTemplateMenuPatch = {
          category: editor.draft.category.trim(),
          storePrice: storePrice!,
          linemanPrice: linemanPrice!,
          status: editor.draft.status,
          availableSizes: editor.draft.availableSizes,
        };
        const saved =
          editor.item.id === 0
            ? await createCatalogTemplateMenuItem(template.id, {
                name: editor.draft.name.trim(),
                ...data,
              })
            : await updateCatalogTemplateMenuItem(
                template.id,
                editor.item.id,
                data,
              );
        await replaceCatalogTemplateMenuRecipes(template.id, saved.id, recipes);
      }
      const refreshedTemplate = await getCatalogTemplate(template.id);
      setTemplate(refreshedTemplate);
      setEditor(null);
      setImpact(null);
      setImpactError('');
      setNotice('บันทึกข้อมูลกลางแล้ว ตรวจผลกระทบก่อนซิงก์ไปยังสาขา');
      setReloadKey((current) => current + 1);
    } catch (error) {
      setEditorError(
        error instanceof Error ? error.message : 'ไม่สามารถบันทึกข้อมูลกลางได้',
      );
    } finally {
      setIsSavingEditor(false);
    }
  };

  const retireItem = async (
    type: 'inventory' | 'menu',
    item: CatalogTemplateInventoryItem | CatalogTemplateMenuItem,
  ) => {
    if (!template) return;
    const confirmed = window.confirm(
      `นำ “${item.name}” ออกจากข้อมูลกลางใช่ไหม? ข้อมูลและประวัติของสาขาจะไม่ถูกลบ และจะมีผลหลังซิงก์`,
    );
    if (!confirmed) return;
    try {
      if (type === 'inventory') {
        await retireCatalogTemplateInventoryItem(template.id, item.id);
      } else {
        await retireCatalogTemplateMenuItem(template.id, item.id);
      }
      const refreshedTemplate = await getCatalogTemplate(template.id);
      setTemplate(refreshedTemplate);
      setImpact(null);
      setNotice('นำรายการออกจากข้อมูลกลางแล้ว ตรวจผลกระทบก่อนซิงก์ไปยังสาขา');
      setReloadKey((current) => current + 1);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'ไม่สามารถนำรายการออกจากข้อมูลกลางได้',
      );
    }
  };

  return (
    <DashboardMain>
      <PageIntro
        title="สินค้าและคลังกลาง"
        description="ข้อมูลเมนู สินค้า วัตถุดิบ และอุปกรณ์ชุดเดียวสำหรับทุกสาขา เลือกขนาด S / M / L ที่ใช้แต่ละรายการ"
      />

      {loadError ? (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setReloadKey((current) => current + 1)}
              sx={{ fontFamily: 'Kanit, sans-serif' }}
            >
              ลองใหม่
            </Button>
          }
          sx={{ mb: 2.5, fontFamily: 'Kanit, sans-serif' }}
        >
          {loadError}
        </Alert>
      ) : null}

      <Box>
        {isLoadingTemplates || isLoadingTemplate ? (
          <Card variant="outlined" sx={templateCardSx}>
            <CardContent sx={{ py: 10, textAlign: 'center' }}>
              <CircularProgress size={26} sx={{ color: '#805637' }} />
            </CardContent>
          </Card>
        ) : template ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0,1fr)',
                lg: 'minmax(0,1.9fr) minmax(300px,.85fr)',
              },
              gap: 2,
              alignItems: 'start',
            }}
          >
            <Box
              sx={{
                minWidth: 0,
                gridColumn: { lg: 1 },
              }}
            >
              <TemplateDetail
                template={template}
                size={size}
                search={search}
                onSearchChange={setSearch}
                onSizeChange={setSize}
                tab={activeTab}
                onTabChange={setActiveTab}
                onEditInventory={openInventoryEditor}
                onEditMenu={openMenuEditor}
                onRetireInventory={(item) => void retireItem('inventory', item)}
                onRetireMenu={(item) => void retireItem('menu', item)}
                onAdd={openCreateEditor}
              />
            </Box>
            <Box
              sx={{
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                gridColumn: { lg: 2 },
                position: { lg: 'sticky' },
                top: { lg: 16 },
              }}
            >
              <Card
                variant="outlined"
                sx={{
                  ...templateCardSx,
                  order: 2,
                }}
              >
                <CardContent
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    '&:last-child': { pb: { xs: 2, sm: 2.5 } },
                  }}
                >
                  <Stack
                    direction="column"
                    sx={{
                      alignItems: 'stretch',
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography component="h2" sx={sectionTitleSx}>
                        กระจายการเปลี่ยนแปลง
                      </Typography>
                      <Typography
                        sx={{ ...sectionMetaSx, mt: 0.25, fontSize: 13 }}
                      >
                        อัปเดตข้อมูลกลางไปยังสาขาโดยไม่ทับยอดจริง ล็อต
                        หรือประวัติ
                      </Typography>
                    </Box>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ flexWrap: 'wrap', gap: 1 }}
                    >
                      <Button
                        variant="outlined"
                        onClick={() => void previewImpact(false)}
                        disabled={isLoadingImpact}
                        sx={tabButtonSx(false)}
                      >
                        {isLoadingImpact ? 'กำลังคำนวณ' : 'ดูผลกระทบ'}
                      </Button>
                      <Button
                        variant="contained"
                        onClick={openSyncDialog}
                        disabled={isLoadingImpact}
                        sx={tabButtonSx(true)}
                      >
                        ซิงก์ไปยังสาขา
                      </Button>
                    </Stack>
                  </Stack>
                  {impact ? (
                    <Box
                      sx={{
                        mt: 1.5,
                        px: 1.25,
                        py: 1,
                        bgcolor: '#f7efe9',
                        borderRadius: 2,
                      }}
                    >
                      <Typography
                        sx={{
                          ...sectionMetaSx,
                          color: '#674633',
                          fontSize: 12,
                        }}
                      >
                        การเปลี่ยนแปลงนี้จะกระทบ{' '}
                        {numberFormatter.format(impact.count)} สาขา · เลือก
                        “ซิงก์ไปยังสาขา” เพื่อยืนยัน
                      </Typography>
                    </Box>
                  ) : null}
                  {impactError ? (
                    <Alert
                      severity="error"
                      sx={{ mt: 1.5, fontFamily: 'Kanit, sans-serif' }}
                    >
                      {impactError}
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>
              <Card
                variant="outlined"
                sx={{
                  ...templateCardSx,
                  order: 1,
                }}
              >
                <CardContent>
                  <Typography component="h2" sx={sectionTitleSx}>
                    รายการที่ใช้รายสาขา
                  </Typography>
                  <Typography sx={sectionMetaSx}>
                    สาขา SBC และแฟรนไชส์เลือกใช้รายการจากข้อมูลกลางชุดเดียวกัน
                    โดยไม่เปลี่ยนยอดสต๊อกจริง
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="สาขา"
                    value={branchId ?? ''}
                    onClick={() => {
                      if (!impact) void previewImpact(false);
                    }}
                    onChange={(event) =>
                      setBranchId(Number(event.target.value))
                    }
                    sx={{ mt: 2 }}
                  >
                    {(impact?.branches ?? []).map((branch) => (
                      <MenuItem key={branch.id} value={branch.id}>
                        {branch.name} · {branch.code} · {branch.size}
                      </MenuItem>
                    ))}
                  </TextField>
                  {branchId !== null && (
                    <TextField
                      size="small"
                      fullWidth
                      label="ค้นหารายการในสาขา"
                      value={branchSearch}
                      onChange={(event) => setBranchSearch(event.target.value)}
                      sx={{ mt: 1.25 }}
                    />
                  )}
                  {selectionError && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {selectionError}
                    </Alert>
                  )}
                  {branchId !== null && template && (
                    <Stack
                      spacing={0.75}
                      sx={{ mt: 1.5, maxHeight: 260, overflowY: 'auto' }}
                    >
                      {(activeTab === 'menu'
                        ? template.menuItems
                        : template.inventoryItems
                      )
                        .filter((item) => {
                          const branchSize = impact?.branches.find(
                            (branch) => branch.id === branchId,
                          )?.size;
                          return (
                            branchSize &&
                            item.availableSizes.includes(branchSize) &&
                            item.name
                              .toLocaleLowerCase('th-TH')
                              .includes(
                                branchSearch.trim().toLocaleLowerCase('th-TH'),
                              )
                          );
                        })
                        .map((item) => {
                          const entityType =
                            activeTab === 'menu' ? 'menu' : 'inventory';
                          const enabled = !branchSelections.has(
                            `${entityType}:${item.id}`,
                          );
                          return (
                            <Stack
                              key={item.id}
                              direction="row"
                              sx={{
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1,
                                py: 0.5,
                                borderBottom: '1px solid #eee3dc',
                              }}
                            >
                              <Typography
                                sx={{
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 13,
                                }}
                              >
                                {item.name}
                              </Typography>
                              <Switch
                                size="small"
                                checked={enabled}
                                disabled={isSavingSelection}
                                slotProps={{
                                  input: {
                                    'aria-label': `${item.name} สำหรับสาขา`,
                                  },
                                }}
                                onClick={async () => {
                                  setIsSavingSelection(true);
                                  setSelectionError('');
                                  try {
                                    await setBranchCatalogSelection(
                                      branchId,
                                      entityType,
                                      item.id,
                                      !enabled,
                                    );
                                    const next =
                                      await listBranchCatalogSelections(
                                        branchId,
                                      );
                                    setBranchSelections(
                                      new Set(
                                        next
                                          .filter(
                                            (selection) => !selection.enabled,
                                          )
                                          .map(
                                            (selection) =>
                                              `${selection.entityType}:${selection.sourceKey}`,
                                          ),
                                      ),
                                    );
                                  } catch (error) {
                                    setSelectionError(
                                      error instanceof Error
                                        ? error.message
                                        : 'บันทึกรายการสาขาไม่สำเร็จ',
                                    );
                                  } finally {
                                    setIsSavingSelection(false);
                                  }
                                }}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#805637',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':
                                    { bgcolor: '#805637' },
                                }}
                              />
                            </Stack>
                          );
                        })}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        ) : (
          <Card variant="outlined" sx={templateCardSx}>
            <CardContent sx={{ py: 10, textAlign: 'center' }}>
              <Typography sx={{ ...sectionMetaSx, fontSize: 13 }}>
                {selectedSummary
                  ? 'ไม่สามารถโหลดรายละเอียดข้อมูลกลางได้'
                  : 'ไม่พบข้อมูลกลาง'}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      <Dialog
        open={editor !== null}
        onClose={() => !isSavingEditor && setEditor(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="catalog-editor-dialog-title"
      >
        <DialogTitle
          id="catalog-editor-dialog-title"
          sx={{
            color: '#3c2d24',
            fontFamily: 'Kanit, sans-serif',
            fontWeight: 600,
          }}
        >
          {editor?.item.id === 0 ? 'เพิ่ม' : 'แก้ไข'}
          {editor?.type === 'inventory'
            ? 'วัตถุดิบหรืออุปกรณ์'
            : 'เมนูและสินค้า'}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#eee3dc' }}>
          {editor ? (
            <>
              <TextField
                fullWidth
                size="small"
                label={editor.type === 'menu' ? 'ชื่อเมนู' : 'ชื่อรายการ'}
                value={editor.draft.name}
                disabled={editor.item.id !== 0}
                sx={{ mb: 2 }}
                onChange={(event) =>
                  setEditor((current) => {
                    if (current?.type === 'inventory') {
                      return {
                        ...current,
                        draft: { ...current.draft, name: event.target.value },
                      };
                    }
                    if (current?.type === 'menu') {
                      return {
                        ...current,
                        draft: { ...current.draft, name: event.target.value },
                      };
                    }
                    return current;
                  })
                }
              />
              <Box sx={{ mb: 2 }}>
                <Typography sx={controlLabelSx}>ใช้กับขนาดสาขา</Typography>
                <Stack direction="row" spacing={0.75}>
                  {sizes.map((item) => (
                    <Button
                      key={item}
                      size="small"
                      variant={
                        editor.draft.availableSizes.includes(item)
                          ? 'contained'
                          : 'outlined'
                      }
                      aria-pressed={editor.draft.availableSizes.includes(item)}
                      onClick={() =>
                        setEditor((current) => {
                          if (!current) return current;
                          const next = current.draft.availableSizes.includes(
                            item,
                          )
                            ? current.draft.availableSizes.filter(
                                (value) => value !== item,
                              )
                            : sizes.filter(
                                (value) =>
                                  current.draft.availableSizes.includes(
                                    value,
                                  ) || value === item,
                              );
                          return {
                            ...current,
                            draft: { ...current.draft, availableSizes: next },
                          } as TemplateEditorState;
                        })
                      }
                      sx={tabButtonSx(
                        editor.draft.availableSizes.includes(item),
                      )}
                    >
                      {item}
                    </Button>
                  ))}
                </Stack>
              </Box>
              {editor.type === 'inventory' ? (
                <Stack spacing={1.5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="หมวดหมู่"
                    value={editor.draft.category}
                    onChange={(event) =>
                      setEditor((current) =>
                        current?.type === 'inventory'
                          ? {
                              ...current,
                              draft: {
                                ...current.draft,
                                category: event.target.value,
                              },
                            }
                          : current,
                      )
                    }
                  />
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="ประเภท"
                    value={editor.draft.kind}
                    onChange={(event) =>
                      setEditor((current) =>
                        current?.type === 'inventory'
                          ? {
                              ...current,
                              draft: {
                                ...current.draft,
                                kind: event.target.value as
                                  'ingredient' | 'stock',
                              },
                            }
                          : current,
                      )
                    }
                  >
                    <MenuItem value="ingredient">วัตถุดิบ</MenuItem>
                    <MenuItem value="stock">อุปกรณ์ / สต๊อก</MenuItem>
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="หมวดสต๊อก"
                    value={editor.draft.stockCategory}
                    onChange={(event) =>
                      setEditor((current) =>
                        current?.type === 'inventory'
                          ? {
                              ...current,
                              draft: {
                                ...current.draft,
                                stockCategory: event.target.value,
                              },
                            }
                          : current,
                      )
                    }
                  >
                    <MenuItem value="">ไม่มีหมวดสต๊อก</MenuItem>
                    <MenuItem value="drink_equipment">
                      อุปกรณ์เครื่องดื่ม
                    </MenuItem>
                    <MenuItem value="postal_equipment">
                      อุปกรณ์ไปรษณีย์
                    </MenuItem>
                  </TextField>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="หน่วย"
                      value={editor.draft.unit}
                      onChange={(event) =>
                        setEditor((current) =>
                          current?.type === 'inventory'
                            ? {
                                ...current,
                                draft: {
                                  ...current.draft,
                                  unit: event.target.value,
                                },
                              }
                            : current,
                        )
                      }
                    />
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="ต้นทุนต่อหน่วย"
                      value={editor.draft.unitCost}
                      slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                      onChange={(event) =>
                        setEditor((current) =>
                          current?.type === 'inventory'
                            ? {
                                ...current,
                                draft: {
                                  ...current.draft,
                                  unitCost: event.target.value,
                                },
                              }
                            : current,
                        )
                      }
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="จุดแจ้งเตือน"
                      value={editor.draft.reorderLevel}
                      slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                      onChange={(event) =>
                        setEditor((current) =>
                          current?.type === 'inventory'
                            ? {
                                ...current,
                                draft: {
                                  ...current.draft,
                                  reorderLevel: event.target.value,
                                },
                              }
                            : current,
                        )
                      }
                    />
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="การจัดการสต๊อก"
                      value={String(editor.draft.trackStock)}
                      onChange={(event) =>
                        setEditor((current) =>
                          current?.type === 'inventory'
                            ? {
                                ...current,
                                draft: {
                                  ...current.draft,
                                  trackStock: event.target.value === 'true',
                                },
                              }
                            : current,
                        )
                      }
                    >
                      <MenuItem value="true">ติดตามสต๊อกและแจ้งเตือน</MenuItem>
                      <MenuItem value="false">คิดต้นทุนเท่านั้น</MenuItem>
                    </TextField>
                  </Stack>
                </Stack>
              ) : (
                <Stack spacing={1.5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="หมวดหมู่"
                    value={editor.draft.category}
                    onChange={(event) =>
                      setEditor((current) =>
                        current?.type === 'menu'
                          ? {
                              ...current,
                              draft: {
                                ...current.draft,
                                category: event.target.value,
                              },
                            }
                          : current,
                      )
                    }
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="ราคาหน้าร้าน"
                      value={editor.draft.storePrice}
                      slotProps={{ htmlInput: { min: 0, step: '1' } }}
                      onChange={(event) =>
                        setEditor((current) =>
                          current?.type === 'menu'
                            ? {
                                ...current,
                                draft: {
                                  ...current.draft,
                                  storePrice: event.target.value,
                                },
                              }
                            : current,
                        )
                      }
                    />
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="ราคา LINE MAN"
                      value={editor.draft.linemanPrice}
                      slotProps={{ htmlInput: { min: 0, step: '1' } }}
                      onChange={(event) =>
                        setEditor((current) =>
                          current?.type === 'menu'
                            ? {
                                ...current,
                                draft: {
                                  ...current.draft,
                                  linemanPrice: event.target.value,
                                },
                              }
                            : current,
                        )
                      }
                    />
                  </Stack>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="สถานะขาย"
                    value={editor.draft.status}
                    onChange={(event) =>
                      setEditor((current) =>
                        current?.type === 'menu'
                          ? {
                              ...current,
                              draft: {
                                ...current.draft,
                                status: event.target.value as
                                  'available' | 'soldout',
                              },
                            }
                          : current,
                      )
                    }
                  >
                    <MenuItem value="available">พร้อมขาย</MenuItem>
                    <MenuItem value="soldout">หมดชั่วคราว</MenuItem>
                  </TextField>
                  <Divider />
                  <Stack
                    direction="row"
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontFamily: 'Kanit, sans-serif',
                          fontWeight: 600,
                        }}
                      >
                        สูตรกลาง
                      </Typography>
                      <Typography sx={itemMetaSx}>
                        กำหนดแยกตามหน้าร้านและ LINE MAN
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!template?.inventoryItems.length}
                      onClick={() =>
                        setEditor((current) => {
                          if (current?.type !== 'menu') return current;
                          const first = template?.inventoryItems[0];
                          if (!first) return current;
                          return {
                            ...current,
                            draft: {
                              ...current.draft,
                              recipes: [
                                ...current.draft.recipes,
                                {
                                  catalogItemId: first.id,
                                  channel: 'storefront',
                                  quantity: '1',
                                },
                              ],
                            },
                          };
                        })
                      }
                    >
                      เพิ่มวัตถุดิบในสูตร
                    </Button>
                  </Stack>
                  {editor.draft.recipes.map((recipe, index) => (
                    <Stack
                      key={`${recipe.catalogItemId}-${recipe.channel}-${index}`}
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                    >
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="วัตถุดิบ"
                        value={recipe.catalogItemId}
                        onChange={(event) =>
                          setEditor((current) => {
                            if (current?.type !== 'menu') return current;
                            const recipes = [...current.draft.recipes];
                            recipes[index] = {
                              ...recipes[index],
                              catalogItemId: Number(event.target.value),
                            };
                            return {
                              ...current,
                              draft: { ...current.draft, recipes },
                            };
                          })
                        }
                      >
                        {(template?.inventoryItems ?? []).map((item) => (
                          <MenuItem key={item.id} value={item.id}>
                            {item.name} ({item.unit})
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="ช่องทาง"
                        value={recipe.channel}
                        onChange={(event) =>
                          setEditor((current) => {
                            if (current?.type !== 'menu') return current;
                            const recipes = [...current.draft.recipes];
                            recipes[index] = {
                              ...recipes[index],
                              channel: event.target.value as
                                'storefront' | 'lineman',
                            };
                            return {
                              ...current,
                              draft: { ...current.draft, recipes },
                            };
                          })
                        }
                      >
                        <MenuItem value="storefront">หน้าร้าน</MenuItem>
                        <MenuItem value="lineman">LINE MAN</MenuItem>
                      </TextField>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="จำนวน"
                        value={recipe.quantity}
                        slotProps={{ htmlInput: { min: 0.0001, step: '0.01' } }}
                        onChange={(event) =>
                          setEditor((current) => {
                            if (current?.type !== 'menu') return current;
                            const recipes = [...current.draft.recipes];
                            recipes[index] = {
                              ...recipes[index],
                              quantity: event.target.value,
                            };
                            return {
                              ...current,
                              draft: { ...current.draft, recipes },
                            };
                          })
                        }
                      />
                      <Button
                        color="error"
                        onClick={() =>
                          setEditor((current) =>
                            current?.type === 'menu'
                              ? {
                                  ...current,
                                  draft: {
                                    ...current.draft,
                                    recipes: current.draft.recipes.filter(
                                      (_, recipeIndex) => recipeIndex !== index,
                                    ),
                                  },
                                }
                              : current,
                          )
                        }
                      >
                        ลบสูตร
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              )}
              {editorError ? (
                <Alert
                  severity="error"
                  sx={{ mt: 1.5, fontFamily: 'Kanit, sans-serif' }}
                >
                  {editorError}
                </Alert>
              ) : null}
            </>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setEditor(null)}
            disabled={isSavingEditor}
            sx={{ color: '#674633', fontFamily: 'Kanit, sans-serif' }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={() => void saveEditor()}
            disabled={!editor || isSavingEditor}
            sx={tabButtonSx(true)}
          >
            {isSavingEditor ? 'กำลังบันทึก' : 'บันทึกข้อมูลกลาง'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isImpactDialogOpen}
        onClose={() => !isSyncing && setIsImpactDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="catalog-sync-dialog-title"
      >
        <DialogTitle
          id="catalog-sync-dialog-title"
          sx={{
            color: '#3c2d24',
            fontFamily: 'Kanit, sans-serif',
            fontWeight: 600,
          }}
        >
          ยืนยันการซิงก์ข้อมูลกลาง
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#eee3dc' }}>
          {impact ? (
            <>
              <Typography
                sx={{
                  color: '#3c2d24',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 14,
                }}
              >
                {impact.template.name} จะอัปเดตไปยัง{' '}
                {numberFormatter.format(impact.count)} สาขา
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  color: 'text.secondary',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 12.5,
                  lineHeight: 1.55,
                }}
              >
                ยอดคงเหลือ ล็อต วันหมดอายุ
                และประวัติของแต่ละสาขาจะไม่ถูกเปลี่ยนแปลง
              </Typography>
              <Stack
                spacing={0.75}
                sx={{ mt: 2, maxHeight: 240, overflowY: 'auto' }}
              >
                {impact.branches.map((branch) => (
                  <Box
                    key={branch.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 1,
                      px: 1.25,
                      py: 1,
                      border: '1px solid #f0e7e1',
                      borderRadius: 2,
                    }}
                  >
                    <Typography sx={itemTitleSx}>{branch.name}</Typography>
                    <Typography sx={itemMetaSx}>
                      {branch.code} · {branch.size}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              {impact.count === 0 ? (
                <Alert
                  severity="info"
                  sx={{ mt: 2, fontFamily: 'Kanit, sans-serif' }}
                >
                  ยังไม่มีสาขาที่ใช้ข้อมูลกลาง
                </Alert>
              ) : null}
            </>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <CircularProgress size={24} sx={{ color: '#805637' }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setIsImpactDialogOpen(false)}
            disabled={isSyncing}
            sx={{ color: '#674633', fontFamily: 'Kanit, sans-serif' }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={() => void syncTemplate()}
            disabled={!impact || impact.count === 0 || isSyncing}
            sx={tabButtonSx(true)}
          >
            {isSyncing ? 'กำลังซิงก์' : 'ยืนยันการซิงก์'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notice !== null}
        autoHideDuration={4_000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotice(null)}
          severity="success"
          variant="filled"
          sx={{ fontFamily: 'Kanit, sans-serif' }}
        >
          {notice}
        </Alert>
      </Snackbar>
    </DashboardMain>
  );
}

const controlLabelSx = {
  mb: 0.75,
  color: '#6c5a50',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 12,
  fontWeight: 500,
};

const sectionTitleSx = {
  color: '#3c2d24',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 16,
  fontWeight: 600,
  lineHeight: 1.35,
};

const sectionMetaSx = {
  color: 'text.secondary',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 12,
  lineHeight: 1.45,
};
