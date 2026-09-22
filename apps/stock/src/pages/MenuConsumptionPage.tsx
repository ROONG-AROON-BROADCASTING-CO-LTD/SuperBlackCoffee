import { useEffect, useMemo, useState } from 'react';
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
  CartIcon,
  HistoryIcon,
  XIcon,
  coffeeIngredientsImage,
  SearchField,
  selectionPillSx,
} from '@stackbuild/ui';
import type { MenuItem } from '../api/stock';
import {
  matchWorkbookSales,
  readSalesWorkbook,
  type SalesChannel,
  type WorkbookSale,
} from '../utils/salesWorkbook';

type MenuConsumptionPageProps = {
  menus: MenuItem[];
  onRefreshMenus?: () => Promise<MenuItem[]>;
  loading: boolean;
  onConsume: (
    items: Array<{
      menuItemId: number;
      quantity: number;
      channel?: 'storefront' | 'lineman';
    }>,
    note: string,
    channel: 'storefront' | 'lineman',
  ) => Promise<void>;
  cartOpen?: boolean;
  cartMode?: 'consume' | 'order';
  onCartOpenChange?: (open: boolean) => void;
  onCartItemCountChange?: (count: number) => void;
  onStartStockDeduction?: () => void;
  onOpenHistory?: () => void;
};

const cartKey = (menuItemId: number, channel: SalesChannel) =>
  `${channel}:${menuItemId}`;

const channelLabel = (channel: SalesChannel) =>
  channel === 'lineman' ? 'LINE MAN' : 'หน้าร้าน';

const formatSalePrice = (price: number) =>
  new Intl.NumberFormat('th-TH', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
  }).format(price);

function dismissFocusedTextControl() {
  const activeElement = document.activeElement;
  if (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  )
    activeElement.blur();
}

