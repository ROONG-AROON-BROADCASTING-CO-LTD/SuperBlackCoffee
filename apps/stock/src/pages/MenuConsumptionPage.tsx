import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Drawer,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  CartIcon,
  SearchIcon,
  coffeeIngredientsImage,
  type SearchIconHandle,
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
  onCartOpenChange?: (open: boolean) => void;
  onCartItemCountChange?: (count: number) => void;
};

const cartKey = (menuItemId: number, channel: SalesChannel) =>
  `${channel}:${menuItemId}`;

const channelLabel = (channel: SalesChannel) =>
  channel === 'lineman' ? 'LINE MAN' : 'หน้าร้าน';

export function MenuConsumptionPage({
  menus,
  onRefreshMenus,
  loading,
  onConsume,
  cartOpen = false,
  onCartOpenChange,
  onCartItemCountChange,
}: MenuConsumptionPageProps) {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState('สรุปยอดสิ้นกะ');
  const [error, setError] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [receiptFileNames, setReceiptFileNames] = useState<string[]>([]);
  const [receiptProgress, setReceiptProgress] = useState('');
  const searchRef = useRef<SearchIconHandle>(null);
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
  const setCartVisibility = (open: boolean) => onCartOpenChange?.(open);
  const change = (id: number, amount: number, itemChannel = channel) =>
    setCart((current) => ({
      ...current,
      [cartKey(id, itemChannel)]: Math.max(
        0,
        (current[cartKey(id, itemChannel)] ?? 0) + amount,
      ),
    }));
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
          <TextField
            fullWidth
            size="small"
            placeholder="ค้นหาเมนู"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => searchRef.current?.startAnimation()}
            onBlur={() => searchRef.current?.stopAnimation()}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: '12px' },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon ref={searchRef} size={18} />
                  </InputAdornment>
                ),
              },
            }}
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
            direction="row"
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: { xs: 1.5, sm: 2.5 },
            }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>
                อ่านออเดอร์เพื่อตัดสต๊อก
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                นำเข้า Sale by Bill Detail (.xlsx) เพื่อใช้ชื่อเมนู จำนวน
                และช่องทางขาย
              </Typography>
            </Box>
            <Stack direction="row" sx={{ flexShrink: 0 }}>
              <Button
                component="label"
                variant="contained"
                disabled={readingReceipt}
                sx={{
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
            </Stack>
          </Stack>
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
          {receiptError && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              {receiptError}
            </Alert>
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
                      src={coffeeIngredientsImage}
                      alt=""
                      aria-hidden="true"
                      sx={{
                        display: 'block',
                        width: '100%',
                        aspectRatio: '1 / 1',
                        objectFit: 'cover',
                        objectPosition: `${15 + (index % 4) * 20}% 50%`,
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
        open={cartOpen}
        onClose={() => setCartVisibility(false)}
        // Match the Admin add-ingredient drawer: its longer slide and matching
        // backdrop fade feel deliberate instead of snapping into place.
        transitionDuration={{ enter: 360, exit: 280 }}
        slotProps={{
          paper: {
            sx: {
              maxWidth: { xs: 720, lg: 'none' },
              mx: 'auto',
              left: { lg: '230px' },
              width: { xs: '100%', lg: 'calc(100% - 230px)' },
              // Sit above the mobile navigation; it must never cover it.
              bottom: {
                xs: 'calc(var(--stock-mobile-nav-height, 82px) + env(safe-area-inset-bottom))',
                md: 0,
                lg: 0,
              },
              height: {
                xs: 'calc(100dvh - var(--stock-mobile-nav-height, 82px) - env(safe-area-inset-bottom))',
                md: 'auto',
                lg: 'calc(100dvh - 72px)',
              },
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
        <Stack sx={{ gap: 2, height: '100%', minHeight: 0 }}>
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
            <Button
              onClick={() => setCartVisibility(false)}
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
                      src={coffeeIngredientsImage}
                      alt=""
                      aria-hidden="true"
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
          {error && <Alert severity="error">{error}</Alert>}
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
    </>
  );
}
