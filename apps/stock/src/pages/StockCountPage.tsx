import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Drawer,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ActionSnackbar,
  DateField,
  FilterPill,
  SearchField,
} from '@stackbuild/ui';
import { imagePlaceholderImage } from '@stackbuild/management/assets';
import {
  isCountableStockItem,
  type InventoryItem,
  type StockDateDetails,
} from '../api/stock';

type InventoryGroup = 'ingredient' | 'drink_equipment' | 'postal_equipment';
const groups: Array<{ id: InventoryGroup; label: string }> = [
  { id: 'ingredient', label: 'วัตถุดิบ' },
  { id: 'drink_equipment', label: 'อุปกรณ์เครื่องดื่ม' },
  { id: 'postal_equipment', label: 'อุปกรณ์ไปรษณีย์' },
];
type InventoryStatusFilter =
  'all' | 'low' | 'out' | 'stale' | 'expiring_soon' | 'expired';
const statusFilters: Array<{
  id: InventoryStatusFilter;
  label: string;
}> = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'low', label: 'วัตถุดิบใกล้หมด' },
  { id: 'out', label: 'วัตถุดิบหมด' },
  { id: 'stale', label: 'วัตถุดิบค้างสต๊อก' },
  { id: 'expiring_soon', label: 'ใกล้หมดอายุ' },
  { id: 'expired', label: 'หมดอายุ' },
];