export function MenuConsumptionPage({
  menus,
  onRefreshMenus,
  loading,
  onConsume,
  cartOpen = false,
  cartMode = 'consume',
  onCartOpenChange,
  onCartItemCountChange,
  onStartStockDeduction,
  onOpenHistory,
}: MenuConsumptionPageProps) {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState('สรุปยอดสิ้นกะ');
  const [error, setError] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [receiptFileNames, setReceiptFileNames] = useState<string[]>([]);
  const [receiptProgress, setReceiptProgress] = useState('');
  const [importWarning, setImportWarning] = useState<string[]>([]);
  const [receiptChannel, setReceiptChannel] = useState<SalesChannel | null>(
    null,
  );
  const [readingReceipt, setReadingReceipt] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const menuById = useMemo(
    () => new Map(menus.map((menu) => [menu.id, menu])),
    [menus],
  );
  const selected = Object.entries(cart).flatMap(([key, quantity]) => {
    if (!quantity) return [];
    const [selectedChannel, menuItemId] = key.split(':') as [
      SalesChannel,
      string,
    ];
    const menu = menuById.get(Number(menuItemId));
    return menu ? [{ key, menu, quantity, channel: selectedChannel }] : [];
  });
  const selectedQuantity = selected.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  useEffect(() => {
    onCartItemCountChange?.(selectedQuantity);
  }, [onCartItemCountChange, selectedQuantity]);
  useEffect(() => () => onCartItemCountChange?.(0), [onCartItemCountChange]);
  const setCartVisibility = (open: boolean) => {
    if (!open) dismissFocusedTextControl();
    onCartOpenChange?.(open);
  };
  const change = (id: number, amount: number, itemChannel = channel) => {
    onStartStockDeduction?.();
    setCart((current) => ({
      ...current,
      [cartKey(id, itemChannel)]: Math.max(
        0,
        (current[cartKey(id, itemChannel)] ?? 0) + amount,
      ),
    }));
  };
  const replaceCart = (sales: WorkbookSale[]) =>
    setCart(
      Object.fromEntries(
        sales.map((sale) => [
          cartKey(sale.menuItemId, sale.channel),
          sale.quantity,
        ]),
      ),
    );
  const readWorkbook = async (file: File) => {
    setReadingReceipt(true);
    setReceiptError('');
    setImportWarning([]);
    setReceiptChannel(null);
    setReceiptProgress('กำลังอ่านไฟล์ Excel…');
    try {
      const latestMenus = onRefreshMenus ? await onRefreshMenus() : menus;
      const result = matchWorkbookSales(
        await readSalesWorkbook(file),
        latestMenus,
      );
      setReceiptFileNames([file.name]);
      if (!result.sales.length) {
        setReceiptError(
          'ไม่พบรายการที่จับคู่กับเมนูและช่องทางขายในระบบได้จากไฟล์นี้',
        );
        return;
      }
      replaceCart(result.sales);
      setNote(`ตัดสต๊อกจากไฟล์ Excel ${file.name}`);
      const channels = new Set(result.sales.map((sale) => sale.channel));
      if (channels.size === 1) {
        const [importedChannel] = channels;
        setChannel(importedChannel);
        setReceiptChannel(importedChannel);
      }
      const skipped = [
        ...result.unmatchedMenuNames.map((name) => `ชื่อเมนูไม่ตรง: ${name}`),
        ...result.unsupportedChannelMenuNames.map(
          (name) => `ไม่พบช่องทางขาย: ${name}`,
        ),
      ];
      if (skipped.length) {
        setImportWarning(skipped);
      }
      setReceiptProgress(
        `นำเข้า ${result.sales.length} เมนูจาก ${result.rowCount} แถว${channels.size > 1 ? ' (แยกสูตรหน้าร้านและ LINE MAN แล้ว)' : ''} โปรดตรวจจำนวนก่อนยืนยัน`,
      );
    } catch (cause) {
      setReceiptError(
        cause instanceof Error
          ? cause.message
          : 'ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาใช้ไฟล์ .xlsx จากรายงาน Sale by Bill Detail',
      );
    } finally {
      setReadingReceipt(false);
    }
  };
  const save = async () => {
    const items = selected.map((item) => ({
      menuItemId: item.menu.id,
      quantity: item.quantity,
      channel: item.channel,
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
        <Paper
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: '15px',
            border: '1px solid #e8ddd5',
          }}
        >
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
                sx={selectionPillSx(channel === 'storefront')}
              >
                หน้าร้าน
              </Button>
              <Button
                variant={channel === 'lineman' ? 'contained' : 'outlined'}
                onClick={() => setChannel('lineman')}
                sx={selectionPillSx(channel === 'lineman')}
              >
                LINE MAN
              </Button>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                aria-label="เปิดประวัติที่บันทึก"
                onClick={onOpenHistory}
                variant="outlined"
                startIcon={<HistoryIcon size={18} />}
                sx={{
                  minWidth: 0,
                  borderColor: '#5f4030',
                  color: '#5f4030',
                  px: { xs: 1, sm: 1.5 },
                }}
              >
                ประวัติ
              </Button>
              <Button
                aria-label="เปิดตะกร้าตัดสต๊อก"
                onClick={() => setCartVisibility(true)}
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
          </Stack>
          <SearchField
            fullWidth
            size="small"
            placeholder="ค้นหาเมนู"
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
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
              alignItems: 'center',
              gap: { xs: 1.5, sm: 2.5 },
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }}>
                อ่านออเดอร์เพื่อตัดสต๊อก
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                นำเข้า Sale by Bill Detail (.xlsx) เพื่อใช้ชื่อเมนู จำนวน
                และช่องทางขาย
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Button
                component="label"
                variant="contained"
                disabled={readingReceipt}
                sx={{
                  width: '100%',
                  minHeight: '56px !important',
                  px: { xs: 2, sm: 3.5 },
                  borderRadius: '15px',
                  whiteSpace: 'nowrap',
                  fontSize: { xs: 16, sm: 18 },
                  bgcolor: '#5f4030',
                  '&:hover': { bgcolor: '#3c2d24' },
                }}
              >
                {readingReceipt ? 'กำลังอ่านไฟล์…' : 'นำเข้า Excel'}
                <input
                  hidden
                  aria-label="นำเข้าไฟล์ Excel"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  type="file"
                  onChange={(event) => {
                    const [file] = Array.from(event.target.files ?? []);
                    event.target.value = '';
                    if (file) void readWorkbook(file);
                  }}
                />
              </Button>
            </Box>
          </Box>
          {receiptFileNames.length > 0 && (
            <Typography sx={{ mt: 1.25, fontSize: 13, color: '#5f4030' }}>
              ไฟล์ล่าสุด: {receiptFileNames.join(', ')}
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
          {importWarning.length > 0 && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              <Box>
                <Typography component="div" sx={{ fontWeight: 700, mb: 0.5 }}>
                  ไม่นำเข้า {importWarning.length} รายการเพื่อความปลอดภัย
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {importWarning.map((item) => (
                    <Box component="li" key={item} sx={{ mb: 0.35 }}>
                      {(() => {
                        const separator = item.indexOf(': ');
                        if (separator < 0) return item;
                        return (
                          <>
                            <Box component="span" sx={{ fontWeight: 700 }}>
                              {item.slice(0, separator + 1)}
                            </Box>{' '}
                            {item.slice(separator + 2)}
                          </>
                        );
                      })()}
                    </Box>
                  ))}
                </Box>
              </Box>
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
                lg: 'repeat(5, minmax(0, 1fr))',
              },
              gap: { xs: 1.25, sm: 2 },
              alignContent: 'start',
            }}
          >
            {list.map((menu, index) => {
              const channelSellable =
                channel === 'lineman'
                  ? (menu.linemanSellable ?? menu.sellable)
                  : menu.sellable;
              const channelRecipeStatus =
                channel === 'lineman'
                  ? (menu.linemanRecipeStatus ?? menu.recipeStatus)
                  : menu.recipeStatus;
              const channelPrice =
                channel === 'lineman' ? menu.linemanPrice : menu.storePrice;
              const channelPriceAvailable =
                channel === 'lineman'
                  ? menu.linemanPriceAvailable
                  : menu.storePriceAvailable;
              const imageUrl = menu.imageUrl?.trim() || coffeeIngredientsImage;
              const unavailableLabel =
                channelRecipeStatus === 'missing_recipe'
                  ? 'ไม่มีสูตร'
                  : 'วัตถุดิบไม่พอ';
              return (
                <Card
                  key={menu.id}
                  variant="outlined"
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderRadius: '15px',
                    borderColor: channelSellable ? '#e8ddd5' : 'warning.light',
                    bgcolor: channelSellable ? '#fff' : '#fffbf7',
                    opacity: channelSellable ? 1 : 0.76,
                  }}
                >
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      component="img"
                      src={imageUrl}
                      alt={`รูป${menu.name}`}
                      onError={(event) => {
                        if (event.currentTarget.src !== coffeeIngredientsImage)
                          event.currentTarget.src = coffeeIngredientsImage;
                      }}
                      sx={{
                        display: 'block',
                        width: '100%',
                        aspectRatio: '1 / 1',
                        objectFit: 'cover',
                        objectPosition:
                          imageUrl === coffeeIngredientsImage
                            ? `${15 + (index % 4) * 20}% 50%`
                            : 'center',
                        filter: channelSellable ? 'none' : 'grayscale(.45)',
                      }}
                    />
                    <Chip
                      label={
                        channelSellable ? 'พร้อมตัดสต๊อก' : unavailableLabel
                      }
                      size="small"
                      color={channelSellable ? 'success' : 'warning'}
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
                      sx={{
                        mt: { xs: 0.35, sm: 0.6 },
                        color: channelPriceAvailable ? '#805637' : '#8a7d74',
                        fontSize: { xs: 11, sm: 14 },
                        fontWeight: 700,
                        lineHeight: 1.3,
                      }}
                    >
                      {channelPriceAvailable && channelPrice !== undefined
                        ? `ราคา${channelLabel(channel)} ฿${formatSalePrice(channelPrice)}`
                        : `ยังไม่กำหนดราคา${channelLabel(channel)}`}
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
                        aria-label={`ตัดสต๊อก ${menu.name}`}
                        size="small"
                        variant="contained"
                        disabled={!channelSellable}
                        onClick={() => change(menu.id, 1, channel)}
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
        open={cartOpen && cartMode === 'consume'}
        onClose={() => setCartVisibility(false)}
        ModalProps={{
          disableAutoFocus: true,
          disableRestoreFocus: true,
        }}
        // Match the Admin add-ingredient drawer: its longer slide and matching
        // backdrop fade feel deliberate instead of snapping into place.
        transitionDuration={{ enter: 360, exit: 280 }}
        slotProps={{
          paper: {
            sx: {
              maxWidth: { xs: 720, md: 'none' },
              mx: { xs: 'auto', md: 0 },
              left: { md: '280px' },
              width: { xs: '100%', md: 'calc(100% - 304px)' },
              // Sit above the mobile navigation; it must never cover it.
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
              // The visual viewport becomes shorter while a phone keyboard is
              // open. Fill the navigation gap so the sales grid never peeks
              // through between the sheet and keyboard. Tablet layout is kept
              // unchanged.
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
                sx={{
                  fontSize: { xs: 20, md: 22 },
                  fontWeight: { xs: 700, md: 600 },
                }}
              >
                {selected.length ? 'ตัดสต๊อก' : 'ตะกร้า'}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                เลือกแล้ว {selectedQuantity} แก้ว / จาน
              </Typography>
            </Box>
            <Button
              aria-label="ปิด"
              onClick={() => setCartVisibility(false)}
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
                  key={item.key}
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
                    <Box
                      component="img"
                      src={item.menu.imageUrl?.trim() || coffeeIngredientsImage}
                      alt={`รูป${item.menu.name}`}
                      onError={(event) => {
                        if (event.currentTarget.src !== coffeeIngredientsImage)
                          event.currentTarget.src = coffeeIngredientsImage;
                      }}
                      sx={{
                        width: 64,
                        height: 64,
                        aspectRatio: '1 / 1',
                        flexShrink: 0,
                        margin: 0,
                        borderRadius: '8px',
                        objectFit: 'cover',
                        objectPosition: 'center',
                      }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                        {item.menu.name}
                      </Typography>
                      <Typography
                        color="text.secondary"
                        sx={{ mt: 0.5, fontSize: 12 }}
                      >
                        สูตร{channelLabel(item.channel)}
                      </Typography>
                    </Box>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ alignItems: 'center' }}
                    >
                      <Button
                        aria-label={`ลดจำนวนในตะกร้า ${item.menu.name}`}
                        size="small"
                        onClick={() => change(item.menu.id, -1, item.channel)}
                        sx={{
                          minWidth: 34,
                          width: 34,
                          height: 34,
                          borderRadius: '9px',
                          bgcolor: '#eadfd7',
                          color: '#3c2d24',
                          fontSize: 18,
                          lineHeight: 1,
                          '&:hover': { bgcolor: '#ddcec3' },
                        }}
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
                        {item.quantity}
                      </Typography>
                      <Button
                        aria-label={`เพิ่มจำนวนในตะกร้า ${item.menu.name}`}
                        size="small"
                        onClick={() => change(item.menu.id, 1, item.channel)}
                        sx={{
                          minWidth: 34,
                          width: 34,
                          height: 34,
                          borderRadius: '9px',
                          bgcolor: '#eadfd7',
                          color: '#3c2d24',
                          fontSize: 18,
                          lineHeight: 1,
                          '&:hover': { bgcolor: '#ddcec3' },
                        }}
                      >
                        +
                      </Button>
                    </Stack>
                  </Box>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary" sx={{ flex: 1 }}>
              ยังไม่ได้เลือกเมนู
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
            onClick={() => void save()}
            sx={{
              width: '100%',
              height: 56,
              minHeight: 56,
              justifyContent: 'center',
              bgcolor: '#3c2d24',
            }}
          >
            ยืนยันตัดวัตถุดิบตามสูตร
          </Button>
        </Stack>
      </Drawer>
      <ActionSnackbar
        notice={
          error || receiptError
            ? { message: error || receiptError, severity: 'error' }
            : null
        }
        onClose={() => {
          setError('');
          setReceiptError('');
        }}
        topOnTablet
      />
    </>
  );
}
