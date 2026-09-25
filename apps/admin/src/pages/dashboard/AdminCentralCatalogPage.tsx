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
  Drawer,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  DashboardMain,
  DrawerActionBar,
  ActionSnackbar,
  ItemActionButtons,
  PageIntro,
  SearchField,
  selectionPillSx,
  XIcon,
  useMinimumLoading,
  coffeeIngredientsImage,
  inventoryUnitSelectSlotProps,
} from '@stackbuild/ui';
import {
  createCatalogTemplateInventoryItem,
  createCatalogTemplateMenuItem,
  getCatalogTemplate,
  getCatalogTemplateImpact,
  getCatalogSyncJob,
  getLatestCatalogSyncJob,
  listBranchCatalogSelections,
  setBranchCatalogSelection,
  listCatalogTemplates,
  retireCatalogTemplateInventoryItem,
  retireCatalogTemplateMenuItem,
  replaceCatalogTemplateMenuRecipes,
  retryCatalogSyncJob,
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
  type CatalogSyncJob,
} from '../../api/catalogTemplates';
import { AdminCentralCatalogSkeleton } from '../../components/skeletons/AdminCentralCatalogSkeleton';
import { LoaderIcon } from '../../components/LoaderIcon';

const sizes: CatalogTemplateSize[] = ['S', 'M', 'L'];
const menuCategories = [
  'เมนูร้อน',
  'เมนูกาแฟเย็น',
  'เมนูชา',
  'โซดา',
  'เมนูน้ำอัดลม',
  'เมนูปั่น',
  'เมนูอโวคาโด',
  'เมนูชาร้อน',
  'อาหาร',
  'เบเกอรี่',
];

const catalogTabs = [
  { value: 'menu', label: 'เมนูและสินค้า' },
  { value: 'ingredient', label: 'วัตถุดิบ' },
  { value: 'equipment', label: 'อุปกรณ์' },
] as const;

type CatalogTab = (typeof catalogTabs)[number]['value'];
type ImpactDialogMode = 'preview' | 'sync' | null;

export type CentralCatalogSection =
  | 'menus'
  | 'ingredients'
  | 'fresh-ingredients'
  | 'drink-equipment'
  | 'postal-equipment'
  | 'branches'
  | 'sync';

const sectionContent: Record<
  CentralCatalogSection,
  { title: string; description: string }
> = {
  menus: {
    title: 'เมนูและสินค้ากลาง',
    description:
      'จัดการเมนู ราคา และสูตรกลาง พร้อมเลือกขนาดสาขา S / M / L ที่ใช้',
  },
  ingredients: {
    title: 'วัตถุดิบกลาง',
    description:
      'จัดการวัตถุดิบทั่วไป ต้นทุน และจุดแจ้งเตือนสำหรับแต่ละขนาดสาขา',
  },
  'fresh-ingredients': {
    title: 'วัตถุดิบของสดกลาง',
    description: 'จัดการวัตถุดิบของสดที่ใช้ในข้อมูลกลาง',
  },
  'drink-equipment': {
    title: 'อุปกรณ์เครื่องดื่มกลาง',
    description: 'จัดการอุปกรณ์เครื่องดื่มที่ใช้ในข้อมูลกลาง',
  },
  'postal-equipment': {
    title: 'อุปกรณ์ไปรษณีย์กลาง',
    description: 'จัดการอุปกรณ์ไปรษณีย์ที่ใช้ในข้อมูลกลาง',
  },
  branches: {
    title: 'รายการสาขาและแฟรนไชส์',
    description:
      'เลือกรายการที่ใช้ในสาขา SBC และแฟรนไชส์ พร้อมตรวจผลกระทบก่อนซิงก์ข้อมูลกลาง',
  },
  sync: {
    title: 'รายการสาขาและแฟรนไชส์',
    description:
      'เลือกรายการที่ใช้ในสาขา SBC และแฟรนไชส์ พร้อมตรวจผลกระทบก่อนซิงก์ข้อมูลกลาง',
  },
};

function matchesInventorySection(
  item: CatalogTemplateInventoryItem,
  section: CentralCatalogSection,
) {
  if (section === 'fresh-ingredients')
    return item.kind === 'ingredient' && item.category === 'fresh';
  if (section === 'ingredients')
    return item.kind === 'ingredient' && item.category !== 'fresh';
  if (section === 'drink-equipment')
    return item.kind === 'stock' && item.stockCategory !== 'postal_equipment';
  return item.kind === 'stock' && item.stockCategory === 'postal_equipment';
}

