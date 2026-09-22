import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Drawer,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ActionSnackbar,
  CartIcon,
  coffeeIngredientsImage,
  SearchField,
  selectionPillSx,
} from '@stackbuild/ui';
import { isCountableStockItem, type InventoryItem } from '../api/stock';

type InventoryGroup = 'ingredient' | 'drink_equipment' | 'postal_equipment';
type OrderItem = InventoryItem & { quantityToOrder: number };

const groups: Array<{ id: InventoryGroup; label: string }> = [
  { id: 'ingredient', label: 'วัตถุดิบ' },
  { id: 'drink_equipment', label: 'อุปกรณ์เครื่องดื่ม' },
  { id: 'postal_equipment', label: 'อุปกรณ์ไปรษณีย์' },
];

const destinationCopy = (isFranchise: boolean) =>
  isFranchise
    ? 'ส่งคำขอเข้าหน้าแดชบอร์ดแฟรนไชส์เพื่อให้ผู้ดูแลดำเนินการ'
    : 'ส่งคำขอเข้าหน้าคำสั่งซื้อของสำนักงานใหญ่เพื่อให้ทีม SBC ดำเนินการ';

export function StockOrderPage({
  ingredients,
  drinkStock,
  postalStock,
  isFranchise,
  onCreateRequest,
  pendingItem = null,
  onPendingItemAdded,
}: {
  ingredients: InventoryItem[];
  drinkStock: InventoryItem[];
  postalStock: InventoryItem[];
  isFranchise: boolean;
  onCreateRequest: (
    items: Array<{
      inventoryItemId: number;
      name: string;
      quantity: number;
      unit: string;
    }>,
    note: string,
  ) => Promise<void>;
  pendingItem?: InventoryItem | null;
  onPendingItemAdded?: () => void;
}) {
  const [group, setGroup] = useState<InventoryGroup>('ingredient');
  const [query, setQuery] = useState('');
  const [orderItems, setOrderItems] = useState<Record<number, OrderItem>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [note, setNote] = useState('ขอเติมสินค้าเข้าสต๊อก');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const items =
    group === 'ingredient'
      ? ingredients
      : group === 'drink_equipment'
        ? drinkStock
        : postalStock;
  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          isCountableStockItem(item) &&
          item.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [items, query],
  );
  const selected = Object.values(orderItems);
  const selectedQuantity = selected.reduce(
    (total, item) => total + item.quantityToOrder,
    0,
  );
  const addItem = (item: InventoryItem) => {
    setError('');
    setOrderItems((current) => {
      const selectedItem = current[item.id];
      return {
        ...current,
        [item.id]: {
          ...(selectedItem ?? item),
          quantityToOrder: (selectedItem?.quantityToOrder ?? 0) + 1,
        },
      };
    });
  };
  useEffect(() => {
    if (!pendingItem) return;
    if (!isCountableStockItem(pendingItem)) {
      onPendingItemAdded?.();
      return;
    }
    setError('');
    setOrderItems((current) => {
      const selectedItem = current[pendingItem.id];
      return {
        ...current,
        [pendingItem.id]: {
          ...(selectedItem ?? pendingItem),
          quantityToOrder: (selectedItem?.quantityToOrder ?? 0) + 1,
        },
      };
    });
    setDrawerOpen(true);
    onPendingItemAdded?.();
  }, [onPendingItemAdded, pendingItem]);
  const updateQuantity = (item: OrderItem, quantityToOrder: number) =>
    setOrderItems((current) => {
      if (quantityToOrder < 1) {
        const { [item.id]: _, ...remaining } = current;
        return remaining;
      }
      return { ...current, [item.id]: { ...item, quantityToOrder } };
    });
  const submit = async () => {
    if (!selected.length) {
      setError('เลือกรายการที่ต้องการสั่งอย่างน้อย 1 รายการ');
      return;
    }
    if (!note.trim()) {
      setError('ระบุหมายเหตุสำหรับคำสั่งซื้อ');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onCreateRequest(
        selected.map((item) => ({
          inventoryItemId: item.id,
          name: item.name,
          quantity: item.quantityToOrder,
          unit: item.unit,
        })),
        note.trim(),
      );
      setOrderItems({});
      setDrawerOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'ส่งคำสั่งซื้อไม่สำเร็จ',
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
          sx={{ gap: 1.25, alignItems: { sm: 'center' } }}
        >
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {groups.map((item) => (
              <Button
                key={item.id}
                variant={group === item.id ? 'contained' : 'outlined'}
                onClick={() => setGroup(item.id)}
                sx={selectionPillSx(group === item.id)}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
          <SearchField
            size="small"
            fullWidth
            placeholder="ค้นหาสินค้าที่ต้องการสั่ง"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button
            aria-label="เปิดรายการสั่งซื้อ"
            onClick={() => setDrawerOpen(true)}
            variant="contained"
            startIcon={<CartIcon size={19} />}
            sx={{
              flexShrink: 0,
              borderRadius: '12px',
              bgcolor: '#5f4030',
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: '#3c2d24' },
            }}
          >
            รายการสั่งซื้อ ({selectedQuantity})
          </Button>
        </Stack>
      </Paper>

      <Alert severity="info" icon={false} sx={{ borderRadius: '12px' }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
          {isFranchise ? 'คำสั่งซื้อแฟรนไชส์' : 'คำสั่งซื้อสาขา SBC'}
        </Typography>
        <Typography sx={{ fontSize: 13 }}>
          {destinationCopy(isFranchise)}
        </Typography>
      </Alert>

      {visibleItems.length ? (
        <Box
          role="list"
          aria-label="รายการสินค้าสำหรับสั่งซื้อ"
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
            gap: { xs: 1.25, sm: 2 },
          }}
        >
          {visibleItems.map((item, index) => {
            const selectedQuantityForItem =
              orderItems[item.id]?.quantityToOrder ?? 0;
            return (
              <Card
                key={item.id}
                role="listitem"
                variant="outlined"
                sx={{
                  overflow: 'hidden',
                  borderRadius: '15px',
                  borderColor: '#e8ddd5',
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
                    }}
                  />
                  {selectedQuantityForItem ? (
                    <Chip
                      label={`เลือก ${selectedQuantityForItem}`}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: '#e6f2e8',
                        color: '#2d6d47',
                        fontWeight: 700,
                      }}
                    />
                  ) : null}
                </Box>
                <Stack sx={{ p: { xs: 1.25, sm: 2 }, gap: 0.5 }}>
                  <Typography
                    sx={{ fontSize: { xs: 14, sm: 16 }, fontWeight: 700 }}
                  >
                    {item.name}
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                    คงเหลือ {item.quantity.toLocaleString('th-TH')} {item.unit}
                  </Typography>
                  <Button
                    aria-label={`เพิ่ม ${item.name} ในรายการสั่งซื้อ`}
                    variant="contained"
                    size="small"
                    onClick={() => addItem(item)}
                    sx={{
                      mt: 0.75,
                      borderRadius: '10px',
                      bgcolor: '#5f4030',
                      '&:hover': { bgcolor: '#3c2d24' },
                    }}
                  >
                    เพิ่มในรายการ
                  </Button>
                </Stack>
              </Card>
            );
          })}
        </Box>
      ) : (
        <Alert severity="info">ไม่พบสินค้าที่ตรงกับคำค้นหา</Alert>
      )}

      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              maxWidth: 720,
              width: '100%',
              mx: 'auto',
              p: { xs: 2, sm: 3 },
              borderRadius: '24px 24px 0 0',
              bgcolor: '#fffaf7',
            },
          },
        }}
      >
        <Stack sx={{ gap: 2 }}>
          <Box>
            <Typography component="h2" sx={{ fontSize: 20, fontWeight: 700 }}>
              วัตถุดิบ
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 13 }}>
              {destinationCopy(isFranchise)}
            </Typography>
          </Box>
          {selected.length ? (
            selected.map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{ p: 1.25, borderRadius: '12px', borderColor: '#e8ddd5' }}
              >
                <Stack
                  direction="row"
                  sx={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>
                      {item.name}
                    </Typography>
                    <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                      หน่วย {item.unit}
                    </Typography>
                  </Box>
                  <Stack
                    direction="row"
                    sx={{ alignItems: 'center', gap: 0.5 }}
                  >
                    <Button
                      aria-label={`ลดจำนวน ${item.name}`}
                      onClick={() =>
                        updateQuantity(item, item.quantityToOrder - 1)
                      }
                      sx={{ minWidth: 34, border: '1px solid #d8c8bd' }}
                    >
                      −
                    </Button>
                    <Typography
                      sx={{
                        minWidth: 24,
                        textAlign: 'center',
                        fontWeight: 700,
                      }}
                    >
                      {item.quantityToOrder}
                    </Typography>
                    <Button
                      aria-label={`เพิ่มจำนวน ${item.name}`}
                      onClick={() =>
                        updateQuantity(item, item.quantityToOrder + 1)
                      }
                      sx={{ minWidth: 34, border: '1px solid #d8c8bd' }}
                    >
                      +
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))
          ) : (
            <Alert severity="info">ยังไม่มีสินค้าในรายการสั่งซื้อ</Alert>
          )}
          <TextField
            label="หมายเหตุ"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            multiline
            minRows={2}
          />
          <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1 }}>
            <Button variant="outlined" onClick={() => setDrawerOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              disabled={saving || selected.length === 0}
              onClick={() => void submit()}
              sx={{ bgcolor: '#5f4030', '&:hover': { bgcolor: '#3c2d24' } }}
            >
              {saving ? 'กำลังส่งคำสั่งซื้อ…' : 'ส่งคำสั่งซื้อ'}
            </Button>
          </Stack>
        </Stack>
      </Drawer>
      <ActionSnackbar
        notice={error ? { message: error, severity: 'error' } : null}
        onClose={() => setError('')}
      />
    </Stack>
  );
}
