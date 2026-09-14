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
import { CartIcon, coffeeIngredientsImage } from '@stackbuild/ui';
import type { MenuItem } from '../api/stock';
import {
  detectReceiptChannel,
  matchReceiptMenus,
  type ReceiptChannel,
} from '../utils/receiptOcr';

type MenuConsumptionPageProps = {
  menus: MenuItem[];
  loading: boolean;
  onConsume: (
    items: Array<{ menuItemId: number; quantity: number }>,
    note: string,
    channel: 'storefront' | 'lineman',
  ) => Promise<void>;
  cartRequestId?: number;
  onCartRequestHandled?: () => void;
  onCartItemCountChange?: (count: number) => void;
};

const receiptChannelLabel = (channel: ReceiptChannel | null) => {
  if (channel === 'lineman') return 'ออเดอร์ LINE MAN';
  if (channel === 'storefront') return 'ออเดอร์หน้าร้าน';
  return 'ภาพออเดอร์';
};

export function MenuConsumptionPage({
  menus,
  loading,
  onConsume,
  cartRequestId = 0,
  onCartRequestHandled,
  onCartItemCountChange,
}: MenuConsumptionPageProps) {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [note, setNote] = useState('สรุปยอดสิ้นกะ');
  const [error, setError] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [receiptProgress, setReceiptProgress] = useState('');
  const [receiptChannel, setReceiptChannel] = useState<ReceiptChannel | null>(
    null,
  );
  const [readingReceipt, setReadingReceipt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [channel, setChannel] = useState<'storefront' | 'lineman'>(
    'storefront',
  );
  const list = useMemo(
    () =>
      menus.filter((menu) =>
        menu.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [menus, query],
  );
  const selected = menus.filter((menu) => cart[menu.id] > 0);
  const selectedQuantity = selected.reduce(
    (total, menu) => total + cart[menu.id],
    0,
  );
  useEffect(() => {
    onCartItemCountChange?.(selectedQuantity);
  }, [onCartItemCountChange, selectedQuantity]);
  useEffect(() => {
    if (cartRequestId === 0) return;
    setCartOpen(true);
    onCartRequestHandled?.();
  }, [cartRequestId, onCartRequestHandled]);
  useEffect(() => () => onCartItemCountChange?.(0), [onCartItemCountChange]);
  const change = (id: number, amount: number) =>
    setCart((current) => ({
      ...current,
      [id]: Math.max(0, (current[id] ?? 0) + amount),
    }));
  const readReceipt = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setReceiptError('รองรับรูปใบเสร็จ JPG, PNG หรือ WEBP เท่านั้น');
      return;
    }

    setReadingReceipt(true);
    setReceiptError('');
    setReceiptChannel(null);
    setReceiptProgress('กำลังเตรียมอ่านข้อความจากใบเสร็จ…');
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('tha+eng', 1, {
        logger: (message) => {
          if (message.status === 'recognizing text') {
            setReceiptProgress(
              `กำลังอ่านใบเสร็จ ${Math.round(message.progress * 100)}%`,
            );
          }
        },
      });
      const result = await worker.recognize(file);
      await worker.terminate();

      const detectedChannel = detectReceiptChannel(result.data.text);
      if (detectedChannel) setChannel(detectedChannel);
      setReceiptChannel(detectedChannel);
      setReceiptFileName(file.name);
      const matches = matchReceiptMenus(result.data.text, menus);
      if (!matches.length) {
        setReceiptError(
          'ตรวจพบ' +
            receiptChannelLabel(detectedChannel) +
            ' แต่ไม่พบชื่อเมนูที่ตรงกับในระบบ กรุณาเลือกเมนูและจำนวนเอง',
        );
        return;
      }

      setCart(
        Object.fromEntries(
          matches.map((match) => [match.menuItemId, match.quantity]),
        ),
      );
      setNote(
        'ตัดสต๊อกจาก' + receiptChannelLabel(detectedChannel) + ' ' + file.name,
      );
      setReceiptProgress(
        'อ่านพบ ' +
          matches.length +
          ' เมนู' +
          (detectedChannel
            ? 'จาก' + receiptChannelLabel(detectedChannel)
            : '') +
          ' โปรดตรวจจำนวนก่อนยืนยัน',
      );
    } catch {
      setReceiptError('ไม่สามารถอ่านใบเสร็จได้ กรุณาลองใช้รูปที่คมชัดขึ้น');
    } finally {
      setReadingReceipt(false);
    }
  };
  const save = async () => {
    const items = selected.map((menu) => ({
      menuItemId: menu.id,
      quantity: cart[menu.id],
    }));
    if (!items.length) {
      setError('เลือกเมนูที่ขายอย่างน้อย 1 รายการ');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onConsume(items, note, channel);
      setCart({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ไม่สามารถตัดสต๊อกได้');
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Stack sx={{ gap: 2.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            สรุปเมนูที่ขาย
          </Typography>
          <Typography color="text.secondary">
            เลือกจำนวนที่ขาย ระบบจะตัดวัตถุดิบตามสูตรอัตโนมัติ
          </Typography>
        </Box>
        <Paper sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '15px' }}>
          <Stack
            direction="row"
            sx={{
              mb: 2,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" spacing={1}>
              <Button
                variant={channel === 'storefront' ? 'contained' : 'outlined'}
                onClick={() => setChannel('storefront')}
              >
                หน้าร้าน
              </Button>
              <Button
                variant={channel === 'lineman' ? 'contained' : 'outlined'}
                onClick={() => setChannel('lineman')}
              >
                LINE MAN
              </Button>
            </Stack>
            <Button
              aria-label="เปิดตะกร้าตัดสต๊อก"
              onClick={() => setCartOpen(true)}
              variant="outlined"
              startIcon={<CartIcon size={20} />}
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                borderColor: '#5f4030',
                color: '#5f4030',
              }}
            >
              ตะกร้า ({selectedQuantity})
            </Button>
          </Stack>
          <TextField
            fullWidth
            label="ค้นหาเมนู"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Paper>
        <Paper
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: '15px',
            border: '1px dashed',
            borderColor: '#d7c5b8',
            bgcolor: '#fffcfa',
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
              <Typography sx={{ fontWeight: 700 }}>
                อ่านออเดอร์เพื่อตัดสต๊อก
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                อัปโหลดภาพ LINE MAN หรือออเดอร์หน้าร้าน
                ระบบจะอ่านชื่อเมนูและจำนวน แล้วให้ตรวจสอบก่อนตัด
              </Typography>
            </Box>
            <Button
              component="label"
              variant="outlined"
              disabled={readingReceipt}
              sx={{ flexShrink: 0, borderColor: '#5f4030', color: '#5f4030' }}
            >
              {readingReceipt ? 'กำลังอ่านออเดอร์…' : 'อัปโหลดภาพออเดอร์'}
              <input
                hidden
                accept="image/jpeg,image/png,image/webp"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void readReceipt(file);
                }}
              />
            </Button>
          </Stack>
          {receiptFileName && (
            <Typography sx={{ mt: 1.25, fontSize: 13, color: '#5f4030' }}>
              ไฟล์ล่าสุด: {receiptFileName}
            </Typography>
          )}
          {receiptChannel && (
            <Typography sx={{ mt: 0.75, fontSize: 13, color: '#5f4030' }}>
              ตรวจพบช่องทาง:{' '}
              {receiptChannel === 'lineman' ? 'LINE MAN' : 'หน้าร้าน'}
            </Typography>
          )}
          {receiptProgress && (
            <Typography color="text.secondary" sx={{ mt: 1.25, fontSize: 13 }}>
              {receiptProgress}
            </Typography>
          )}
          {receiptError && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              {receiptError}
            </Alert>
          )}
        </Paper>
        {loading ? (
          <Typography color="text.secondary">กำลังโหลดเมนู…</Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(2, minmax(0, 1fr))',
              },
              gap: { xs: 1.25, sm: 2 },
              alignContent: 'start',
            }}
          >
            {list.map((menu, index) => {
              const quantity = cart[menu.id] ?? 0;
              const unavailableLabel =
                menu.recipeStatus === 'missing_recipe'
                  ? 'ไม่มีสูตร'
                  : 'วัตถุดิบไม่พอ';
              const ingredients = menu.ingredients ?? [];
              const lowestIngredient = ingredients.reduce<
                (typeof ingredients)[number] | undefined
              >(
                (lowest, ingredient) =>
                  !lowest ||
                  ingredient.inventoryQuantity < lowest.inventoryQuantity
                    ? ingredient
                    : lowest,
                undefined,
              );
              return (
                <Card
                  key={menu.id}
                  variant="outlined"
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderRadius: '15px',
                    borderColor: menu.sellable ? '#e8ddd5' : 'warning.light',
                    bgcolor: menu.sellable ? '#fff' : '#fffbf7',
                    opacity: menu.sellable ? 1 : 0.76,
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
                        aspectRatio: '4 / 3',
                        objectFit: 'cover',
                        objectPosition: `${15 + (index % 4) * 20}% 50%`,
                        filter: menu.sellable ? 'none' : 'grayscale(.45)',
                      }}
                    />
                    <Chip
                      label={menu.sellable ? 'พร้อมตัดสต๊อก' : unavailableLabel}
                      size="small"
                      color={menu.sellable ? 'success' : 'warning'}
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
                      {menu.name}
                    </Typography>
                    <Typography
                      color="text.secondary"
                      sx={{ mt: 0.6, fontSize: { xs: 11, sm: 13 } }}
                    >
                      {menu.category || 'เมนู'} ·{' '}
                      {menu.sellable
                        ? 'ตัดวัตถุดิบตามสูตรอัตโนมัติ'
                        : 'ยังไม่สามารถตัดสต๊อกได้'}
                    </Typography>
                    {lowestIngredient && (
                      <Typography
                        sx={{
                          mt: 1,
                          color: '#5f4030',
                          fontSize: { xs: 11, sm: 13 },
                        }}
                      >
                        วัตถุดิบ {ingredients.length} รายการ · เหลือน้อยสุด{' '}
                        {lowestIngredient.inventoryQuantity.toLocaleString(
                          'th-TH',
                        )}{' '}
                        {lowestIngredient.inventoryUnit}
                      </Typography>
                    )}
                    <Typography
                      sx={{
                        mt: 1.5,
                        color: '#5f4030',
                        fontWeight: 700,
                        fontSize: { xs: 11, sm: 14 },
                      }}
                    >
                      เลือกตัดแล้ว {quantity} แก้ว / จาน
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: { xs: 0.75, sm: 1 },
                        mt: 'auto',
                        pt: { xs: 1.25, sm: 2 },
                      }}
                    >
                      <Button
                        aria-label={`ลดจำนวน ${menu.name}`}
                        size="small"
                        variant="outlined"
                        disabled={quantity === 0}
                        onClick={() => change(menu.id, -1)}
                        sx={{
                          flex: 1,
                          minHeight: { xs: 32, sm: 36 },
                          borderRadius: '10px',
                          borderColor: '#d7c5b8',
                          color: '#5f4030',
                          fontSize: { xs: 11, sm: 14 },
                        }}
                      >
                        ลดจำนวน
                      </Button>
                      <Button
                        aria-label={`ตัดสต๊อก ${menu.name}`}
                        size="small"
                        variant="contained"
                        disabled={!menu.sellable}
                        onClick={() => change(menu.id, 1)}
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
                        ตัดสต๊อก +1
                      </Button>
                    </Box>
                  </Box>
                </Card>
              );
            })}
          </Box>
        )}
      </Stack>
      <Drawer
        anchor="bottom"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        slotProps={{
          paper: {
            sx: {
              maxWidth: 720,
              mx: 'auto',
              width: '100%',
              maxHeight: '82dvh',
              borderRadius: '24px 24px 0 0',
              p: { xs: 2, sm: 3 },
            },
          },
        }}
      >
        <Stack sx={{ gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 20, fontWeight: 700 }}>
                ตะกร้าตัดสต๊อก
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                เลือกแล้ว {selectedQuantity} แก้ว / จาน
              </Typography>
            </Box>
            <Button onClick={() => setCartOpen(false)} color="inherit">
              ปิด
            </Button>
          </Box>
          {selected.length ? (
            <Stack sx={{ gap: 1, overflowY: 'auto' }}>
              {selected.map((menu) => (
                <Paper
                  key={menu.id}
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: '12px' }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                      {menu.name}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ alignItems: 'center' }}
                    >
                      <Button
                        aria-label={`ลดจำนวนในตะกร้า ${menu.name}`}
                        size="small"
                        onClick={() => change(menu.id, -1)}
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
                        {cart[menu.id]}
                      </Typography>
                      <Button
                        aria-label={`เพิ่มจำนวนในตะกร้า ${menu.name}`}
                        size="small"
                        onClick={() => change(menu.id, 1)}
                      >
                        +
                      </Button>
                    </Stack>
                  </Box>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary">ยังไม่ได้เลือกเมนู</Typography>
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
            disabled={!selected.length || saving}
            onClick={() => void save()}
            sx={{ bgcolor: '#3c2d24', py: 1.2 }}
          >
            ยืนยันตัดวัตถุดิบตามสูตร
          </Button>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </Drawer>
    </>
  );
}
