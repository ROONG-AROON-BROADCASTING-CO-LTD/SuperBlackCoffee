import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Drawer,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ActionSnackbar, XIcon } from '@stackbuild/ui';
import { isCountableStockItem, type InventoryItem } from '../api/stock';

type OrderItem = InventoryItem & { quantityToOrder: number };

const destinationCopy = (isFranchise: boolean) =>
  isFranchise
    ? 'ส่งคำขอเข้าหน้าแดชบอร์ดแฟรนไชส์เพื่อให้ผู้ดูแลดำเนินการ'
    : 'ส่งคำขอเข้าหน้าคำสั่งซื้อของสำนักงานใหญ่เพื่อให้ทีม SBC ดำเนินการ';

function dismissFocusedTextControl() {
  const activeElement = document.activeElement;
  if (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  )
    activeElement.blur();
}

export function StockOrderCartDrawer({
  open,
  pendingItem,
  isFranchise,
  onOpenChange,
  onPendingItemAdded,
  onItemCountChange,
  onCreateRequest,
  onCreateExpenseRequest,
}: {
  open: boolean;
  pendingItem: InventoryItem | null;
  isFranchise: boolean;
  onOpenChange: (open: boolean) => void;
  onPendingItemAdded: () => void;
  onItemCountChange: (count: number) => void;
  onCreateRequest: (
    items: Array<{
      inventoryItemId: number;
      name: string;
      quantity: number;
      unit: string;
    }>,
    note: string,
  ) => Promise<void>;
  onCreateExpenseRequest?: (data: {
    title: string;
    category: 'maintenance' | 'office' | 'transport' | 'service' | 'other';
    estimatedAmount: number;
    note: string;
  }) => Promise<void>;
}) {
  const [items, setItems] = useState<Record<number, OrderItem>>({});
  const [note, setNote] = useState('ขอเติมสินค้าเข้าสต๊อก');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expense, setExpense] = useState({
    title: '',
    category: 'other' as const,
    estimatedAmount: '',
    note: '',
  });
  const selected = Object.values(items);
  const quantity = selected.reduce(
    (total, item) => total + item.quantityToOrder,
    0,
  );

  useEffect(() => onItemCountChange(quantity), [onItemCountChange, quantity]);
  useEffect(() => {
    if (!pendingItem) return;
    if (!isCountableStockItem(pendingItem)) {
      onPendingItemAdded();
      return;
    }
    setItems((current) => {
      const currentItem = current[pendingItem.id];
      return {
        ...current,
        [pendingItem.id]: {
          ...(currentItem ?? pendingItem),
          quantityToOrder: (currentItem?.quantityToOrder ?? 0) + 1,
        },
      };
    });
    onPendingItemAdded();
  }, [onPendingItemAdded, pendingItem]);

  const changeQuantity = (item: OrderItem, nextQuantity: number) =>
    setItems((current) => {
      if (nextQuantity < 1) {
        const { [item.id]: _, ...remaining } = current;
        return remaining;
      }
      return {
        ...current,
        [item.id]: { ...item, quantityToOrder: nextQuantity },
      };
    });
  const submit = async () => {
    if (!selected.length)
      return setError('เลือกรายการที่ต้องการสั่งอย่างน้อย 1 รายการ');
    if (!note.trim()) return setError('ระบุหมายเหตุสำหรับคำสั่งซื้อ');
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
      setItems({});
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'ส่งคำสั่งซื้อไม่สำเร็จ',
      );
    } finally {
      setSaving(false);
    }
  };
  const close = () => {
    dismissFocusedTextControl();
    onOpenChange(false);
  };
  const submitExpense = async () => {
    const estimatedAmount = Number(expense.estimatedAmount);
    if (!expense.title.trim() || !expense.note.trim() || estimatedAmount <= 0) {
      setError('กรอกชื่อรายการ ยอดประมาณการ และรายละเอียดให้ครบถ้วน');
      return;
    }
    if (!onCreateExpenseRequest) return;
    setExpenseSaving(true);
    setError('');
    try {
      await onCreateExpenseRequest({
        title: expense.title.trim(),
        category: expense.category,
        estimatedAmount,
        note: expense.note.trim(),
      });
      setExpense({
        title: '',
        category: 'other',
        estimatedAmount: '',
        note: '',
      });
      setExpenseOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'ส่งคำขอค่าใช้จ่ายไม่สำเร็จ',
      );
    } finally {
      setExpenseSaving(false);
    }
  };

  return (
    <>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={close}
        ModalProps={{
          disableAutoFocus: true,
          disableRestoreFocus: true,
        }}
        transitionDuration={{ enter: 360, exit: 280 }}
        slotProps={{
          paper: {
            sx: {
              maxWidth: { xs: 720, md: 'none' },
              mx: { xs: 'auto', md: 0 },
              left: { md: '280px' },
              width: { xs: '100%', md: 'calc(100% - 304px)' },
              bottom: {
                xs: 'calc(var(--stock-mobile-nav-height, 82px) + env(safe-area-inset-bottom))',
                md: 0,
                lg: 0,
              },
              height: {
                xs: 'calc(100dvh - var(--stock-mobile-nav-height, 82px) - env(safe-area-inset-bottom))',
                md: 'calc(100dvh - 72px)',
              },
              maxHeight: {
                xs: 'calc(100dvh - var(--stock-mobile-nav-height, 82px) - env(safe-area-inset-bottom))',
                md: 'calc(100dvh - 72px)',
              },
              top: { md: 'auto' },
              overflowY: { md: 'auto' },
              borderRadius: { xs: 0, md: '22px 22px 0 0' },
              p: { xs: 2, sm: 3, md: 0 },
              px: { md: 4 },
              pt: { md: 1.5 },
              pb: { md: 3.5 },
              bgcolor: '#fffaf7',
              // Only on phones, let the sheet meet the keyboard instead of
              // leaving the mobile-navigation gap open to the product grid.
              '@media (max-width: 599.95px)': {
                '&:has(textarea:focus)': {
                  bottom: 0,
                  height: '100dvh',
                  maxHeight: '100dvh',
                },
              },
            },
          },
        }}
      >
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            width: 44,
            height: 5,
            mx: 'auto',
            mb: 2.5,
            borderRadius: 99,
            bgcolor: '#d8c8bd',
          }}
        />
        <Stack sx={{ gap: 2, height: '100%', minHeight: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography
                component="h2"
                sx={{
                  fontSize: { xs: 20, md: 22 },
                  fontWeight: { xs: 700, md: 600 },
                }}
              >
                {selected.length ? 'วัตถุดิบ' : 'ตะกร้า'}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                {destinationCopy(isFranchise)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {onCreateExpenseRequest ? (
                <Button
                  variant="outlined"
                  onClick={() => setExpenseOpen(true)}
                  sx={{
                    borderRadius: '10px',
                    borderColor: '#805637',
                    color: '#5f4030',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ขอเบิกค่าใช้จ่ายภายนอก
                </Button>
              ) : null}
              <Button
                aria-label="ปิด"
                onClick={close}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: { xs: 58, md: 40 },
                  minHeight: { xs: 36, md: 40 },
                  width: { md: 40 },
                  height: { md: 40 },
                  px: { xs: 1.5, md: 0 },
                  borderRadius: { xs: '10px', md: '12px' },
                  bgcolor: { xs: '#eadfd7', md: '#f7eee8' },
                  color: { xs: '#3c2d24', md: '#5f4b3d' },
                  fontWeight: 700,
                  '&:hover': { bgcolor: { xs: '#ddcec3', md: '#f1e4da' } },
                }}
              >
                <Box
                  component="span"
                  sx={{ display: { xs: 'inline', md: 'none' } }}
                >
                  ปิด
                </Box>
                <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                  <XIcon size={20} />
                </Box>
              </Button>
            </Stack>
          </Box>
          <Divider
            sx={{
              display: { xs: 'none', md: 'block' },
              mx: { xs: -2.5, sm: -4 },
              borderColor: '#e8ddd5',
            }}
          />
          {selected.length ? (
            <Stack sx={{ flex: 1, minHeight: 0, gap: 1, overflowY: 'auto' }}>
              {selected.map((item) => (
                <Paper
                  key={item.id}
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: '12px' }}
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
                      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                        {item.name}
                      </Typography>
                      <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                        หน่วย {item.unit}
                      </Typography>
                    </Box>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ alignItems: 'center' }}
                    >
                      <Button
                        aria-label={`ลดจำนวน ${item.name}`}
                        onClick={() =>
                          changeQuantity(item, item.quantityToOrder - 1)
                        }
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
                          changeQuantity(item, item.quantityToOrder + 1)
                        }
                      >
                        +
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary" sx={{ flex: 1 }}>
              ยังไม่มีสินค้าในรายการสั่งซื้อ
            </Typography>
          )}
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="หมายเหตุ"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button
            fullWidth
            variant="contained"
            size="large"
            disabled={!selected.length || saving}
            onClick={() => void submit()}
            sx={{ height: 56, minHeight: 56, bgcolor: '#3c2d24' }}
          >
            {saving ? 'กำลังส่งคำสั่งซื้อ…' : 'ส่งคำสั่งซื้อ'}
          </Button>
        </Stack>
        {expenseOpen ? (
          <Paper
            role="dialog"
            aria-label="ขอเบิกค่าใช้จ่ายภายนอก"
            sx={{
              position: 'absolute',
              inset: { xs: 0, md: 16 },
              zIndex: 2,
              p: { xs: 2, sm: 3 },
              overflowY: 'auto',
              borderRadius: { xs: 0, md: '16px' },
              bgcolor: '#fffaf7',
            }}
          >
            <Stack sx={{ gap: 2 }}>
              <Box>
                <Typography
                  component="h2"
                  sx={{ fontSize: 20, fontWeight: 700 }}
                >
                  ขอเบิกค่าใช้จ่ายภายนอก
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                  ใช้สำหรับรายการที่ไม่อยู่ในสต็อก เช่น ค่าซ่อม ค่าขนส่ง
                  หรือบริการภายนอก
                </Typography>
              </Box>
              <TextField
                label="ชื่อรายการ"
                value={expense.title}
                onChange={(event) =>
                  setExpense((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                required
                autoFocus
              />
              <TextField
                select
                label="ประเภทค่าใช้จ่าย"
                value={expense.category}
                onChange={(event) =>
                  setExpense((current) => ({
                    ...current,
                    category: event.target.value as typeof current.category,
                  }))
                }
              >
                <MenuItem value="maintenance">ค่าซ่อมบำรุง</MenuItem>
                <MenuItem value="office">ค่าใช้จ่ายสำนักงาน</MenuItem>
                <MenuItem value="transport">ค่าขนส่งและเดินทาง</MenuItem>
                <MenuItem value="service">ค่าบริการภายนอก</MenuItem>
                <MenuItem value="other">อื่น ๆ</MenuItem>
              </TextField>
              <TextField
                label="ยอดประมาณการ (บาท)"
                value={expense.estimatedAmount}
                onChange={(event) =>
                  setExpense((current) => ({
                    ...current,
                    estimatedAmount: event.target.value,
                  }))
                }
                type="number"
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                required
              />
              <TextField
                label="รายละเอียด / เหตุผล"
                value={expense.note}
                onChange={(event) =>
                  setExpense((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                multiline
                minRows={3}
                required
              />
              <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: 'flex-end' }}
              >
                <Button
                  onClick={() => setExpenseOpen(false)}
                  disabled={expenseSaving}
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="contained"
                  onClick={() => void submitExpense()}
                  disabled={expenseSaving}
                  sx={{ bgcolor: '#3c2d24' }}
                >
                  {expenseSaving ? 'กำลังส่งคำขอ…' : 'ส่งคำขอ'}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        ) : null}
        <ActionSnackbar
          notice={error ? { message: error, severity: 'error' } : null}
          onClose={() => setError('')}
        />
      </Drawer>
    </>
  );
}