const formatExpiryDate = (expiryDate?: string | null) => {
  if (!expiryDate) return 'ไม่ระบุ';
  const date = new Date(expiryDate);
  if (Number.isNaN(date.getTime())) return 'ไม่ระบุ';
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const dateInputValue = (date?: string | null) =>
  date?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '';

const matchesStatusFilter = (
  item: InventoryItem,
  filter: InventoryStatusFilter,
) =>
  filter === 'all' ||
  item.status === filter ||
  (filter === 'expiring_soon' && item.expiryStatus === 'expiring_soon') ||
  (filter === 'expired' && item.expiryStatus === 'expired');

export function StockCountPage({
  ingredients,
  drinkStock,
  postalStock,
  loading,
  onAdjust,
  onOrderIngredients,
}: {
  ingredients: InventoryItem[];
  drinkStock: InventoryItem[];
  postalStock: InventoryItem[];
  loading: boolean;
  onAdjust: (
    item: InventoryItem,
    quantity: number,
    note: string,
    dates?: StockDateDetails,
  ) => Promise<void>;
  onOrderIngredients?: (item: InventoryItem) => void;
}) {
  const [group, setGroup] = useState<InventoryGroup>('ingredient');
  const [statusFilter, setStatusFilter] =
    useState<InventoryStatusFilter>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('ตรวจนับสิ้นกะ');
  const [manufacturedAt, setManufacturedAt] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const items =
    group === 'ingredient'
      ? ingredients
      : group === 'drink_equipment'
        ? drinkStock
        : postalStock;
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          isCountableStockItem(item) &&
          item.name.toLowerCase().includes(query.trim().toLowerCase()) &&
          matchesStatusFilter(item, statusFilter),
      ),
    [items, query, statusFilter],
  );
  const filterCounts = useMemo(
    () =>
      Object.fromEntries(
        statusFilters.map(({ id }) => [
          id,
          items.filter(
            (item) =>
              isCountableStockItem(item) && matchesStatusFilter(item, id),
          ).length,
        ]),
      ) as Record<InventoryStatusFilter, number>,
    [items],
  );
  const countableItems = useMemo(
    () => items.filter(isCountableStockItem),
    [items],
  );
  const selectedGroupLabel =
    groups.find((item) => item.id === group)?.label ?? 'ประเภทที่เลือก';
  const selectedStatusLabel =
    statusFilters.find((item) => item.id === statusFilter)?.label ??
    'ตัวกรองที่เลือก';
  const emptyStateMessage =
    countableItems.length === 0
      ? `ไม่มีรายการที่เปิดใช้งานในหมวด${selectedGroupLabel}สำหรับสาขานี้`
      : query.trim()
        ? `ไม่พบรายการที่ตรงกับ “${query.trim()}” ใน${selectedGroupLabel}`
        : statusFilter !== 'all'
          ? `ไม่มี${selectedStatusLabel}ใน${selectedGroupLabel}ขณะนี้`
          : `ไม่มีรายการใน${selectedGroupLabel}สำหรับสาขานี้`;
  const closeEditor = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setEditorOpen(false);
  };
  const beginEdit = (item: InventoryItem) => {
    setEditing(item);
    setEditorOpen(true);
    setQuantity(String(item.quantity));
    setNote('ตรวจนับสิ้นกะ');
    setManufacturedAt(dateInputValue(item.manufacturedAt));
    setExpiryDate(dateInputValue(item.expiryDate));
    setError('');
  };
  const save = async () => {
    if (!editing) return;
    const next = Number(quantity);
    if (!quantity.trim() || !Number.isFinite(next) || next < 0) {
      setError('กรอกจำนวนคงเหลือเป็น 0 หรือมากกว่า');
      return;
    }
    if (!note.trim()) {
      setError('ระบุหมายเหตุของการปรับยอด');
      return;
    }
    if (manufacturedAt && expiryDate && manufacturedAt > expiryDate) {
      setError('วันผลิตต้องไม่เกินวันหมดอายุ');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onAdjust(editing, next, note.trim(), {
        manufacturedAt,
        expiryDate,
      });
      closeEditor();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'ไม่สามารถบันทึกยอดได้',
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Stack sx={{ gap: 2.5 }}>
      <Paper
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: '15px',
          border: '1px solid #e8ddd5',
        }}
      >
        <Stack sx={{ gap: 1.25 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.25 }}>
            <TextField
              select
              label="กรองประเภท"
              value={group}
              onChange={(event) => {
                setGroup(event.target.value as InventoryGroup);
                setStatusFilter('all');
                closeEditor();
              }}
              sx={{ minWidth: { sm: 250 } }}
            >
              {groups.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
            <SearchField
              size="small"
              fullWidth
              placeholder="ค้นหารายการ"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </Stack>
          <Box
            aria-label="ตัวกรองสถานะสต๊อก"
            sx={{
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              overflowY: 'visible',
              pt: 1.5,
              pb: 0.25,
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {statusFilters.map((item) => (
              <FilterPill
                key={item.id}
                selected={statusFilter === item.id}
                count={item.id === 'all' ? undefined : filterCounts[item.id]}
                aria-label={`${item.label} ${filterCounts[item.id]} รายการ`}
                sx={{ flex: '0 0 auto' }}
                onClick={() => setStatusFilter(item.id)}
              >
                {item.label}
              </FilterPill>
            ))}
          </Box>
        </Stack>
      </Paper>
      {loading ? (
        <Typography color="text.secondary">กำลังโหลดรายการสต๊อก…</Typography>
      ) : filtered.length === 0 ? (
        <Alert severity="info">{emptyStateMessage}</Alert>
      ) : (
        <Box
          aria-label="รายการตรวจนับสต๊อก"
          role="list"
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(5, minmax(0, 1fr))',
            },
            gap: { xs: 1.25, sm: 2 },
            alignContent: 'start',
          }}
        >
          {filtered.map((item) => {
            const imageUrl = item.imageUrl?.trim() || imagePlaceholderImage;
            return (
              <Card
                key={item.id}
                role="listitem"
                variant="outlined"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  minWidth: 0,
                  borderRadius: '15px',
                  borderColor:
                    item.status === 'out'
                      ? 'error.light'
                      : item.status === 'low'
                        ? 'warning.light'
                        : '#e8ddd5',
                  bgcolor: item.status === 'out' ? '#fff8f7' : '#fff',
                }}
              >
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={imageUrl}
                    alt={`รูป${item.name}`}
                    onError={(event) => {
                      if (event.currentTarget.src !== imagePlaceholderImage)
                        event.currentTarget.src = imagePlaceholderImage;
                    }}
                    sx={{
                      display: 'block',
                      width: '100%',
                      aspectRatio: '1 / 1',
                      objectFit:
                        imageUrl === imagePlaceholderImage
                          ? 'contain'
                          : 'cover',
                      objectPosition: 'center',
                      p: imageUrl === imagePlaceholderImage ? '25%' : 0,
                      boxSizing: 'border-box',
                      bgcolor: '#f5eee8',
                      filter: item.status === 'out' ? 'grayscale(.45)' : 'none',
                    }}
                  />
                  <Chip
                    label={
                      item.status === 'out'
                        ? 'หมด'
                        : item.status === 'low'
                          ? 'ใกล้หมด'
                          : item.status === 'stale'
                            ? 'ค้างสต๊อก'
                            : item.expiryStatus === 'expiring_soon'
                              ? 'มีของ แต่ใกล้หมดอายุ'
                              : 'เพียงพอ'
                    }
                    color={
                      item.status === 'out'
                        ? 'error'
                        : item.status === 'low'
                          ? 'warning'
                          : item.status === 'stale'
                            ? 'default'
                            : item.expiryStatus === 'expiring_soon'
                              ? 'warning'
                              : 'success'
                    }
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: { xs: 8, sm: 12 },
                      right: { xs: 8, sm: 12 },
                      height: 25,
                      borderRadius: '12px',
                      fontSize: 11,
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    p: { xs: 1.25, sm: 2.5 },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: 14, sm: 18 },
                      fontWeight: 600,
                      lineHeight: 1.35,
                    }}
                  >
                    {item.name}
                  </Typography>
                  <Typography
                    color="text.secondary"
                    sx={{ mt: 0.4, fontSize: { xs: 11, sm: 13 } }}
                  >
                    คงเหลือ {item.quantity.toLocaleString('th-TH')} {item.unit}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.3,
                      color: '#5f4030',
                      fontSize: { xs: 12.5, sm: 14 },
                      fontWeight: 700,
                      lineHeight: 1.35,
                    }}
                  >
                    ผลิต: {formatExpiryDate(item.manufacturedAt)}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.15,
                      color: '#5f4030',
                      fontSize: { xs: 12.5, sm: 14 },
                      fontWeight: 700,
                      lineHeight: 1.35,
                    }}
                  >
                    หมดอายุ: {formatExpiryDate(item.expiryDate)}
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gap: { xs: 0.75, sm: 1 },
                      mt: 'auto',
                      pt: { xs: 1.25, sm: 2 },
                    }}
                  >
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => beginEdit(item)}
                      sx={{
                        flex: 1,
                        minHeight: { xs: 32, sm: 36 },
                        borderRadius: '10px',
                        bgcolor: '#5f4030',
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
                        fontSize: { xs: 11, sm: 14 },
                      }}
                    >
                      บันทึกยอดจริง
                    </Button>
                    {group === 'ingredient' ? (
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => onOrderIngredients?.(item)}
                        sx={{
                          minHeight: { xs: 32, sm: 36 },
                          borderRadius: '10px',
                          borderColor: '#5f4030',
                          color: '#5f4030',
                          fontSize: { xs: 11, sm: 14 },
                        }}
                      >
                        สั่งซื้อวัตถุดิบ
                      </Button>
                    ) : null}
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}
      <Drawer
        anchor="bottom"
        open={editorOpen}
        onClose={closeEditor}
        transitionDuration={{ enter: 360, exit: 280 }}
        slotProps={{
          transition: {
            onExited: () => setEditing(null),
          },
          paper: {
            sx: {
              maxWidth: { xs: 720, lg: 'none' },
              mx: 'auto',
              left: { lg: '230px' },
              width: { xs: '100%', lg: 'calc(100% - 230px)' },
              bottom: {
                xs: 'calc(var(--stock-mobile-nav-height, 82px) + env(safe-area-inset-bottom))',
                md: 0,
                lg: 0,
              },
              height: { xs: 'auto', md: 'auto', lg: 'auto' },
              maxHeight: {
                xs: 'calc(100dvh - var(--stock-mobile-nav-height, 82px) - env(safe-area-inset-bottom))',
                md: '82dvh',
                lg: 'calc(100dvh - 72px)',
              },
              top: { lg: 'auto' },
              borderRadius: { xs: 0, lg: '24px 24px 0 0' },
              p: { xs: 2, sm: 3 },
              bgcolor: '#fffaf7',
              // The phone navigation is deliberately reserved while the
              // sheet is idle. Once an editor field opens the keyboard,
              // that reserve leaves a visible gap below the sheet, making it
              // appear to float. Let the sheet meet the keyboard instead.
              // Larger breakpoints retain their existing desktop placement.
              '@media (max-width: 599.95px)': {
                '&:has(input:focus, textarea:focus)': {
                  bottom: 0,
                },
              },
            },
          },
        }}
      >
        {editing ? (
          <Stack
            aria-label={`บันทึกยอดจริง ${editing.name}`}
            component="section"
            sx={{ gap: 1.5, overflowY: 'auto' }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 20, fontWeight: 700 }}>
                  บันทึกคงเหลือจริง
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                  {editing.name} · ยอดเดิม {editing.quantity} {editing.unit}
                </Typography>
              </Box>
              <Button
                onClick={closeEditor}
                color="inherit"
                sx={{
                  minWidth: 58,
                  minHeight: 36,
                  px: 1.5,
                  borderRadius: '10px',
                  bgcolor: '#eadfd7',
                  color: '#3c2d24',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#ddcec3' },
                }}
              >
                ปิด
              </Button>
            </Box>
            <Divider />
            <TextField
              label={`จำนวนคงเหลือ (${editing.unit})`}
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 1.25,
              }}
            >
              <DateField
                label="วันผลิต"
                value={manufacturedAt}
                onChange={(event) => setManufacturedAt(event.target.value)}
              />
              <DateField
                label="วันหมดอายุ"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
              />
            </Box>
            <Typography color="text.secondary" sx={{ fontSize: 12 }}>
              เว้นว่างได้หากสินค้าไม่มีวันที่บนฉลาก
            </Typography>
            <TextField
              label="หมายเหตุ"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              helperText="ตัวอย่าง: ตรวจนับสิ้นกะ, ของเสีย, รับของเข้าร้าน"
            />
            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={saving}
              onClick={() => void save()}
              sx={{
                width: '100%',
                height: 56,
                minHeight: 56,
                justifyContent: 'center',
                bgcolor: '#3c2d24',
              }}
            >
              ยืนยันบันทึก
            </Button>
          </Stack>
        ) : null}
      </Drawer>
      <ActionSnackbar
        notice={error ? { message: error, severity: 'error' } : null}
        onClose={() => setError('')}
        topOnTablet
      />
    </Stack>
  );
}
