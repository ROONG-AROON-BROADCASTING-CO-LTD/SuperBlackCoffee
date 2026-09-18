import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Drawer,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ActionSnackbar,
  coffeeIngredientsImage,
  SearchField,
  selectionPillSx,
} from '@stackbuild/ui';
import type { InventoryItem } from '../api/stock';

type InventoryGroup = 'ingredient' | 'drink_equipment' | 'postal_equipment';
const groups: Array<{ id: InventoryGroup; label: string }> = [
  { id: 'ingredient', label: 'วัตถุดิบ' },
  { id: 'drink_equipment', label: 'อุปกรณ์เครื่องดื่ม' },
  { id: 'postal_equipment', label: 'อุปกรณ์ไปรษณีย์' },
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
  ) => Promise<void>;
  onOrderIngredients?: (item: InventoryItem) => void;
}) {
  const [group, setGroup] = useState<InventoryGroup>('ingredient');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('ตรวจนับสิ้นกะ');
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
      items.filter((item) =>
        item.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [items, query],
  );
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
    setError('');
  };
  const save = async () => {
    if (!editing) return;
    const next = Number(quantity);
    if (!Number.isFinite(next) || next < 0) {
      setError('กรอกจำนวนคงเหลือเป็น 0 หรือมากกว่า');
      return;
    }
    if (!note.trim()) {
      setError('ระบุหมายเหตุของการปรับยอด');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onAdjust(editing, next, note.trim());
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
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ gap: 1.25, justifyContent: 'space-between' }}
        >
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {groups.map((item) => (
              <Button
                key={item.id}
                variant={group === item.id ? 'contained' : 'outlined'}
                onClick={() => {
                  setGroup(item.id);
                  closeEditor();
                }}
                sx={selectionPillSx(group === item.id)}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
          <SearchField
            size="small"
            fullWidth
            placeholder="ค้นหารายการ"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Stack>
      </Paper>
      {loading ? (
        <Typography color="text.secondary">กำลังโหลดรายการสต๊อก…</Typography>
      ) : filtered.length === 0 ? (
        <Alert severity="info">ไม่มีรายการที่เปิดใช้งานสำหรับสาขานี้</Alert>
      ) : (
        <Box
          aria-label="รายการตรวจนับสต๊อก"
          role="list"
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
            gap: { xs: 1.25, sm: 2 },
            alignContent: 'start',
          }}
        >
          {filtered.map((item, index) => (
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
                  src={coffeeIngredientsImage}
                  alt=""
                  aria-hidden="true"
                  sx={{
                    display: 'block',
                    width: '100%',
                    aspectRatio: '1 / 1',
                    objectFit: 'cover',
                    objectPosition: `${15 + (index % 4) * 20}% 50%`,
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
          ))}
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
