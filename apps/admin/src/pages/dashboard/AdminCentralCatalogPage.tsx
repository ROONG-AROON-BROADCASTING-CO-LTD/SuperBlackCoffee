import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DashboardMain, PageIntro } from '@stackbuild/ui';
import {
  createCatalogTemplateInventoryItem,
  createCatalogTemplateMenuItem,
  getCatalogTemplate,
  getCatalogTemplateImpact,
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
  type CatalogTemplateScope,
  type CatalogTemplateSize,
  type CatalogTemplateSummary,
} from '../../api/catalogTemplates';

const scopes: { value: CatalogTemplateScope; label: string }[] = [
  { value: 'sbc', label: 'สาขา SBC' },
  { value: 'franchise', label: 'แฟรนไชส์' },
];

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

function scopeLabel(scope: CatalogTemplateScope) {
  return scope === 'sbc' ? 'สาขา SBC' : 'แฟรนไชส์';
}

function sizeDescription(size: CatalogTemplateSize) {
  if (size === 'S') return 'น้ำและสต๊อก';
  if (size === 'M') return 'น้ำ อาหาร เบเกอรี่ และสต๊อก';
  return 'บริการครบรูปแบบ';
}

function formatCurrency(value: number) {
  return `${numberFormatter.format(value)} บาท`;
}

function nonNegativeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: CatalogTemplateSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      component="button"
      type="button"
      variant="outlined"
      onClick={onSelect}
      aria-pressed={selected}
      sx={{
        ...templateCardSx,
        width: '100%',
        p: 0,
        textAlign: 'left',
        cursor: 'pointer',
        bgcolor: selected ? '#f4ece6' : '#fff',
        borderColor: selected ? '#805637' : '#eadfd7',
        transition: 'border-color 150ms ease, background-color 150ms ease',
        '&:hover': {
          borderColor: '#805637',
          bgcolor: '#fcf8f5',
        },
        '&:focus-visible': {
          outline: '3px solid rgba(128, 86, 55, 0.25)',
          outlineOffset: 2,
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                color: '#3c2d24',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 16,
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              {template.name}
            </Typography>
            <Typography
              sx={{
                mt: 0.25,
                color: 'text.secondary',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {template.description ||
                `${sizeDescription(template.size)} · ${scopeLabel(template.scope)}`}
            </Typography>
          </Box>
          <Chip
            label={template.size}
            size="small"
            sx={{
              flexShrink: 0,
              height: 24,
              bgcolor: selected ? '#805637' : '#ede2da',
              color: selected ? '#fff' : '#674633',
              fontFamily: 'Kanit, sans-serif',
              fontWeight: 600,
            }}
          />
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
          <TemplateMetric label="เมนู" value={template.menuCount} />
          <TemplateMetric label="คลัง" value={template.inventoryCount} />
          <TemplateMetric label="สาขา" value={template.branchCount} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function TemplateMetric({ label, value }: { label: string; value: number }) {
  return (
    <Box>
      <Typography
        component="div"
        sx={{
          color: '#3c2d24',
          fontFamily: 'Kanit, sans-serif',
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.2,
        }}
      >
        {numberFormatter.format(value)}
      </Typography>
      <Typography
        component="div"
        sx={{
          color: 'text.secondary',
          fontFamily: 'Kanit, sans-serif',
          fontSize: 11,
          lineHeight: 1.35,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

function TemplateDetail({
  template,
  tab,
  onTabChange,
  onEditInventory,
  onEditMenu,
  onRetireInventory,
  onRetireMenu,
  onAdd,
}: {
  template: CatalogTemplate;
  tab: CatalogTab;
  onTabChange: (tab: CatalogTab) => void;
  onEditInventory: (item: CatalogTemplateInventoryItem) => void;
  onEditMenu: (item: CatalogTemplateMenuItem) => void;
  onRetireInventory: (item: CatalogTemplateInventoryItem) => void;
  onRetireMenu: (item: CatalogTemplateMenuItem) => void;
  onAdd: () => void;
}) {
  const items = tab === 'menu' ? template.menuItems : template.inventoryItems;
  return (
    <Card variant="outlined" sx={templateCardSx}>
      <CardContent
        sx={{
          p: { xs: 2, sm: 2.5 },
          '&:last-child': { pb: { xs: 2, sm: 2.5 } },
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1.25,
          }}
        >
          <Box>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Typography
                component="h2"
                sx={{
                  color: '#3c2d24',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 18,
                  fontWeight: 600,
                  lineHeight: 1.35,
                }}
              >
                {template.name}
              </Typography>
              <Chip
                label={`${scopeLabel(template.scope)} · ${template.size}`}
                size="small"
                sx={{
                  bgcolor: '#f1e7df',
                  color: '#674633',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 11,
                }}
              />
            </Stack>
            <Typography
              sx={{
                mt: 0.35,
                color: 'text.secondary',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {template.description ||
                `แม่แบบ ${sizeDescription(template.size)} สำหรับ${scopeLabel(template.scope)}`}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <TemplateMetric label="เมนู" value={template.menuCount} />
            <TemplateMetric label="คลัง" value={template.inventoryCount} />
          </Stack>
        </Stack>

        <Box
          role="tablist"
          aria-label="ประเภทข้อมูลในแม่แบบ"
          sx={{
            display: 'flex',
            gap: 0.75,
            mt: 2.25,
            pb: 1.5,
            borderBottom: '1px solid #eee3dc',
          }}
        >
          {catalogTabs.map((item) => (
            <Button
              key={item.value}
              role="tab"
              aria-selected={tab === item.value}
              onClick={() => onTabChange(item.value)}
              size="small"
              variant={tab === item.value ? 'contained' : 'outlined'}
              sx={tabButtonSx(tab === item.value)}
            >
              {item.label}
            </Button>
          ))}
          <Button
            size="small"
            variant="outlined"
            onClick={onAdd}
            sx={{ ...editButtonSx, ml: 'auto' }}
          >
            เพิ่ม{tab === 'menu' ? 'เมนู' : 'รายการคลัง'}
          </Button>
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
            ในแม่แบบนี้
          </Typography>
        ) : (
          <Box
            role="tabpanel"
            sx={{
              mt: 1.5,
              display: 'grid',
              gap: 0.75,
              maxHeight: 430,
              overflowY: 'auto',
              contentVisibility: 'auto',
            }}
          >
            {tab === 'menu'
              ? template.menuItems.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      p: 1.25,
                      border: '1px solid #f0e7e1',
                      borderRadius: 2,
                      bgcolor: '#fffdfc',
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={itemTitleSx}>{item.name}</Typography>
                      <Typography sx={itemMetaSx}>
                        {item.category} · สูตร {item.recipes.length} รายการ
                      </Typography>
                    </Box>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', flexShrink: 0 }}
                    >
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={itemTitleSx}>
                          {formatCurrency(item.storePrice)}
                        </Typography>
                        <Typography sx={itemMetaSx}>
                          LINE MAN {formatCurrency(item.linemanPrice)}
                        </Typography>
                      </Box>
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
              : template.inventoryItems.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      p: 1.25,
                      border: '1px solid #f0e7e1',
                      borderRadius: 2,
                      bgcolor: '#fffdfc',
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={itemTitleSx}>{item.name}</Typography>
                      <Typography sx={itemMetaSx}>
                        {item.category}
                        {item.stockCategory ? ` · ${item.stockCategory}` : ''}
                      </Typography>
                    </Box>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', flexShrink: 0 }}
                    >
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={itemTitleSx}>
                          {formatCurrency(item.unitCost)}/{item.unit}
                        </Typography>
                        <Typography sx={itemMetaSx}>
                          {item.trackStock === false
                            ? 'คิดต้นทุนเท่านั้น'
                            : 'ติดตามสต๊อก'}
                        </Typography>
                      </Box>
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
  const [scope, setScope] = useState<CatalogTemplateScope>('sbc');
  const [size, setSize] = useState<CatalogTemplateSize>('S');
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

  useEffect(() => {
    let active = true;
    setIsLoadingTemplates(true);
    setLoadError('');
    setImpact(null);
    setImpactError('');
    void listCatalogTemplates(scope, size)
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
          error instanceof Error ? error.message : 'ไม่สามารถโหลดแม่แบบกลางได้',
        );
      })
      .finally(() => {
        if (active) setIsLoadingTemplates(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey, scope, size]);

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
            : 'ไม่สามารถโหลดรายละเอียดแม่แบบได้',
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
          : 'ไม่สามารถคำนวณผลกระทบของแม่แบบได้',
      );
    } finally {
      setIsLoadingImpact(false);
    }
  };

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
        `อัปเดตแม่แบบไปยัง ${numberFormatter.format(result.syncedBranches)} สาขาแล้ว`,
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
      },
      draft: {
        name: '',
        category: 'เครื่องดื่ม',
        storePrice: '0',
        linemanPrice: '0',
        status: 'available',
        recipes: [],
      },
    });
  };

  const saveEditor = async () => {
    if (!editor || !template) return;
    setEditorError('');
    if (
      !editor.draft.name.trim() ||
      !editor.draft.category.trim() ||
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
      setNotice('บันทึกแม่แบบกลางแล้ว ตรวจผลกระทบก่อนซิงก์ไปยังสาขา');
      setReloadKey((current) => current + 1);
    } catch (error) {
      setEditorError(
        error instanceof Error ? error.message : 'ไม่สามารถบันทึกแม่แบบกลางได้',
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
      `นำ “${item.name}” ออกจากแม่แบบนี้ใช่ไหม? ข้อมูลและประวัติของสาขาจะไม่ถูกลบ และจะมีผลหลังซิงก์`,
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
      setNotice('นำรายการออกจากแม่แบบแล้ว ตรวจผลกระทบก่อนซิงก์ไปยังสาขา');
      setReloadKey((current) => current + 1);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'ไม่สามารถนำรายการออกจากแม่แบบได้',
      );
    }
  };

  return (
    <DashboardMain>
      <PageIntro
        title="สินค้าและคลังกลาง"
        description="จัดการแม่แบบเมนู สินค้า วัตถุดิบ และอุปกรณ์ตามประเภทสาขาและขนาด S / M / L"
      />

      <Card variant="outlined" sx={{ ...templateCardSx, mb: 2.5 }}>
        <CardContent
          sx={{
            p: { xs: 1.5, sm: 2 },
            '&:last-child': { pb: { xs: 1.5, sm: 2 } },
          }}
        >
          <Typography sx={controlLabelSx}>ขอบเขตแม่แบบ</Typography>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ flexWrap: 'wrap', gap: 0.75 }}
          >
            {scopes.map((item) => (
              <Button
                key={item.value}
                onClick={() => setScope(item.value)}
                variant={scope === item.value ? 'contained' : 'outlined'}
                sx={tabButtonSx(scope === item.value)}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
          <Divider sx={{ my: 1.5, borderColor: '#eee3dc' }} />
          <Typography sx={controlLabelSx}>ขนาดสาขา</Typography>
          <Stack direction="row" spacing={0.75}>
            {sizes.map((item) => (
              <Button
                key={item}
                onClick={() => setSize(item)}
                variant={size === item ? 'contained' : 'outlined'}
                sx={{ ...tabButtonSx(size === item), minWidth: 48 }}
              >
                {item}
              </Button>
            ))}
          </Stack>
        </CardContent>
      </Card>

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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(270px, 0.75fr) minmax(0, 1.6fr)',
          },
          gap: 2.5,
          alignItems: 'start',
        }}
      >
        <Box>
          <Stack
            direction="row"
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1.25,
            }}
          >
            <Typography component="h2" sx={sectionTitleSx}>
              แม่แบบ {scopeLabel(scope)} · {size}
            </Typography>
            <Typography sx={sectionMetaSx}>
              {isLoadingTemplates
                ? 'กำลังโหลด'
                : `${numberFormatter.format(templates.length)} รายการ`}
            </Typography>
          </Stack>
          {isLoadingTemplates ? (
            <Card variant="outlined" sx={templateCardSx}>
              <CardContent sx={{ py: 5, textAlign: 'center' }}>
                <CircularProgress size={24} sx={{ color: '#805637' }} />
              </CardContent>
            </Card>
          ) : templates.length === 0 ? (
            <Card variant="outlined" sx={templateCardSx}>
              <CardContent sx={{ py: 4, textAlign: 'center' }}>
                <Typography sx={{ ...sectionMetaSx, fontSize: 13 }}>
                  ยังไม่มีแม่แบบกลางในขอบเขตนี้
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Stack spacing={1.25}>
              {templates.map((item) => (
                <TemplateCard
                  key={item.id}
                  template={item}
                  selected={item.id === selectedTemplateId}
                  onSelect={() => {
                    setSelectedTemplateId(item.id);
                    setImpact(null);
                    setImpactError('');
                  }}
                />
              ))}
            </Stack>
          )}
        </Box>

        <Box>
          {isLoadingTemplate ? (
            <Card variant="outlined" sx={templateCardSx}>
              <CardContent sx={{ py: 10, textAlign: 'center' }}>
                <CircularProgress size={26} sx={{ color: '#805637' }} />
              </CardContent>
            </Card>
          ) : template ? (
            <>
              <TemplateDetail
                template={template}
                tab={activeTab}
                onTabChange={setActiveTab}
                onEditInventory={openInventoryEditor}
                onEditMenu={openMenuEditor}
                onRetireInventory={(item) => void retireItem('inventory', item)}
                onRetireMenu={(item) => void retireItem('menu', item)}
                onAdd={openCreateEditor}
              />
              <Card variant="outlined" sx={{ ...templateCardSx, mt: 2 }}>
                <CardContent
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    '&:last-child': { pb: { xs: 2, sm: 2.5 } },
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    sx={{
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      justifyContent: 'space-between',
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
                        อัปเดตเมนู สูตร ราคา และข้อมูลคลังจากแม่แบบ
                        โดยไม่ทับยอดจริง ล็อต หรือประวัติของสาขา
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
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
                        แม่แบบนี้จะกระทบ {numberFormatter.format(impact.count)}{' '}
                        สาขา · เลือก “ซิงก์ไปยังสาขา” เพื่อยืนยัน
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
            </>
          ) : (
            <Card variant="outlined" sx={templateCardSx}>
              <CardContent sx={{ py: 10, textAlign: 'center' }}>
                <Typography sx={{ ...sectionMetaSx, fontSize: 13 }}>
                  {selectedSummary
                    ? 'ไม่สามารถโหลดรายละเอียดแม่แบบนี้ได้'
                    : 'เลือกแม่แบบเพื่อดูเมนูและรายการคลัง'}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
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
            {isSavingEditor ? 'กำลังบันทึก' : 'บันทึกแม่แบบ'}
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
          ยืนยันการซิงก์แม่แบบ
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
                  ยังไม่มีสาขาที่ใช้แม่แบบนี้
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
