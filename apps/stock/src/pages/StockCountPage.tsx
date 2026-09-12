import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { InventoryItem } from '../api/stock';

type InventoryGroup = 'ingredient' | 'drink_equipment' | 'postal_equipment';
const groups: Array<{ id: InventoryGroup; label: string }> = [
  { id: 'ingredient', label: 'วัตถุดิบ' },
  { id: 'drink_equipment', label: 'อุปกรณ์เครื่องดื่ม' },
  { id: 'postal_equipment', label: 'อุปกรณ์ไปรษณีย์' },
];

export function StockCountPage({
  ingredients,
  drinkStock,
  postalStock,
  loading,
  onAdjust,
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
}) {
  const [group, setGroup] = useState<InventoryGroup>('ingredient');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<InventoryItem | null>(null);
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
  const beginEdit = (item: InventoryItem) => {
    setEditing(item);
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
      setEditing(null);
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
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          ตรวจนับจำนวนคงเหลือ
        </Typography>
        <Typography color="text.secondary">
          กรอกยอดจริงที่นับได้ ระบบจะบันทึกส่วนต่างและประวัติผู้บันทึกให้ทันที
        </Typography>
      </Box>
      <Paper sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '15px' }}>
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
                  setEditing(null);
                }}
                sx={{ bgcolor: group === item.id ? '#3c2d24' : undefined }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
          <TextField
            size="small"
            label="ค้นหารายการ"
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
        <Stack sx={{ gap: 1.25 }}>
          {filtered.map((item) => (
            <Paper
              key={item.id}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: '15px',
                borderColor:
                  item.status === 'out'
                    ? 'error.light'
                    : item.status === 'low'
                      ? 'warning.light'
                      : 'divider',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                sx={{
                  gap: 1.5,
                  alignItems: { sm: 'center' },
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                  <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                    {item.category}
                  </Typography>
                </Box>
                <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
                  <Chip
                    label={
                      item.status === 'out'
                        ? 'หมด'
                        : item.status === 'low'
                          ? 'ใกล้หมด'
                          : 'เพียงพอ'
                    }
                    color={
                      item.status === 'out'
                        ? 'error'
                        : item.status === 'low'
                          ? 'warning'
                          : 'success'
                    }
                    size="small"
                  />
                  <Typography sx={{ fontWeight: 700 }}>
                    คงเหลือ {item.quantity.toLocaleString('th-TH')} {item.unit}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => beginEdit(item)}
                    sx={{ bgcolor: '#3c2d24' }}
                  >
                    บันทึกยอดจริง
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
      {editing && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            zIndex: 10,
            inset: { xs: 'auto 12px 12px', sm: 'auto 32px 32px auto' },
            width: { xs: 'auto', sm: 440 },
            p: 2.5,
            borderRadius: '15px',
          }}
        >
          <Stack sx={{ gap: 1.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>
                บันทึกคงเหลือจริง
              </Typography>
              <Typography color="text.secondary">
                {editing.name} · ยอดเดิม {editing.quantity} {editing.unit}
              </Typography>
            </Box>
            <Divider />
            <TextField
              autoFocus
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
            <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => setEditing(null)}>ยกเลิก</Button>
              <Button
                variant="contained"
                disabled={saving}
                onClick={() => void save()}
                sx={{ bgcolor: '#3c2d24' }}
              >
                ยืนยันบันทึก
              </Button>
            </Stack>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