type InventoryEditorState = {
  type: 'inventory';
  item: CatalogTemplateInventoryItem;
  draft: {
    name: string;
    imageUrl: string;
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
    costPrice: string;
    linemanCostPrice: string;
    imageUrl: string;
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

type RetireTarget = {
  type: 'inventory' | 'menu';
  id: number;
  name: string;
};

const templateCardSx = {
  borderColor: '#eadfd7',
  boxShadow: 'none',
  borderRadius: 1,
};

const branchTableHeaderSx = {
  bgcolor: '#faf8f6',
  borderColor: '#eadfd7',
  color: '#674633',
  fontFamily: 'Kanit, sans-serif',
  fontSize: 12,
  fontWeight: 600,
};

const tableColumns = {
  xs: '52px minmax(0,1fr) auto',
  // Keep each compact value to the space it actually needs. The product name
  // is the only variable-length field, while the action pair needs a fixed
  // width so its two buttons remain easy to press.
  lg: '48px minmax(0,1fr) 64px 56px 80px 88px 200px',
};

function CatalogThumbnail({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [imageUrl]);
  const hasItemImage = Boolean(imageUrl) && !imageFailed;
  return (
    <Box
      component="img"
      src={hasItemImage ? imageUrl : coffeeIngredientsImage}
      alt={hasItemImage ? `รูป${name}` : 'ภาพประกอบรายการ'}
      onError={() => setImageFailed(true)}
      sx={{
        width: 52,
        height: 52,
        borderRadius: '10px',
        objectFit: 'cover',
        bgcolor: '#f5eee8',
        border: '1px solid #eadfd7',
      }}
    />
  );
}

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
  menuCategory,
  onSearchChange,
  onMenuCategoryChange,
  onSizeChange,
  section,
  onEditInventory,
  onEditMenu,
  retireTarget,
  onRequestRetire,
  onCancelRetire,
  onConfirmRetire,
  onAdd,
}: {
  template: CatalogTemplate;
  size: CatalogTemplateSize | 'ALL';
  search: string;
  menuCategory: string;
  onSearchChange: (value: string) => void;
  onMenuCategoryChange: (value: string) => void;
  onSizeChange: (value: CatalogTemplateSize | 'ALL') => void;
  section: CentralCatalogSection;
  onEditInventory: (item: CatalogTemplateInventoryItem) => void;
  onEditMenu: (item: CatalogTemplateMenuItem) => void;
  retireTarget: RetireTarget | null;
  onRequestRetire: (target: RetireTarget) => void;
  onCancelRetire: () => void;
  onConfirmRetire: () => void;
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
    (!isMenuSection ||
      menuCategory === 'ALL' ||
      item.category === menuCategory) &&
    `${item.name} ${item.category}`
      .toLocaleLowerCase('th-TH')
      .includes(normalizedSearch);
  const isMenuSection = section === 'menus';
  const menuCategoryOptions = [
    ...new Set(template.menuItems.map((item) => item.category).filter(Boolean)),
  ].sort((left, right) => left.localeCompare(right, 'th-TH'));
  const visibleMenus = isMenuSection ? template.menuItems.filter(matches) : [];
  const visibleInventory = isMenuSection
    ? []
    : template.inventoryItems.filter(
        (item) => matchesInventorySection(item, section) && matches(item),
      );
  const items = isMenuSection ? visibleMenus : visibleInventory;
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, pageCount - 1);
  const pageStart = page * pageSize;
  return (
    <Card
      variant="outlined"
      sx={{
        ...templateCardSx,
        overflow: 'hidden',
      }}
    >
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ p: 2, gap: 1, alignItems: { md: 'center' } }}
        >
          <SearchField
            size="small"
            placeholder="ค้นหารายการกลาง"
            value={search}
            onChange={(event) => {
              setRequestedPage(0);
              onSearchChange(event.target.value);
            }}
            sx={{ flex: 1, minWidth: 180 }}
          />
          {isMenuSection && (
            <TextField
              select
              size="small"
              label="ประเภทเมนู"
              value={menuCategory || 'ALL'}
              onChange={(event) => {
                setRequestedPage(0);
                onMenuCategoryChange(event.target.value || 'ALL');
              }}
              sx={{ minWidth: { xs: '100%', sm: 190 } }}
            >
              <MenuItem value="ALL">ทุกประเภทเมนู</MenuItem>
              {menuCategoryOptions.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>
          )}
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
                {item === 'ALL' ? 'ทุกขนาด' : `ขนาด ${item}`}
              </Button>
            ))}
          </Stack>
          <Button
            variant="contained"
            onClick={onAdd}
            sx={{ ...tabButtonSx(true), minHeight: 38, whiteSpace: 'nowrap' }}
          >
            + เพิ่ม{isMenuSection ? 'เมนู' : sectionContent[section].title}
          </Button>
        </Stack>

        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: '#faf8f6',
            borderBlock: '1px solid #eee3dc',
          }}
        >
          <Typography sx={itemMetaSx}>
            {numberFormatter.format(items.length)} รายการ
          </Typography>
        </Box>
        <Box
          role="row"
          sx={{
            display: { xs: 'none', lg: 'grid' },
            gridTemplateColumns: tableColumns,
            alignItems: 'center',
            columnGap: 2,
            px: 2,
            py: 1,
            bgcolor: '#faf8f6',
            borderBottom: '1px solid #eee3dc',
          }}
        >
          {[
            'รูป',
            'ชื่อรายการ',
            'หมวดหมู่',
            'ขนาดที่ใช้',
            isMenuSection ? 'ราคาหน้าร้าน' : 'ต้นทุนต่อหน่วย',
            isMenuSection ? 'ราคา LINE MAN' : 'จุดสั่งซื้อ',
            'จัดการ',
          ].map((label, index) => (
            <Typography
              key={label}
              role="columnheader"
              sx={{
                ...itemMetaSx,
                textAlign: index === 4 || index === 5 ? 'right' : 'left',
                ...(index === 6 && {
                  borderLeft: '1px solid #eee3dc',
                  pl: 2,
                }),
              }}
            >
              {label}
            </Typography>
          ))}
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
            ยังไม่มี{sectionContent[section].title}
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
            {isMenuSection
              ? visibleMenus
                  .slice(pageStart, pageStart + pageSize)
                  .map((item) => {
                    const isRetiring =
                      retireTarget?.type === 'menu' &&
                      retireTarget.id === item.id;
                    return (
                      <Box
                        key={item.id}
                        role="row"
                        sx={{
                          position: 'relative',
                          display: 'grid',
                          gridTemplateColumns: tableColumns,
                          alignItems: 'center',
                          columnGap: 2,
                          px: 2,
                          py: 1.25,
                          borderBottom: '1px solid #f0e7e1',
                        }}
                      >
                        <>
                          <CatalogThumbnail
                            name={item.name}
                            imageUrl={item.imageUrl}
                          />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={itemTitleSx}>
                              {item.name}
                            </Typography>
                            <Typography sx={itemMetaSx}>
                              สูตร {item.recipes.length} รายการ
                            </Typography>
                            <Typography
                              sx={{
                                ...itemMetaSx,
                                display: { xs: 'block', lg: 'none' },
                              }}
                            >
                              {item.category} ·{' '}
                              {item.availableSizes.join(' / ')}
                              <br />
                              หน้าร้าน {formatCurrency(item.storePrice)} · LINE
                              MAN {formatCurrency(item.linemanPrice)}
                            </Typography>
                          </Box>
                          <Typography
                            sx={{
                              ...itemMetaSx,
                              display: { xs: 'none', lg: 'block' },
                            }}
                          >
                            {item.category}
                          </Typography>
                          <Typography
                            sx={{
                              ...itemMetaSx,
                              display: { xs: 'none', lg: 'block' },
                            }}
                          >
                            {item.availableSizes.join(' / ')}
                          </Typography>
                          <Typography
                            sx={{
                              ...itemTitleSx,
                              display: { xs: 'none', lg: 'block' },
                              textAlign: 'right',
                            }}
                          >
                            {formatCurrency(item.storePrice)}
                          </Typography>
                          <Typography
                            sx={{
                              ...itemTitleSx,
                              display: { xs: 'none', lg: 'block' },
                              textAlign: 'right',
                            }}
                          >
                            {formatCurrency(item.linemanPrice)}
                          </Typography>
                        </>
                        <ItemActionButtons
                          editLabel="แก้ไข"
                          deleteLabel="นำออก"
                          onEdit={() => onEditMenu(item)}
                          onDelete={() =>
                            onRequestRetire({
                              type: 'menu',
                              id: item.id,
                              name: item.name,
                            })
                          }
                          sx={{
                            flexShrink: 0,
                            borderLeft: '1px solid #f0e7e1',
                            pl: 2,
                          }}
                        />
                        {isRetiring ? (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              zIndex: 2,
                              display: 'grid',
                              gridTemplateColumns: tableColumns,
                              alignItems: 'center',
                              columnGap: 2,
                              px: 2,
                              bgcolor: 'rgba(32,25,20,.94)',
                              color: '#fff',
                            }}
                          >
                            <Box
                              sx={{
                                gridColumn: { xs: '1 / 3', lg: '1 / 7' },
                                minWidth: 0,
                                textAlign: 'center',
                              }}
                            >
                              <Typography
                                sx={{
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 15,
                                  fontWeight: 700,
                                }}
                              >
                                ยืนยันการนำรายการออก?
                              </Typography>
                              <Typography
                                sx={{
                                  color: 'rgba(255,255,255,.75)',
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 12,
                                }}
                              >
                                {item.name} จะถูกนำออกหลังซิงก์ข้อมูลกลาง
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                gridColumn: { xs: 3, lg: 7 },
                                display: 'flex',
                                gap: 1,
                                minWidth: 0,
                                borderLeft: '1px solid rgba(255,255,255,.3)',
                                pl: 2,
                              }}
                            >
                              <Button
                                fullWidth
                                onClick={onCancelRetire}
                                sx={{
                                  flex: 1,
                                  minWidth: 0,
                                  minHeight: 40,
                                  borderRadius: '12px',
                                  color: '#fff',
                                  border: '1px solid rgba(255,255,255,.45)',
                                  fontFamily: 'Kanit, sans-serif',
                                  fontWeight: 700,
                                }}
                              >
                                ยกเลิก
                              </Button>
                              <Button
                                fullWidth
                                variant="contained"
                                color="error"
                                onClick={onConfirmRetire}
                                sx={{
                                  flex: 1,
                                  minWidth: 0,
                                  minHeight: 40,
                                  borderRadius: '12px',
                                  fontFamily: 'Kanit, sans-serif',
                                  fontWeight: 700,
                                  boxShadow: 'none',
                                  '&:hover': { boxShadow: 'none' },
                                }}
                              >
                                ยืนยัน
                              </Button>
                            </Box>
                          </Box>
                        ) : null}
                      </Box>
                    );
                  })
              : visibleInventory
                  .slice(pageStart, pageStart + pageSize)
                  .map((item) => {
                    const isRetiring =
                      retireTarget?.type === 'inventory' &&
                      retireTarget.id === item.id;
                    return (
                      <Box
                        key={item.id}
                        role="row"
                        sx={{
                          position: 'relative',
                          display: 'grid',
                          gridTemplateColumns: tableColumns,
                          alignItems: 'center',
                          columnGap: 2,
                          px: 2,
                          py: 1.25,
                          borderBottom: '1px solid #f0e7e1',
                        }}
                      >
                        <>
                          <CatalogThumbnail
                            name={item.name}
                            imageUrl={item.imageUrl}
                          />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={itemTitleSx}>
                              {item.name}
                            </Typography>
                            <Typography sx={itemMetaSx}>
                              {item.trackStock === false
                                ? 'คิดต้นทุนเท่านั้น'
                                : 'ติดตามสต๊อก'}
                            </Typography>
                            <Typography
                              sx={{
                                ...itemMetaSx,
                                display: { xs: 'block', lg: 'none' },
                              }}
                            >
                              {item.category} ·{' '}
                              {item.availableSizes.join(' / ')} ·{' '}
                              {formatCurrency(item.unitCost)}/{item.unit}
                              {item.trackStock !== false
                                ? ` · จุดสั่งซื้อ ${numberFormatter.format(item.reorderLevel)} ${item.unit}`
                                : ''}
                            </Typography>
                          </Box>
                          <Typography
                            sx={{
                              ...itemMetaSx,
                              display: { xs: 'none', lg: 'block' },
                            }}
                          >
                            {item.category}
                          </Typography>
                          <Typography
                            sx={{
                              ...itemMetaSx,
                              display: { xs: 'none', lg: 'block' },
                            }}
                          >
                            {item.availableSizes.join(' / ')}
                          </Typography>
                          <Typography
                            sx={{
                              ...itemTitleSx,
                              display: { xs: 'none', lg: 'block' },
                              textAlign: 'right',
                            }}
                          >
                            {formatCurrency(item.unitCost)}/{item.unit}
                          </Typography>
                          <Typography
                            sx={{
                              ...itemTitleSx,
                              display: { xs: 'none', lg: 'block' },
                              textAlign: 'right',
                            }}
                          >
                            {item.trackStock === false
                              ? '—'
                              : `${numberFormatter.format(item.reorderLevel)} ${item.unit}`}
                          </Typography>
                        </>
                        <ItemActionButtons
                          editLabel="แก้ไข"
                          deleteLabel="นำออก"
                          onEdit={() => onEditInventory(item)}
                          onDelete={() =>
                            onRequestRetire({
                              type: 'inventory',
                              id: item.id,
                              name: item.name,
                            })
                          }
                          sx={{
                            flexShrink: 0,
                            borderLeft: '1px solid #f0e7e1',
                            pl: 2,
                          }}
                        />
                        {isRetiring ? (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              zIndex: 2,
                              display: 'grid',
                              gridTemplateColumns: tableColumns,
                              alignItems: 'center',
                              columnGap: 2,
                              px: 2,
                              bgcolor: 'rgba(32,25,20,.94)',
                              color: '#fff',
                            }}
                          >
                            <Box
                              sx={{
                                gridColumn: { xs: '1 / 3', lg: '1 / 7' },
                                minWidth: 0,
                                textAlign: 'center',
                              }}
                            >
                              <Typography
                                sx={{
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 15,
                                  fontWeight: 700,
                                }}
                              >
                                ยืนยันการนำรายการออก?
                              </Typography>
                              <Typography
                                sx={{
                                  color: 'rgba(255,255,255,.75)',
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 12,
                                }}
                              >
                                {item.name} จะถูกนำออกหลังซิงก์ข้อมูลกลาง
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                gridColumn: { xs: 3, lg: 7 },
                                display: 'flex',
                                gap: 1,
                                minWidth: 0,
                                borderLeft: '1px solid rgba(255,255,255,.3)',
                                pl: 2,
                              }}
                            >
                              <Button
                                fullWidth
                                onClick={onCancelRetire}
                                sx={{
                                  flex: 1,
                                  minWidth: 0,
                                  minHeight: 40,
                                  borderRadius: '12px',
                                  color: '#fff',
                                  border: '1px solid rgba(255,255,255,.45)',
                                  fontFamily: 'Kanit, sans-serif',
                                  fontWeight: 700,
                                }}
                              >
                                ยกเลิก
                              </Button>
                              <Button
                                fullWidth
                                variant="contained"
                                color="error"
                                onClick={onConfirmRetire}
                                sx={{
                                  flex: 1,
                                  minWidth: 0,
                                  minHeight: 40,
                                  borderRadius: '12px',
                                  fontFamily: 'Kanit, sans-serif',
                                  fontWeight: 700,
                                  boxShadow: 'none',
                                  '&:hover': { boxShadow: 'none' },
                                }}
                              >
                                ยืนยัน
                              </Button>
                            </Box>
                          </Box>
                        ) : null}
                      </Box>
                    );
                  })}
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
  borderRadius: '12px',
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
    borderRadius: '12px',
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

export function AdminCentralCatalogPage({
  section = 'menus',
}: {
  section?: CentralCatalogSection;
}) {
  const [size, setSize] = useState<CatalogTemplateSize | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [menuCategory, setMenuCategory] = useState('ALL');
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
  const [impactDialogMode, setImpactDialogMode] =
    useState<ImpactDialogMode>(null);
  const [showDrawerImpact, setShowDrawerImpact] = useState(false);
  const [isCentralCatalogDrawerOpen, setIsCentralCatalogDrawerOpen] =
    useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [syncJob, setSyncJob] = useState<CatalogSyncJob | null>(null);
  const [displayedSyncJobId, setDisplayedSyncJobId] = useState<number | null>(
    null,
  );
  const [displayedCompletedBranches, setDisplayedCompletedBranches] =
    useState(0);
  const [syncStatusError, setSyncStatusError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<TemplateEditorState | null>(null);
  const [retireTarget, setRetireTarget] = useState<RetireTarget | null>(null);
  const [isSavingEditor, setIsSavingEditor] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [recipeChannel, setRecipeChannel] = useState<'storefront' | 'lineman'>(
    'storefront',
  );
  const [branchId, setBranchId] = useState<number | null>(null);
  const [branchSearch, setBranchSearch] = useState('');
  const [branchPage, setBranchPage] = useState(0);
  const [branchSelections, setBranchSelections] = useState<Set<string>>(
    new Set(),
  );
  const [selectionError, setSelectionError] = useState('');
  const [selectionReloadKey, setSelectionReloadKey] = useState(0);
  const [isSavingSelection, setIsSavingSelection] = useState(false);
  const [isLoadingSelections, setIsLoadingSelections] = useState(false);
  const showCatalogSkeleton = useMinimumLoading(
    isLoadingTemplates || isLoadingTemplate,
  );

  useEffect(() => {
    setSearch('');
    setSize('ALL');
    setMenuCategory('ALL');
  }, [section]);

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
    setBranchSelections(new Set());
    setIsLoadingSelections(true);
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
      })
      .finally(() => {
        if (active) setIsLoadingSelections(false);
      });
    return () => {
      active = false;
    };
  }, [branchId, reloadKey, selectionReloadKey]);

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

  useEffect(() => {
    if (
      selectedTemplateId === null ||
      (section !== 'branches' && section !== 'sync')
    )
      return;
    let active = true;
    setSyncJob(null);
    setSyncStatusError('');
    void getLatestCatalogSyncJob(selectedTemplateId)
      .then((job) => {
        if (
          active &&
          job &&
          (job.status === 'pending' || job.status === 'processing')
        ) {
          setSyncJob(job);
        }
      })
      .catch(() => {
        if (active) setSyncStatusError('ไม่สามารถอ่านสถานะงานซิงก์ได้');
      });
    return () => {
      active = false;
    };
  }, [selectedTemplateId, section]);

  useEffect(() => {
    if (
      selectedTemplateId === null ||
      !syncJob ||
      (syncJob.status !== 'pending' && syncJob.status !== 'processing')
    )
      return;
    let active = true;
    const timer = window.setTimeout(() => {
      void getCatalogSyncJob(selectedTemplateId, syncJob.id)
        .then((job) => {
          if (!active) return;
          setSyncStatusError('');
          setSyncJob(job);
          if (
            job.status === 'completed' ||
            job.status === 'partial_failed' ||
            job.status === 'failed'
          ) {
            setReloadKey((current) => current + 1);
          }
        })
        .catch(() => {
          if (active) {
            setSyncStatusError('อัปเดตสถานะงานซิงก์ไม่สำเร็จ กำลังลองใหม่');
            setSyncJob((current) =>
              current?.id === syncJob.id ? { ...current } : current,
            );
          }
        });
    }, 2000);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [selectedTemplateId, syncJob]);

  useEffect(() => {
    if (!syncJob) {
      setDisplayedSyncJobId(null);
      setDisplayedCompletedBranches(0);
      return;
    }
    if (displayedSyncJobId !== syncJob.id) {
      setDisplayedSyncJobId(syncJob.id);
      setDisplayedCompletedBranches(0);
    }
  }, [displayedSyncJobId, syncJob]);

  useEffect(() => {
    if (
      !syncJob ||
      displayedSyncJobId !== syncJob.id ||
      displayedCompletedBranches >= syncJob.completedBranches
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      setDisplayedCompletedBranches((current) =>
        Math.min(current + 1, syncJob.completedBranches),
      );
    }, 260);
    return () => window.clearTimeout(timer);
  }, [displayedCompletedBranches, displayedSyncJobId, syncJob]);

  const previewImpact = async (dialogMode: Exclude<ImpactDialogMode, null>) => {
    if (selectedTemplateId === null) return;
    setImpactError('');
    setIsLoadingImpact(true);
    try {
      const nextImpact = await getCatalogTemplateImpact(selectedTemplateId);
      setImpact(nextImpact);
      if (dialogMode === 'sync') setImpactDialogMode('sync');
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
    setImpact(null);
    setIsLoadingImpact(true);
    setImpactError('');
    void getCatalogTemplateImpact(selectedTemplateId)
      .then((result) => {
        if (active) setImpact(result);
      })
      .catch(() => {
        if (active) setImpactError('ไม่สามารถโหลดผลกระทบของข้อมูลกลางได้');
      })
      .finally(() => {
        if (active) setIsLoadingImpact(false);
      });
    return () => {
      active = false;
    };
  }, [selectedTemplateId, reloadKey]);

  const openSyncDialog = () => {
    if (impact) {
      setImpactDialogMode('sync');
      return;
    }
    void previewImpact('sync');
  };

  const syncTemplate = async () => {
    if (selectedTemplateId === null || !impact || impact.count === 0) return;
    setIsSyncing(true);
    try {
      const result = await syncCatalogTemplate(selectedTemplateId);
      setImpactDialogMode(null);
      setSyncJob(result);
      setSyncStatusError('');
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

  const retryFailedSync = async () => {
    if (selectedTemplateId === null || !syncJob) return;
    setIsRetryingSync(true);
    try {
      const job = await retryCatalogSyncJob(selectedTemplateId, syncJob.id);
      setSyncJob(job);
      setSyncStatusError('');
    } catch (error) {
      setSyncStatusError(
        error instanceof Error ? error.message : 'ไม่สามารถลองซิงก์ใหม่ได้',
      );
    } finally {
      setIsRetryingSync(false);
    }
  };

  const visibleCompletedBranches =
    syncJob?.id === displayedSyncJobId ? displayedCompletedBranches : 0;
  const hasUnrenderedSyncProgress =
    syncJob !== null && visibleCompletedBranches < syncJob.completedBranches;

  const syncNotice = syncJob
    ? {
        message:
          syncJob.status === 'completed'
            ? `ซิงก์ข้อมูลกลางครบ ${numberFormatter.format(visibleCompletedBranches)}/${numberFormatter.format(syncJob.totalBranches)} สาขาแล้ว`
            : syncJob.status === 'partial_failed' || syncJob.status === 'failed'
              ? `ซิงก์ข้อมูลกลาง ${numberFormatter.format(visibleCompletedBranches)}/${numberFormatter.format(syncJob.totalBranches)} สาขา · ล้มเหลว ${numberFormatter.format(syncJob.failedBranches)} สาขา`
              : `กำลังซิงก์ข้อมูลกลาง ${numberFormatter.format(visibleCompletedBranches)}/${numberFormatter.format(syncJob.totalBranches)} สาขา`,
        severity:
          syncJob.status === 'completed'
            ? ('success' as const)
            : syncJob.status === 'partial_failed' || syncJob.status === 'failed'
              ? ('error' as const)
              : ('info' as const),
      }
    : syncStatusError
      ? { message: syncStatusError, severity: 'warning' as const }
      : null;

  const canDismissSyncNotice =
    !hasUnrenderedSyncProgress &&
    (syncJob?.status === 'completed' ||
      syncJob?.status === 'partial_failed' ||
      syncJob?.status === 'failed');

  const isSyncInProgress =
    syncJob?.status === 'pending' ||
    syncJob?.status === 'processing' ||
    hasUnrenderedSyncProgress;

  const syncNoticeContent = syncJob ? (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Typography
        component="span"
        sx={{
          color: 'inherit',
          fontFamily: 'Kanit, sans-serif',
          fontSize: 13,
          fontWeight: 500,
          lineHeight: 1.2,
        }}
      >
        {syncJob.status === 'completed' && !hasUnrenderedSyncProgress
          ? 'ซิงก์ข้อมูลกลางสำเร็จ'
          : syncJob.status === 'partial_failed' || syncJob.status === 'failed'
            ? `ซิงก์ไม่ครบ · ล้มเหลว ${numberFormatter.format(syncJob.failedBranches)} สาขา`
            : 'กำลังซิงก์ข้อมูลกลาง'}
      </Typography>
      <Typography
        component="span"
        sx={{
          color: '#fff',
          fontFamily: 'Kanit, sans-serif',
          fontSize: 20,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 700,
          letterSpacing: 0.2,
          lineHeight: 1.2,
        }}
      >
        {numberFormatter.format(visibleCompletedBranches)}/
        {numberFormatter.format(syncJob.totalBranches)} สาขา
      </Typography>
    </Stack>
  ) : undefined;

  const openInventoryEditor = (item: CatalogTemplateInventoryItem) => {
    setEditorError('');
    setEditor({
      type: 'inventory',
      item,
      draft: {
        name: item.name,
        imageUrl: item.imageUrl ?? '',
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
    setRecipeChannel('storefront');
    setEditor({
      type: 'menu',
      item,
      draft: {
        name: item.name,
        category: item.category,
        storePrice: String(item.storePrice),
        linemanPrice: String(item.linemanPrice),
        costPrice: String(item.costPrice ?? 0),
        linemanCostPrice: String(item.linemanCostPrice ?? 0),
        imageUrl: item.imageUrl ?? '',
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
    if (section !== 'menus') {
      const stockSection =
        section === 'drink-equipment' || section === 'postal-equipment';
      const freshSection = section === 'fresh-ingredients';
      setEditor({
        type: 'inventory',
        item: {
          id: 0,
          name: '',
          category: freshSection ? 'fresh' : 'other',
          stockCategory:
            section === 'postal-equipment'
              ? 'postal_equipment'
              : stockSection
                ? 'drink_equipment'
                : undefined,
          kind: stockSection ? 'stock' : 'ingredient',
          unit: stockSection ? 'ชิ้น' : 'กรัม',
          unitCost: 0,
          reorderLevel: 0,
          trackStock: true,
          availableSizes: size === 'ALL' ? [...sizes] : [size],
        },
        draft: {
          name: '',
          imageUrl: '',
          category: freshSection ? 'fresh' : 'other',
          stockCategory:
            section === 'postal-equipment'
              ? 'postal_equipment'
              : stockSection
                ? 'drink_equipment'
                : '',
          kind: stockSection ? 'stock' : 'ingredient',
          unit: stockSection ? 'ชิ้น' : 'กรัม',
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
        category: 'เมนูร้อน',
        storePrice: 0,
        linemanPrice: 0,
        status: 'available',
        recipes: [],
        availableSizes: [],
      },
      draft: {
        name: '',
        category: 'เมนูร้อน',
        storePrice: '0',
        linemanPrice: '0',
        costPrice: '0',
        linemanCostPrice: '0',
        imageUrl: '',
        status: 'available',
        recipes: [],
        availableSizes: [],
      },
    });
    setRecipeChannel('storefront');
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
    const costPrice =
      editor.type === 'menu' ? nonNegativeNumber(editor.draft.costPrice) : null;
    const linemanCostPrice =
      editor.type === 'menu'
        ? nonNegativeNumber(editor.draft.linemanCostPrice)
        : null;
    if (
      (editor.type === 'inventory' &&
        (unitCost === null || reorderLevel === null)) ||
      (editor.type === 'menu' &&
        (storePrice === null ||
          linemanPrice === null ||
          costPrice === null ||
          linemanCostPrice === null))
    ) {
      setEditorError('ราคาและจุดแจ้งเตือนต้องเป็นเลขศูนย์หรือมากกว่า');
      return;
    }

    setIsSavingEditor(true);
    try {
      if (editor.type === 'inventory') {
        const data: CatalogTemplateInventoryPatch = {
          name: editor.draft.name.trim(),
          category: editor.draft.category.trim(),
          imageUrl: editor.draft.imageUrl,
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
            ...data,
            name: editor.draft.name.trim(),
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
          name: editor.draft.name.trim(),
          category: editor.draft.category.trim(),
          storePrice: storePrice!,
          linemanPrice: linemanPrice!,
          costPrice: costPrice!,
          linemanCostPrice: linemanCostPrice!,
          imageUrl: editor.draft.imageUrl,
          status: editor.draft.status,
          availableSizes: editor.draft.availableSizes,
        };
        const saved =
          editor.item.id === 0
            ? await createCatalogTemplateMenuItem(template.id, {
                ...data,
                name: editor.draft.name.trim(),
              })
            : await updateCatalogTemplateMenuItem(
                template.id,
                editor.item.id,
                data,
              );
        // A newly created menu has no recipe until the user adds ingredients.
        // Existing menus still send an empty array to intentionally clear recipes.
        if (recipes.length > 0 || editor.item.id !== 0) {
          await replaceCatalogTemplateMenuRecipes(
            template.id,
            saved.id,
            recipes,
          );
        }
      }
      setEditor(null);
      setImpact(null);
      setImpactError('');
      setNotice('บันทึกข้อมูลกลางแล้ว ตรวจผลกระทบก่อนซิงก์ไปยังสาขา');
      setReloadKey((current) => current + 1);
      // The mutation has completed at this point. Refreshing the editor data is
      // useful, but must not turn a successful save into a failed one when the
      // follow-up read is temporarily unavailable (for example while the API
      // connection is being restarted).
      void getCatalogTemplate(template.id)
        .then((refreshedTemplate) => setTemplate(refreshedTemplate))
        .catch(() => {
          // Keep the last known template on screen; the regular reload path
          // will refresh it on the next successful request.
        });
    } catch (error) {
      setEditorError(
        error instanceof Error ? error.message : 'ไม่สามารถบันทึกข้อมูลกลางได้',
      );
    } finally {
      setIsSavingEditor(false);
    }
  };

  const retireItem = async () => {
    if (!template || !retireTarget) return;
    try {
      if (retireTarget.type === 'inventory') {
        await retireCatalogTemplateInventoryItem(template.id, retireTarget.id);
      } else {
        await retireCatalogTemplateMenuItem(template.id, retireTarget.id);
      }
      const refreshedTemplate = await getCatalogTemplate(template.id);
      setTemplate(refreshedTemplate);
      setRetireTarget(null);
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

  const menuEditor = editor?.type === 'menu' ? editor : null;
  const updateMenuDraft = (patch: Partial<MenuEditorState['draft']>) => {
    setEditor((current) =>
      current?.type === 'menu'
        ? { ...current, draft: { ...current.draft, ...patch } }
        : current,
    );
  };
  const categoryOptions = [
    ...new Set([
      ...menuCategories,
      ...(template?.menuItems.map((item) => item.category) ?? []),
    ]),
  ];
  const branchSize = impact?.branches.find(
    (branch) => branch.id === branchId,
  )?.size;
  const normalizedBranchSearch = branchSearch.trim().toLocaleLowerCase('th-TH');
  const visibleBranchItems =
    activeTab === 'menu'
      ? (template?.menuItems ?? []).filter(
          (item) =>
            branchSize &&
            item.availableSizes.includes(branchSize) &&
            item.name
              .toLocaleLowerCase('th-TH')
              .includes(normalizedBranchSearch),
        )
      : (template?.inventoryItems ?? []).filter(
          (item) =>
            branchSize &&
            item.kind ===
              (activeTab === 'ingredient' ? 'ingredient' : 'stock') &&
            item.availableSizes.includes(branchSize) &&
            item.name
              .toLocaleLowerCase('th-TH')
              .includes(normalizedBranchSearch),
        );
  const branchPageSize = 10;
  const branchPageCount = Math.max(
    1,
    Math.ceil(visibleBranchItems.length / branchPageSize),
  );
  const currentBranchPage = Math.min(branchPage, branchPageCount - 1);
  const branchPageStart = currentBranchPage * branchPageSize;
  const pagedBranchItems = visibleBranchItems.slice(
    branchPageStart,
    branchPageStart + branchPageSize,
  );

  return (
    <DashboardMain>
      <PageIntro
        title={sectionContent[section].title}
        description={sectionContent[section].description}
      />

      <Box>
        {showCatalogSkeleton ? (
          <AdminCentralCatalogSkeleton section={section} />
        ) : template ? (
          <Box
            sx={{
              maxWidth:
                section === 'branches' || section === 'sync' ? 1240 : 'none',
            }}
          >
            {section !== 'branches' && section !== 'sync' && (
              <Box
                sx={{
                  minWidth: 0,
                  gridColumn: { lg: 1 },
                }}
              >
                <TemplateDetail
                  key={section}
                  template={template}
                  size={size}
                  search={search}
                  menuCategory={menuCategory}
                  onSearchChange={setSearch}
                  onMenuCategoryChange={setMenuCategory}
                  onSizeChange={setSize}
                  section={section}
                  onEditInventory={openInventoryEditor}
                  onEditMenu={openMenuEditor}
                  retireTarget={retireTarget}
                  onRequestRetire={setRetireTarget}
                  onCancelRetire={() => setRetireTarget(null)}
                  onConfirmRetire={() => void retireItem()}
                  onAdd={openCreateEditor}
                />
              </Box>
            )}
            {(section === 'branches' || section === 'sync') && (
              <Box
                sx={{
                  minWidth: 0,
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr)',
                  gap: 2,
                  alignItems: 'start',
                }}
              >
                {(section === 'branches' || section === 'sync') && (
                  <Card
                    variant="outlined"
                    sx={{
                      ...templateCardSx,
                      order: 1,
                    }}
                  >
                    <CardContent
                      sx={{
                        p: { xs: 2, sm: 2.5 },
                        '&:last-child': { pb: { xs: 2, sm: 2.5 } },
                      }}
                    >
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        sx={{
                          alignItems: { xs: 'stretch', sm: 'center' },
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Typography component="h2" sx={sectionTitleSx}>
                            ข้อมูลกลาง
                          </Typography>
                          <Typography
                            sx={{ ...sectionMetaSx, mt: 0.25, fontSize: 13 }}
                          >
                            ตรวจสอบเมนู วัตถุดิบ และอุปกรณ์ชุดกลางที่ทุกสาขา
                            และแฟรนไชส์ใช้ร่วมกัน
                          </Typography>
                        </Box>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          sx={{
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            gap: 1.5,
                          }}
                        >
                          {impact ? (
                            <Typography
                              sx={{
                                ...sectionMetaSx,
                                whiteSpace: 'nowrap',
                                fontSize: 12,
                              }}
                            >
                              ใช้ร่วมกัน {numberFormatter.format(impact.count)}{' '}
                              สาขา
                            </Typography>
                          ) : null}
                          <Button
                            variant="contained"
                            onClick={() => {
                              setShowDrawerImpact(false);
                              setIsCentralCatalogDrawerOpen(true);
                            }}
                            sx={{ ...tabButtonSx(true), whiteSpace: 'nowrap' }}
                          >
                            เปิดข้อมูลกลาง
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                )}
                {(section === 'branches' || section === 'sync') && (
                  <Card
                    variant="outlined"
                    sx={{
                      ...templateCardSx,
                      order: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                      <Box sx={{ p: 2 }}>
                        <Typography component="h2" sx={sectionTitleSx}>
                          รายการที่ใช้รายสาขา
                        </Typography>
                        <Typography sx={sectionMetaSx}>
                          ดูรายการของสาขาที่เลือกและเปิดหรือปิดการใช้งานได้ทันที
                          โดยไม่เปลี่ยนยอดสต๊อกจริง
                        </Typography>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="สาขา"
                          value={branchId ?? ''}
                          slotProps={{
                            inputLabel: { shrink: true },
                            select: {
                              displayEmpty: true,
                              renderValue: (value: unknown) => {
                                const branch = (impact?.branches ?? []).find(
                                  (item) => item.id === Number(value),
                                );
                                return branch
                                  ? `${branch.name} · ${branch.code} · ${branch.size}`
                                  : 'กรุณาเลือกสาขา';
                              },
                            },
                          }}
                          onClick={() => {
                            if (!impact) void previewImpact('preview');
                          }}
                          onChange={(event) => {
                            setBranchPage(0);
                            setBranchId(Number(event.target.value));
                          }}
                          sx={{ mt: 2, maxWidth: 440 }}
                        >
                          <MenuItem disabled value="">
                            กรุณาเลือกสาขา
                          </MenuItem>
                          {(impact?.branches ?? []).map((branch) => (
                            <MenuItem key={branch.id} value={branch.id}>
                              {branch.name} · {branch.code} · {branch.size}
                            </MenuItem>
                          ))}
                        </TextField>
                        {branchId !== null && (
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}
                            aria-label="ประเภทรายการรายสาขา"
                          >
                            {catalogTabs.map((item) => (
                              <Button
                                key={item.value}
                                size="small"
                                variant={
                                  activeTab === item.value
                                    ? 'contained'
                                    : 'outlined'
                                }
                                onClick={() => {
                                  setBranchPage(0);
                                  setActiveTab(item.value);
                                }}
                                sx={selectionPillSx(activeTab === item.value)}
                              >
                                {item.label}
                              </Button>
                            ))}
                          </Stack>
                        )}
                        {branchId !== null && (
                          <SearchField
                            fullWidth
                            placeholder="ค้นหารายการในสาขา"
                            aria-label="ค้นหารายการในสาขา"
                            value={branchSearch}
                            onChange={(event) => {
                              setBranchPage(0);
                              setBranchSearch(event.target.value);
                            }}
                            sx={{ mt: 1.25 }}
                          />
                        )}
                      </Box>
                      {branchId === null && (
                        <Box sx={{ borderTop: '1px solid #eee3dc' }}>
                          <Box
                            sx={{
                              px: 2,
                              py: 1,
                              bgcolor: '#faf8f6',
                              borderBottom: '1px solid #eee3dc',
                            }}
                          >
                            <Typography sx={itemMetaSx}>0 รายการ</Typography>
                          </Box>
                          <TableContainer
                            sx={{
                              height: 480,
                              borderBottom: '1px solid #eee3dc',
                              borderRadius: 0,
                              overflowX: 'auto',
                            }}
                          >
                            <Table
                              stickyHeader
                              size="small"
                              aria-label="รายการที่ใช้ในสาขา"
                              sx={{ minWidth: 680 }}
                            >
                              <TableHead>
                                <TableRow>
                                  <TableCell
                                    sx={{ ...branchTableHeaderSx, width: 76 }}
                                  >
                                    รูป
                                  </TableCell>
                                  <TableCell sx={branchTableHeaderSx}>
                                    ชื่อรายการ
                                  </TableCell>
                                  <TableCell
                                    sx={{ ...branchTableHeaderSx, width: 170 }}
                                  >
                                    หมวดหมู่
                                  </TableCell>
                                  <TableCell
                                    sx={{ ...branchTableHeaderSx, width: 130 }}
                                  >
                                    สถานะ
                                  </TableCell>
                                  <TableCell
                                    align="center"
                                    sx={{ ...branchTableHeaderSx, width: 94 }}
                                  >
                                    เปิดใช้
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                <TableRow>
                                  <TableCell
                                    colSpan={5}
                                    align="center"
                                    sx={{
                                      height: 420,
                                      border: 0,
                                      color: '#86766c',
                                      fontFamily: 'Kanit, sans-serif',
                                      fontSize: 13,
                                    }}
                                  >
                                    กรุณาเลือกสาขาเพื่อแสดงรายการ
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}
                      {branchId !== null && isLoadingSelections && (
                        <Typography sx={{ ...sectionMetaSx, mt: 1.5 }}>
                          กำลังโหลดรายการของสาขา…
                        </Typography>
                      )}
                      {branchId !== null &&
                        selectionError &&
                        !isLoadingSelections && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              setSelectionReloadKey((current) => current + 1)
                            }
                            sx={{ ...tabButtonSx(false), mt: 1.5 }}
                          >
                            ลองโหลดรายการอีกครั้ง
                          </Button>
                        )}
                      {branchId !== null &&
                        !isLoadingSelections &&
                        !selectionError &&
                        template && (
                          <Box sx={{ borderTop: '1px solid #eee3dc' }}>
                            <Box
                              sx={{
                                px: 2,
                                py: 1,
                                bgcolor: '#faf8f6',
                                borderBottom: '1px solid #eee3dc',
                              }}
                            >
                              <Typography sx={itemMetaSx}>
                                สาขาขนาด {branchSize} ·{' '}
                                {numberFormatter.format(
                                  visibleBranchItems.length,
                                )}{' '}
                                รายการ
                              </Typography>
                            </Box>
                            <TableContainer
                              sx={{
                                borderRadius: 0,
                                overflowX: 'auto',
                              }}
                            >
                              <Table
                                stickyHeader
                                size="small"
                                aria-label="รายการที่ใช้ในสาขา"
                                sx={{ minWidth: 680 }}
                              >
                                <TableHead>
                                  <TableRow>
                                    <TableCell
                                      sx={{
                                        ...branchTableHeaderSx,
                                        width: 76,
                                      }}
                                    >
                                      รูป
                                    </TableCell>
                                    <TableCell sx={branchTableHeaderSx}>
                                      ชื่อรายการ
                                    </TableCell>
                                    <TableCell
                                      sx={{
                                        ...branchTableHeaderSx,
                                        width: 170,
                                      }}
                                    >
                                      หมวดหมู่
                                    </TableCell>
                                    <TableCell
                                      sx={{
                                        ...branchTableHeaderSx,
                                        width: 130,
                                      }}
                                    >
                                      สถานะ
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{ ...branchTableHeaderSx, width: 94 }}
                                    >
                                      เปิดใช้
                                    </TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {visibleBranchItems.length === 0 ? (
                                    <TableRow>
                                      <TableCell
                                        colSpan={5}
                                        align="center"
                                        sx={{
                                          height: 420,
                                          border: 0,
                                          color: '#86766c',
                                          fontFamily: 'Kanit, sans-serif',
                                          fontSize: 13,
                                        }}
                                      >
                                        ไม่พบรายการที่ตรงกับสาขาหรือคำค้นหา
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    pagedBranchItems.map((item) => {
                                      const entityType =
                                        activeTab === 'menu'
                                          ? 'menu'
                                          : 'inventory';
                                      const enabled = !branchSelections.has(
                                        `${entityType}:${item.id}`,
                                      );
                                      return (
                                        <TableRow
                                          key={item.id}
                                          hover
                                          sx={{
                                            '&:nth-of-type(even)': {
                                              bgcolor: '#faf8f6',
                                            },
                                          }}
                                        >
                                          <TableCell
                                            sx={{
                                              width: 76,
                                              borderColor: '#eee3dc',
                                              py: 1.25,
                                            }}
                                          >
                                            <CatalogThumbnail
                                              name={item.name}
                                              imageUrl={item.imageUrl}
                                            />
                                          </TableCell>
                                          <TableCell
                                            sx={{
                                              borderColor: '#eee3dc',
                                              py: 1.25,
                                            }}
                                          >
                                            <Typography
                                              sx={{
                                                ...itemTitleSx,
                                                overflowWrap: 'anywhere',
                                              }}
                                            >
                                              {item.name}
                                            </Typography>
                                            <Typography
                                              sx={{
                                                ...itemMetaSx,
                                                mt: 0.25,
                                              }}
                                            >
                                              ใช้กับขนาด{' '}
                                              {item.availableSizes.join(' / ')}
                                            </Typography>
                                          </TableCell>
                                          <TableCell
                                            sx={{
                                              borderColor: '#eee3dc',
                                              py: 1.25,
                                            }}
                                          >
                                            <Typography sx={itemMetaSx}>
                                              {item.category}
                                            </Typography>
                                          </TableCell>
                                          <TableCell
                                            sx={{ borderColor: '#eee3dc' }}
                                          >
                                            <Typography
                                              sx={{
                                                ...sectionMetaSx,
                                                fontSize: 11.5,
                                                color: enabled
                                                  ? '#805637'
                                                  : '#86766c',
                                              }}
                                            >
                                              {enabled ? 'เปิดใช้' : 'ปิดใช้'}
                                            </Typography>
                                          </TableCell>
                                          <TableCell
                                            align="center"
                                            sx={{
                                              borderColor: '#eee3dc',
                                              py: 0.25,
                                            }}
                                          >
                                            <Switch
                                              size="small"
                                              checked={enabled}
                                              disabled={
                                                isSavingSelection ||
                                                isLoadingSelections
                                              }
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
                                                          (selection) =>
                                                            !selection.enabled,
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
                                                '& .MuiSwitch-switchBase.Mui-checked':
                                                  {
                                                    color: '#805637',
                                                  },
                                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':
                                                  { bgcolor: '#805637' },
                                              }}
                                            />
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })
                                  )}
                                </TableBody>
                              </Table>
                            </TableContainer>
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
                                {visibleBranchItems.length === 0
                                  ? '0 รายการ'
                                  : `แสดง ${numberFormatter.format(branchPageStart + 1)}–${numberFormatter.format(Math.min(branchPageStart + branchPageSize, visibleBranchItems.length))} จาก ${numberFormatter.format(visibleBranchItems.length)} รายการ`}
                              </Typography>
                              <Stack direction="row" spacing={0.5}>
                                <Button
                                  size="small"
                                  disabled={currentBranchPage === 0}
                                  onClick={() =>
                                    setBranchPage(currentBranchPage - 1)
                                  }
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
                                  {currentBranchPage + 1}/{branchPageCount}
                                </Typography>
                                <Button
                                  size="small"
                                  disabled={
                                    currentBranchPage + 1 >= branchPageCount
                                  }
                                  onClick={() =>
                                    setBranchPage(currentBranchPage + 1)
                                  }
                                  sx={editButtonSx}
                                >
                                  ถัดไป
                                </Button>
                              </Stack>
                            </Stack>
                          </Box>
                        )}
                    </CardContent>
                  </Card>
                )}
              </Box>
            )}
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

      <CentralInventoryEditorDrawer
        editor={editor?.type === 'inventory' ? editor : null}
        section={section}
        isSaving={isSavingEditor}
        onClose={() => setEditor(null)}
        onSave={() => void saveEditor()}
        onError={setEditorError}
        onChange={(patch) =>
          setEditor((current) =>
            current?.type === 'inventory'
              ? { ...current, draft: { ...current.draft, ...patch } }
              : current,
          )
        }
      />

      {template ? (
        <Drawer
          anchor="bottom"
          open={isCentralCatalogDrawerOpen}
          onClose={() => setIsCentralCatalogDrawerOpen(false)}
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
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  component="h2"
                  sx={{
                    color: '#3c2d24',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 22,
                    fontWeight: 600,
                  }}
                >
                  ข้อมูลกลาง
                </Typography>
                <Typography sx={{ ...sectionMetaSx, mt: 0.25, fontSize: 13 }}>
                  ข้อมูลชุดเดียวที่ใช้ร่วมกันระหว่างสาขา SBC และแฟรนไชส์
                </Typography>
              </Box>
              <Button
                aria-label="ปิดข้อมูลกลาง"
                onClick={() => setIsCentralCatalogDrawerOpen(false)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
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

            <Divider sx={{ my: 2, borderColor: '#eee3dc' }} />

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                pr: { sm: 0.5 },
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'minmax(0, 1fr)',
                    sm: 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: 1.25,
                }}
              >
                {[
                  {
                    label: 'เมนูและสินค้า',
                    count: template.menuItems.length,
                    unit: 'รายการ',
                  },
                  {
                    label: 'วัตถุดิบและอุปกรณ์',
                    count: template.inventoryItems.length,
                    unit: 'รายการ',
                  },
                  {
                    label: 'สาขาที่ใช้ข้อมูล',
                    count: impact?.count ?? 0,
                    unit: 'สาขา',
                  },
                ].map(({ label, count, unit }) => (
                  <Box
                    key={label}
                    sx={{
                      border: '1px solid #eadfd7',
                      borderRadius: 1.5,
                      bgcolor: '#fff',
                      px: 2,
                      py: 1.5,
                    }}
                  >
                    <Typography sx={{ ...sectionMetaSx, fontSize: 12 }}>
                      {label}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.5,
                        color: '#3c2d24',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 22,
                        fontWeight: 600,
                      }}
                    >
                      {numberFormatter.format(count)} {unit}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box
                sx={{
                  mt: 2,
                  border: '1px solid #eadfd7',
                  borderRadius: 1.5,
                  bgcolor: '#fff',
                  p: { xs: 2, sm: 2.5 },
                }}
              >
                <Typography component="h3" sx={sectionTitleSx}>
                  กระจายการเปลี่ยนแปลง
                </Typography>
                <Typography sx={{ ...sectionMetaSx, mt: 0.5, fontSize: 13 }}>
                  ตรวจสอบผลกระทบก่อนซิงก์ข้อมูลกลาง ยอดคงเหลือ ล็อต วันหมดอายุ
                  และประวัติในแต่ละสาขาจะไม่ถูกเปลี่ยนแปลง
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setShowDrawerImpact(true);
                      void previewImpact('preview');
                    }}
                    disabled={isLoadingImpact}
                    sx={tabButtonSx(false)}
                  >
                    {isLoadingImpact ? 'กำลังคำนวณ' : 'ดูผลกระทบ'}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => {
                      setIsCentralCatalogDrawerOpen(false);
                      openSyncDialog();
                    }}
                    disabled={
                      isLoadingImpact ||
                      syncJob?.status === 'pending' ||
                      syncJob?.status === 'processing'
                    }
                    sx={tabButtonSx(true)}
                  >
                    ซิงก์ไปยังสาขา
                  </Button>
                </Stack>
              </Box>

              {showDrawerImpact ? (
                <Box
                  sx={{
                    mt: 2,
                    border: '1px solid #eadfd7',
                    borderRadius: 1.5,
                    bgcolor: '#fff',
                    p: { xs: 2, sm: 2.5 },
                  }}
                >
                  <Typography component="h3" sx={sectionTitleSx}>
                    ผลกระทบของข้อมูลกลาง
                  </Typography>
                  <Typography sx={{ ...sectionMetaSx, mt: 0.5, fontSize: 13 }}>
                    {impact
                      ? `ข้อมูลกลางนี้ถูกใช้อยู่ใน ${numberFormatter.format(impact.count)} สาขา`
                      : 'ตรวจสอบรายชื่อสาขาที่ใช้ข้อมูลกลางก่อนกระจายการเปลี่ยนแปลง'}
                  </Typography>
                  <Stack
                    spacing={0.75}
                    sx={{ mt: 1.25, maxHeight: 280, overflowY: 'auto' }}
                  >
                    {(impact?.branches ?? []).map((branch) => (
                      <Box
                        key={branch.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
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
                    {isLoadingImpact && !impact ? (
                      <Typography sx={sectionMetaSx}>
                        กำลังโหลดรายชื่อสาขา...
                      </Typography>
                    ) : impactError ? (
                      <Alert severity="error">{impactError}</Alert>
                    ) : impact && impact.count === 0 ? (
                      <Typography sx={sectionMetaSx}>
                        ยังไม่มีสาขาที่ใช้ข้อมูลกลาง
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>
              ) : null}
            </Box>

            <DrawerActionBar sx={{ pt: 2.5 }}>
              <Button
                variant="outlined"
                onClick={() => setIsCentralCatalogDrawerOpen(false)}
                sx={tabButtonSx(false)}
              >
                ปิด
              </Button>
            </DrawerActionBar>
          </Box>
        </Drawer>
      ) : null}

      <Drawer
        anchor="bottom"
        open={menuEditor !== null}
        onClose={() => !isSavingEditor && setEditor(null)}
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
        {menuEditor ? (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              px: { xs: 2.5, sm: 4 },
              pt: 0.75,
              pb: 3.5,
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 5,
                mx: 'auto',
                mb: 1,
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
                component="h2"
                sx={{
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 19,
                  fontWeight: 600,
                }}
              >
                {menuEditor.item.id === 0
                  ? 'เพิ่มเมนูและสินค้า'
                  : 'แก้ไขเมนูและสินค้า'}
              </Typography>
              <Button
                aria-label="ปิด"
                onClick={() => setEditor(null)}
                disabled={isSavingEditor}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: '0 0 40px',
                  minWidth: '40px !important',
                  width: '40px !important',
                  maxWidth: '40px !important',
                  minHeight: '40px !important',
                  height: '40px !important',
                  maxHeight: '40px !important',
                  aspectRatio: '1 / 1',
                  p: '0 !important',
                  borderRadius: '10px',
                  bgcolor: '#f7eee8',
                  color: '#5f4b3d',
                  '&:hover': { bgcolor: '#f1e4da' },
                }}
              >
                <XIcon size={20} />
              </Button>
            </Box>
            <Typography
              sx={{
                mt: 0.25,
                color: 'text.secondary',
                fontFamily: 'Kanit, sans-serif',
              }}
            >
              {menuEditor.item.id === 0
                ? 'กรอกข้อมูลเพื่อเพิ่มสินค้าใหม่'
                : 'แก้ไขข้อมูลสินค้าในเมนู'}
            </Typography>
            <Divider
              sx={{
                mt: 1,
                mx: { xs: -2.5, sm: -4 },
                borderColor: '#e8ddd5',
              }}
            />
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                pt: 1,
                pr: 0.5,
              }}
            >
              <Box
                component="form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveEditor();
                }}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'minmax(0,1fr) minmax(0,2fr)',
                  },
                  gap: 2.5,
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
                  {menuEditor.draft.imageUrl ? (
                    <Box
                      component="img"
                      src={menuEditor.draft.imageUrl}
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
                  {menuEditor.item.id !== 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 1,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: 'rgba(32,25,20,.42)',
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
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        setEditorError('รูปสินค้าต้องไม่เกิน 5 MB');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string')
                          updateMenuDraft({ imageUrl: reader.result });
                      };
                      reader.onerror = () =>
                        setEditorError('ไม่สามารถอ่านรูปสินค้าได้');
                      reader.readAsDataURL(file);
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2,minmax(0,1fr))',
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    required
                    fullWidth
                    label="ชื่อสินค้า"
                    value={menuEditor.draft.name}
                    onChange={(event) =>
                      updateMenuDraft({ name: event.target.value })
                    }
                    sx={{ gridColumn: { sm: '1 / -1' } }}
                  />
                  <TextField
                    required
                    select
                    fullWidth
                    label="หมวดหมู่"
                    value={menuEditor.draft.category}
                    onChange={(event) =>
                      updateMenuDraft({ category: event.target.value })
                    }
                  >
                    {categoryOptions.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
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
                        กำหนดสถานะของเมนูกลาง
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      clickable
                      label={
                        menuEditor.draft.status === 'available'
                          ? 'พร้อมขาย'
                          : 'หมดชั่วคราว'
                      }
                      onClick={() =>
                        updateMenuDraft({
                          status:
                            menuEditor.draft.status === 'available'
                              ? 'soldout'
                              : 'available',
                        })
                      }
                      sx={{
                        borderRadius: '12px',
                        bgcolor:
                          menuEditor.draft.status === 'available'
                            ? '#1c5b39'
                            : '#9d5a1b',
                        color: '#fff',
                        fontFamily: 'Kanit, sans-serif',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                  <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                    <Typography sx={controlLabelSx}>ใช้กับขนาดสาขา</Typography>
                    <Stack direction="row" spacing={0.75}>
                      {sizes.map((item) => (
                        <Button
                          key={item}
                          size="small"
                          variant={
                            menuEditor.draft.availableSizes.includes(item)
                              ? 'contained'
                              : 'outlined'
                          }
                          aria-pressed={menuEditor.draft.availableSizes.includes(
                            item,
                          )}
                          onClick={() =>
                            updateMenuDraft({
                              availableSizes:
                                menuEditor.draft.availableSizes.includes(item)
                                  ? menuEditor.draft.availableSizes.filter(
                                      (value) => value !== item,
                                    )
                                  : sizes.filter(
                                      (value) =>
                                        menuEditor.draft.availableSizes.includes(
                                          value,
                                        ) || value === item,
                                    ),
                            })
                          }
                          disableElevation
                          sx={{
                            ...selectionPillSx(
                              menuEditor.draft.availableSizes.includes(item),
                            ),
                            minWidth: { xs: 112, sm: 128 },
                          }}
                        >
                          {`ขนาด ${item}`}
                        </Button>
                      ))}
                    </Stack>
                    <Typography
                      sx={{ mt: 0.75, color: 'text.secondary', fontSize: 12 }}
                    >
                      เลือกขนาดอย่างน้อย 1 ขนาดก่อนบันทึกสินค้า
                    </Typography>
                  </Box>
                  <Box
                    role="group"
                    aria-label="ราคาตามช่องทางขาย"
                    sx={{
                      gridColumn: { sm: '1 / -1' },
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        md: 'repeat(2,minmax(0,1fr))',
                      },
                      gap: 1.5,
                    }}
                  >
                    <Box
                      component="section"
                      sx={{
                        p: 1.5,
                        border: '1px solid #e8ddd5',
                        borderRadius: '12px',
                        bgcolor: '#fffaf7',
                      }}
                    >
                      <Typography
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
                            sm: 'repeat(2,minmax(0,1fr))',
                          },
                          gap: 1.25,
                        }}
                      >
                        <TextField
                          required
                          fullWidth
                          type="number"
                          label="ราคาต้นทุนหน้าร้าน"
                          value={menuEditor.draft.costPrice}
                          onChange={(event) =>
                            updateMenuDraft({ costPrice: event.target.value })
                          }
                          helperText="ใช้คำนวณกำไร/ขาดทุน"
                          slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                        />
                        <TextField
                          required
                          fullWidth
                          type="number"
                          label="ราคาขายหน้าร้าน"
                          value={menuEditor.draft.storePrice}
                          onChange={(event) =>
                            updateMenuDraft({ storePrice: event.target.value })
                          }
                          slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                        />
                      </Box>
                    </Box>
                    <Box
                      component="section"
                      sx={{
                        p: 1.5,
                        border: '1px solid #e8ddd5',
                        borderRadius: '12px',
                        bgcolor: '#fffaf7',
                      }}
                    >
                      <Typography
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
                            sm: 'repeat(2,minmax(0,1fr))',
                          },
                          gap: 1.25,
                        }}
                      >
                        <TextField
                          required
                          fullWidth
                          type="number"
                          label="ราคาต้นทุน LINE MAN"
                          value={menuEditor.draft.linemanCostPrice}
                          onChange={(event) =>
                            updateMenuDraft({
                              linemanCostPrice: event.target.value,
                            })
                          }
                          helperText="อ้างอิงต้นทุนจากสูตร LINE MAN"
                          slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                        />
                        <TextField
                          required
                          fullWidth
                          type="number"
                          label="ราคาขาย LINE MAN"
                          value={menuEditor.draft.linemanPrice}
                          onChange={(event) =>
                            updateMenuDraft({
                              linemanPrice: event.target.value,
                            })
                          }
                          slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
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
                        <Typography sx={{ ...itemMetaSx, fontSize: 11 }}>
                          ระบุวัตถุดิบที่ใช้ต่อ 1 เมนู
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.75}>
                        <Button
                          size="small"
                          variant={
                            menuEditor.draft.recipes.length > 0
                              ? 'contained'
                              : 'outlined'
                          }
                          aria-pressed={menuEditor.draft.recipes.length > 0}
                          disabled={!template?.inventoryItems.length}
                          onClick={() => {
                            updateMenuDraft({
                              recipes: [
                                ...menuEditor.draft.recipes,
                                {
                                  catalogItemId: 0,
                                  channel: recipeChannel,
                                  quantity: '0',
                                },
                              ],
                            });
                          }}
                          sx={tabButtonSx(menuEditor.draft.recipes.length > 0)}
                        >
                          + เพิ่มส่วนผสม
                        </Button>
                        <Button
                          size="small"
                          variant={
                            menuEditor.draft.recipes.length === 0
                              ? 'contained'
                              : 'outlined'
                          }
                          aria-pressed={menuEditor.draft.recipes.length === 0}
                          onClick={() => updateMenuDraft({ recipes: [] })}
                          sx={tabButtonSx(
                            menuEditor.draft.recipes.length === 0,
                          )}
                        >
                          ไม่มีสูตร/ส่วนผสม
                        </Button>
                      </Stack>
                    </Box>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ mb: 2 }}
                      aria-label="ช่องทางของสูตรกลาง"
                    >
                      <Button
                        size="small"
                        variant={
                          recipeChannel === 'storefront'
                            ? 'contained'
                            : 'outlined'
                        }
                        onClick={() => setRecipeChannel('storefront')}
                        sx={tabButtonSx(recipeChannel === 'storefront')}
                      >
                        หน้าร้าน
                      </Button>
                      <Button
                        size="small"
                        variant={
                          recipeChannel === 'lineman' ? 'contained' : 'outlined'
                        }
                        onClick={() => setRecipeChannel('lineman')}
                        sx={tabButtonSx(recipeChannel === 'lineman')}
                      >
                        LINE MAN
                      </Button>
                    </Stack>
                    <Box sx={{ display: 'grid', gap: 1.5 }}>
                      {menuEditor.draft.recipes.map((recipe, index) =>
                        recipe.channel !== recipeChannel ? null : (
                          <Box
                            key={`${recipe.channel}-${index}`}
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: {
                                xs: 'minmax(0,1fr) 40px',
                                sm: 'minmax(0,1fr) minmax(110px,.55fr) 40px',
                              },
                              gap: 1.5,
                              alignItems: 'center',
                            }}
                          >
                            <TextField
                              select
                              fullWidth
                              label="วัตถุดิบ"
                              value={recipe.catalogItemId}
                              slotProps={inventoryUnitSelectSlotProps}
                              onChange={(event) => {
                                const recipes = [...menuEditor.draft.recipes];
                                recipes[index] = {
                                  ...recipe,
                                  catalogItemId: Number(event.target.value),
                                };
                                updateMenuDraft({ recipes });
                              }}
                            >
                              <MenuItem value={0} disabled>
                                กรุณาเลือกวัตถุดิบ
                              </MenuItem>
                              {(template?.inventoryItems ?? []).map((item) => (
                                <MenuItem key={item.id} value={item.id}>
                                  {item.name} ({item.unit})
                                </MenuItem>
                              ))}
                            </TextField>
                            <TextField
                              fullWidth
                              type="number"
                              label="ปริมาณ"
                              value={recipe.quantity}
                              onChange={(event) => {
                                const recipes = [...menuEditor.draft.recipes];
                                recipes[index] = {
                                  ...recipe,
                                  quantity: event.target.value,
                                };
                                updateMenuDraft({ recipes });
                              }}
                              slotProps={{
                                htmlInput: { min: 0, step: '0.01' },
                              }}
                              sx={{ gridColumn: { xs: '1', sm: 'auto' } }}
                            />
                            <Button
                              aria-label="ลบส่วนผสม"
                              onClick={() =>
                                updateMenuDraft({
                                  recipes: menuEditor.draft.recipes.filter(
                                    (_, recipeIndex) => recipeIndex !== index,
                                  ),
                                })
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
                        ),
                      )}
                    </Box>
                    {menuEditor.draft.recipes.length === 0 ? (
                      <Typography sx={{ ...itemMetaSx, fontSize: 12 }}>
                        ยังไม่มีสูตรหรือส่วนผสม — สามารถบันทึกสินค้าได้
                      </Typography>
                    ) : null}
                  </Box>
                  <DrawerActionBar
                    sx={{
                      gridColumn: { sm: '1 / -1' },
                    }}
                  >
                    <Button
                      variant="outlined"
                      onClick={() => setEditor(null)}
                      disabled={isSavingEditor}
                      sx={{
                        minHeight: 40,
                        borderRadius: '12px',
                        color: '#5f4b3d',
                        fontFamily: 'Kanit, sans-serif',
                      }}
                    >
                      {menuEditor.item.id === 0 ? 'ยกเลิกเพิ่ม' : 'ยกเลิกแก้ไข'}
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={
                        isSavingEditor ||
                        menuEditor.draft.availableSizes.length === 0
                      }
                      sx={{
                        minHeight: 40,
                        borderRadius: '12px',
                        bgcolor: '#201914',
                        fontFamily: 'Kanit, sans-serif',
                      }}
                    >
                      {isSavingEditor
                        ? 'กำลังบันทึก...'
                        : menuEditor.item.id === 0
                          ? 'บันทึกสินค้า'
                          : 'บันทึกการแก้ไข'}
                    </Button>
                  </DrawerActionBar>
                </Box>
              </Box>
            </Box>
          </Box>
        ) : null}
      </Drawer>

      <Dialog
        open={impactDialogMode !== null}
        onClose={() => !isSyncing && setImpactDialogMode(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="catalog-impact-dialog-title"
      >
        <DialogTitle
          id="catalog-impact-dialog-title"
          sx={{
            color: '#3c2d24',
            fontFamily: 'Kanit, sans-serif',
            fontWeight: 600,
          }}
        >
          {impactDialogMode === 'sync'
            ? 'ยืนยันการซิงก์ข้อมูลกลาง'
            : 'ผลกระทบของข้อมูลกลาง'}
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
                {impactDialogMode === 'sync'
                  ? `${impact.template.name} จะอัปเดตไปยัง ${numberFormatter.format(impact.count)} สาขา`
                  : `${impact.template.name} ใช้อยู่ใน ${numberFormatter.format(impact.count)} สาขา`}
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
                {impactDialogMode === 'sync'
                  ? 'ยอดคงเหลือ ล็อต วันหมดอายุ และประวัติของแต่ละสาขาจะไม่ถูกเปลี่ยนแปลง'
                  : 'ตรวจสอบรายชื่อสาขาที่ได้รับผลกระทบก่อนเลือกซิงก์ข้อมูลกลาง'}
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
            onClick={() => setImpactDialogMode(null)}
            disabled={isSyncing}
            sx={{ color: '#674633', fontFamily: 'Kanit, sans-serif' }}
          >
            {impactDialogMode === 'sync' ? 'ยกเลิก' : 'ปิด'}
          </Button>
          {impactDialogMode === 'sync' ? (
            <Button
              variant="contained"
              onClick={() => void syncTemplate()}
              disabled={!impact || impact.count === 0 || isSyncing}
              sx={tabButtonSx(true)}
            >
              {isSyncing ? 'กำลังซิงก์' : 'ยืนยันการซิงก์'}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <ActionSnackbar
        notice={syncNotice}
        icon={
          isSyncInProgress ? (
            <LoaderIcon animate size={20} aria-label="กำลังซิงก์ข้อมูลกลาง" />
          ) : undefined
        }
        content={syncNoticeContent}
        onClose={() => {
          if (canDismissSyncNotice) {
            setSyncJob(null);
            setSyncStatusError('');
          }
        }}
        action={
          syncJob?.status === 'partial_failed' ||
          syncJob?.status === 'failed' ? (
            <Button
              color="inherit"
              size="small"
              disabled={isRetryingSync}
              onClick={() => void retryFailedSync()}
            >
              {isRetryingSync ? 'กำลังลองใหม่…' : 'ลองใหม่'}
            </Button>
          ) : undefined
        }
        autoHideDuration={
          canDismissSyncNotice && !syncStatusError ? 3_500 : null
        }
        alertSx={{
          minHeight: 42,
          px: 1,
          py: 0.5,
          '& .MuiAlert-icon': { alignItems: 'center', mr: 0.75, py: 0 },
          '& .MuiAlert-message': {
            alignItems: 'center',
            display: 'flex',
            py: 0,
          },
        }}
      />

      <ActionSnackbar
        notice={
          editorError || selectionError || impactError || loadError
            ? {
                message:
                  editorError || selectionError || impactError || loadError,
                severity: 'error',
              }
            : notice
              ? { message: notice }
              : null
        }
        onClose={() => {
          setNotice(null);
          setEditorError('');
          setSelectionError('');
          setImpactError('');
        }}
        action={
          loadError ? (
            <Button
              color="inherit"
              size="small"
              onClick={() => setReloadKey((current) => current + 1)}
            >
              ลองใหม่
            </Button>
          ) : undefined
        }
        autoHideDuration={loadError ? null : 3500}
      />
    </DashboardMain>
  );
}

function CentralInventoryEditorDrawer({
  editor,
  section,
  isSaving,
  onClose,
  onSave,
  onChange,
  onError,
}: {
  editor: InventoryEditorState | null;
  section: CentralCatalogSection;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (patch: Partial<InventoryEditorState['draft']>) => void;
  onError: (message: string) => void;
}) {
  const fresh = section === 'fresh-ingredients';
  const equipment =
    section === 'drink-equipment' || section === 'postal-equipment';
  const itemLabel =
    section === 'drink-equipment'
      ? 'อุปกรณ์เครื่องดื่ม'
      : section === 'postal-equipment'
        ? 'อุปกรณ์ไปรษณีย์'
        : fresh
          ? 'วัตถุดิบของสด'
          : 'วัตถุดิบ';
  const categoryChoices = equipment
    ? [
        ['cup', 'แก้วและบรรจุภัณฑ์'],
        ['delivery', 'อุปกรณ์จัดส่ง'],
        ['store', 'อุปกรณ์หน้าร้าน'],
        ['other', 'อื่น ๆ'],
      ]
    : [
        ['coffee', 'เมล็ดกาแฟ'],
        ['milk', 'นมและครีม'],
        ['syrup', 'ไซรัปและผงชง'],
        ['other', 'อื่น ๆ'],
      ];
  const categories = editor?.draft.category
    ? categoryChoices.some(([value]) => value === editor.draft.category)
      ? categoryChoices
      : [...categoryChoices, [editor.draft.category, editor.draft.category]]
    : categoryChoices;
  const units = [
    'กรัม',
    'กิโลกรัม',
    'ml.',
    'ลิตร',
    'ชิ้น',
    'ใบ',
    'ขวด',
    'ถุง',
    'กล่อง',
    'แพ็ค',
    'ซอง',
    'กระปุก',
  ];
  const unitChoices =
    editor?.draft.unit && !units.includes(editor.draft.unit)
      ? [...units, editor.draft.unit]
      : units;

  return (
    <Drawer
      anchor="bottom"
      open={editor !== null}
      onClose={() => !isSaving && onClose()}
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
      {editor ? (
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
              {editor.item.id === 0 ? `เพิ่ม${itemLabel}` : `แก้ไข${itemLabel}`}
            </Typography>
            <Button
              aria-label="ปิด"
              onClick={onClose}
              disabled={isSaving}
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
          <Typography
            sx={{
              mt: 0.5,
              color: 'text.secondary',
              fontFamily: 'Kanit, sans-serif',
            }}
          >
            {editor.item.id === 0
              ? `กรอกข้อมูล${itemLabel}เพื่อเพิ่มเข้าคลังกลาง`
              : `แก้ไขข้อมูล${itemLabel}ในคลังกลาง`}
          </Typography>
          <Divider
            sx={{ mt: 2.25, mx: { xs: -2.5, sm: -4 }, borderColor: '#e8ddd5' }}
          />
          <Box
            sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pt: 2.25, pr: 0.5 }}
          >
            <Box
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                onSave();
              }}
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'minmax(0, 1fr) minmax(0, 2fr)',
                },
                gap: 2.5,
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
                  alignSelf: 'start',
                  aspectRatio: '1 / 1',
                  overflow: 'hidden',
                  border: '1.5px dashed #c9b6a9',
                  borderRadius: '16px',
                  bgcolor: '#f7eee8',
                  color: '#5f4b3d',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#f1e4da', borderColor: '#805637' },
                }}
              >
                {editor.draft.imageUrl ? (
                  <Box
                    component="img"
                    src={editor.draft.imageUrl}
                    alt={`ตัวอย่างรูป${itemLabel}`}
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : null}
                <Typography
                  sx={{
                    position: 'relative',
                    bgcolor: editor.draft.imageUrl
                      ? 'rgba(32, 25, 20, .58)'
                      : 'transparent',
                    borderRadius: 1.5,
                    color: editor.draft.imageUrl ? '#fff' : 'inherit',
                    fontFamily: 'Kanit, sans-serif',
                    fontWeight: 500,
                    px: 1.25,
                    py: 0.5,
                  }}
                >
                  {editor.draft.imageUrl
                    ? `เปลี่ยนรูป${itemLabel}`
                    : `เพิ่มรูป${itemLabel}`}
                </Typography>
                {!editor.draft.imageUrl ? (
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
                      onError('รูปภาพต้องมีขนาดไม่เกิน 5 MB');
                      return;
                    }
                    const reader = new FileReader();
                    reader.addEventListener('load', () => {
                      if (typeof reader.result === 'string')
                        onChange({ imageUrl: reader.result });
                    });
                    reader.readAsDataURL(file);
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
                  label={`ชื่อ${itemLabel}`}
                  value={editor.draft.name}
                  onChange={(event) => onChange({ name: event.target.value })}
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                />
                {fresh ? (
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
                    label="หมวดหมู่"
                    value={editor.draft.category}
                    onChange={(event) =>
                      onChange({ category: event.target.value })
                    }
                  >
                    {categories.map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                {!equipment && !fresh ? (
                  <TextField
                    select
                    fullWidth
                    label="การจัดการสต๊อก"
                    value={String(editor.draft.trackStock)}
                    onChange={(event) =>
                      onChange({ trackStock: event.target.value === 'true' })
                    }
                  >
                    <MenuItem value="true">ติดตามสต๊อกและแจ้งเตือน</MenuItem>
                    <MenuItem value="false">คิดต้นทุนเท่านั้น</MenuItem>
                  </TextField>
                ) : null}
                <TextField
                  required
                  select
                  fullWidth
                  label="หน่วย"
                  value={editor.draft.unit}
                  onChange={(event) => onChange({ unit: event.target.value })}
                >
                  {unitChoices.map((unit) => (
                    <MenuItem key={unit} value={unit}>
                      {unit}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  required
                  fullWidth
                  type="number"
                  label="ต้นทุนต่อหน่วย"
                  value={editor.draft.unitCost}
                  onChange={(event) =>
                    onChange({ unitCost: event.target.value })
                  }
                  slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="แจ้งเตือนเมื่อคงเหลือ"
                  value={editor.draft.reorderLevel}
                  onChange={(event) =>
                    onChange({ reorderLevel: event.target.value })
                  }
                  disabled={!editor.draft.trackStock}
                  slotProps={{ htmlInput: { min: 0 } }}
                />
                <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                  <Typography sx={controlLabelSx}>ใช้กับขนาดสาขา</Typography>
                  <Stack direction="row" spacing={0.75}>
                    {sizes.map((size) => (
                      <Button
                        key={size}
                        size="small"
                        variant={
                          editor.draft.availableSizes.includes(size)
                            ? 'contained'
                            : 'outlined'
                        }
                        aria-pressed={editor.draft.availableSizes.includes(
                          size,
                        )}
                        onClick={() =>
                          onChange({
                            availableSizes:
                              editor.draft.availableSizes.includes(size)
                                ? editor.draft.availableSizes.filter(
                                    (item) => item !== size,
                                  )
                                : sizes.filter(
                                    (item) =>
                                      editor.draft.availableSizes.includes(
                                        item,
                                      ) || item === size,
                                  ),
                          })
                        }
                        disableElevation
                        sx={{
                          ...selectionPillSx(
                            editor.draft.availableSizes.includes(size),
                          ),
                          minWidth: { xs: 112, sm: 128 },
                        }}
                      >
                        {`ขนาด ${size}`}
                      </Button>
                    ))}
                  </Stack>
                </Box>
                <Typography
                  sx={{
                    gridColumn: { sm: '1 / -1' },
                    color: 'text.secondary',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 12,
                  }}
                >
                  คลังกลางเก็บข้อมูลรายการและต้นทุนเท่านั้น
                  ยอดคงเหลือและวันหมดอายุจัดการที่สาขา
                </Typography>
                <DrawerActionBar
                  sx={{
                    gridColumn: { sm: '1 / -1' },
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={onClose}
                    disabled={isSaving}
                    sx={{
                      minHeight: 40,
                      borderRadius: '12px',
                      color: '#5f4b3d',
                      fontFamily: 'Kanit, sans-serif',
                    }}
                  >
                    {editor.item.id === 0 ? 'ยกเลิกเพิ่ม' : 'ยกเลิกแก้ไข'}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSaving}
                    sx={{
                      minHeight: 40,
                      borderRadius: '12px',
                      bgcolor: '#201914',
                      fontFamily: 'Kanit, sans-serif',
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
                    }}
                  >
                    {isSaving
                      ? 'กำลังบันทึก…'
                      : editor.item.id === 0
                        ? `บันทึก${itemLabel}`
                        : 'บันทึกการแก้ไข'}
                  </Button>
                </DrawerActionBar>
              </Box>
            </Box>
          </Box>
        </Box>
      ) : null}
    </Drawer>
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
