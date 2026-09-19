import { useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Drawer,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  DashboardMain,
  FilterPill,
  PlusIcon,
  XIcon,
  coffeeIngredientsImage,
  type XIconHandle,
} from '@stackbuild/ui';

type PromotionStatus = 'active' | 'upcoming' | 'expired';
type PromotionType = 'ส่วนลด' | 'ซื้อ 1 แถม 1' | 'สิทธิพิเศษ';
type RecipeIngredient = { name: string; quantity: string };
type PromotionMenu = {
  id: string;
  name: string;
  category: string;
  price: string;
  imageUrl?: string;
  ingredients: RecipeIngredient[];
};
type Promotion = {
  id: number;
  name: string;
  type: PromotionType;
  benefit: string;
  branches: string;
  period: string;
  channels: string;
  eligibility: string;
  usage: number;
  status: PromotionStatus;
  terms: string[];
  menuItems: PromotionMenu[];
};

const menuTemplates: PromotionMenu[] = [
  {
    id: 'americano-iced',
    name: 'อเมริกาโน่เย็น (M)',
    category: 'เมนูกาแฟเย็น',
    price: '65 บาท',
    ingredients: [
      { name: 'กาแฟคั่วเข้ม', quantity: '18 กรัม' },
      { name: 'น้ำสะอาด', quantity: '180 มล.' },
      { name: 'น้ำแข็ง', quantity: '1 แก้ว' },
    ],
  },
  {
    id: 'latte-hot',
    name: 'ลาเต้ร้อน (M)',
    category: 'เมนูร้อน',
    price: '70 บาท',
    ingredients: [
      { name: 'กาแฟคั่วเข้ม', quantity: '18 กรัม' },
      { name: 'นมสด', quantity: '180 มล.' },
      { name: 'น้ำสะอาด', quantity: '30 มล.' },
    ],
  },
  {
    id: 'caramel-macchiato',
    name: 'คาราเมลมัคคิอาโต้เย็น',
    category: 'เมนูกาแฟเย็น',
    price: '95 บาท',
    ingredients: [
      { name: 'กาแฟคั่วเข้ม', quantity: '18 กรัม' },
      { name: 'นมสด', quantity: '150 มล.' },
      { name: 'ซอสคาราเมล', quantity: '20 มล.' },
    ],
  },
  {
    id: 'matcha-latte',
    name: 'มัทฉะลาเต้เย็น',
    category: 'เมนูชา',
    price: '90 บาท',
    ingredients: [
      { name: 'ผงมัทฉะ', quantity: '4 กรัม' },
      { name: 'นมสด', quantity: '180 มล.' },
      { name: 'น้ำเชื่อม', quantity: '15 มล.' },
    ],
  },
];

const initialPromotions: Promotion[] = [
  {
    id: 1,
    name: 'เติมพลังยามเช้า',
    type: 'ส่วนลด',
    benefit: 'ลด 10 บาท',
    branches: 'ทุกสาขา',
    period: '1 พ.ย. 2569 – 30 พ.ย. 2569',
    channels: 'หน้าร้าน · สั่งผ่านแอป',
    eligibility: 'สมาชิกทุกคนและลูกค้าทั่วไป',
    usage: 1248,
    status: 'active',
    menuItems: [menuTemplates[0], menuTemplates[1]],
    terms: [
      'ใช้ได้กับเมนูที่ร่วมรายการเท่านั้น',
      'ใช้ร่วมกับโปรโมชันอื่นไม่ได้',
      'ระบบจะคิดส่วนลดให้อัตโนมัติเมื่อชำระเงิน',
    ],
  },
  {
    id: 2,
    name: 'อเมริกาโน่ M ซื้อ 1 แถม 1',
    type: 'ซื้อ 1 แถม 1',
    benefit: 'ซื้อ 1 แก้ว รับฟรี 1 แก้ว',
    branches: '12 สาขา',
    period: '15 พ.ย. 2569 – 30 พ.ย. 2569',
    channels: 'หน้าร้าน',
    eligibility: 'สมาชิกทุกคน',
    usage: 856,
    status: 'active',
    menuItems: [menuTemplates[0]],
    terms: [
      'รับสิทธิ์ได้ 1 ครั้งต่อใบเสร็จ',
      'ทั้ง 2 แก้วตัดสต๊อกตามสูตรอเมริกาโน่เย็น',
    ],
  },
  {
    id: 3,
    name: 'สมาชิก รับฟรีไซรัปเพิ่ม',
    type: 'สิทธิพิเศษ',
    benefit: 'เพิ่มไซรัป 1 ช็อตสำหรับสมาชิก',
    branches: 'ทุกสาขา',
    period: '1 พ.ย. 2569 – 31 ธ.ค. 2569',
    channels: 'หน้าร้าน · สั่งผ่านแอป',
    eligibility: 'เฉพาะสมาชิก Super Black',
    usage: 2341,
    status: 'active',
    menuItems: [menuTemplates[2], menuTemplates[3]],
    terms: ['ยืนยันตัวตนสมาชิกก่อนชำระเงิน', 'ใช้ได้กับเมนูที่ร่วมรายการ'],
  },
  {
    id: 4,
    name: 'คาราเมลมัคคิอาโต้ ลด 20%',
    type: 'ส่วนลด',
    benefit: 'ลด 20% สำหรับเมนูตามฤดูกาล',
    branches: '5 สาขา',
    period: '1 ธ.ค. 2569 – 31 ธ.ค. 2569',
    channels: 'หน้าร้าน',
    eligibility: 'สมาชิกทุกคนและลูกค้าทั่วไป',
    usage: 0,
    status: 'upcoming',
    menuItems: [menuTemplates[2]],
    terms: ['ใช้ได้เฉพาะเมนูที่กำหนด', 'ตรวจสอบสาขาที่ร่วมรายการก่อนใช้งาน'],
  },
  {
    id: 5,
    name: 'Mid Year Matcha Special',
    type: 'ส่วนลด',
    benefit: 'ลด 15% สำหรับมัทฉะลาเต้',
    branches: '10 สาขา',
    period: '1 ก.ค. 2569 – 31 ส.ค. 2569',
    channels: 'หน้าร้าน',
    eligibility: 'สมาชิกทุกคนและลูกค้าทั่วไป',
    usage: 654,
    status: 'expired',
    menuItems: [menuTemplates[3]],
    terms: ['สิ้นสุดแคมเปญแล้ว'],
  },
];

const statusLabel: Record<PromotionStatus, string> = {
  active: 'กำลังใช้งาน',
  upcoming: 'กำลังจะเริ่ม',
  expired: 'สิ้นสุดแล้ว',
};
const statusTone: Record<
  PromotionStatus,
  { background: string; color: string }
> = {
  active: { background: '#e5f5eb', color: '#1c7b47' },
  upcoming: { background: '#fff5df', color: '#9a5a10' },
  expired: { background: '#f7e8e7', color: '#b42318' },
};
const blankPromotion = {
  name: '',
  type: 'ส่วนลด' as PromotionType,
  benefit: '',
  branches: 'ทุกสาขา',
  period: '',
  menuId: menuTemplates[0].id,
};

function StatusChip({
  status,
  compact = false,
}: {
  status: PromotionStatus;
  compact?: boolean;
}) {
  return (
    <Chip
      size="small"
      label={statusLabel[status]}
      sx={{
        height: compact ? { xs: 21, sm: 25 } : 25,
        bgcolor: statusTone[status].background,
        color: statusTone[status].color,
        fontFamily: 'Kanit, sans-serif',
        fontSize: compact ? { xs: 9, sm: 11 } : 11,
        fontWeight: 700,
      }}
    />
  );
}

function PromotionCard({
  promotion,
  mode,
  onSelect,
  compact = false,
}: {
  promotion: Promotion;
  mode: 'admin' | 'franchise';
  onSelect: (promotion: Promotion) => void;
  compact?: boolean;
}) {
  const leadMenu = promotion.menuItems[0];
  const ingredients = leadMenu.ingredients;
  return (
    <Card
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: '15px',
        borderColor: '#e8ddd5',
        bgcolor: '#fff',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          aspectRatio: compact ? { xs: '1 / 1', sm: '1 / .72' } : '1 / .72',
          overflow: 'hidden',
          bgcolor: '#f1e8de',
        }}
      >
        <Box
          component="img"
          src={leadMenu.imageUrl ?? coffeeIngredientsImage}
          alt={`รูป${leadMenu.name}`}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <Chip
          label={promotion.type}
          size="small"
          sx={{
            position: 'absolute',
            top: compact ? { xs: 8, sm: 12 } : 12,
            left: compact ? { xs: 8, sm: 12 } : 12,
            height: compact ? { xs: 21, sm: 25 } : 25,
            bgcolor: '#805637',
            color: '#fff',
            fontFamily: 'Kanit, sans-serif',
            fontSize: compact ? { xs: 9, sm: 11 } : 11,
            fontWeight: 700,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: compact ? { xs: 8, sm: 12 } : 12,
            right: compact ? { xs: 8, sm: 12 } : 12,
          }}
        >
          <StatusChip status={promotion.status} compact={compact} />
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          p: compact ? { xs: 1.25, sm: 2 } : 2,
        }}
      >
        <Typography
          noWrap
          sx={{
            color: '#2a211c',
            fontFamily: 'Kanit, sans-serif',
            fontSize: compact ? { xs: 14, sm: 17 } : 17,
            fontWeight: 600,
          }}
        >
          {promotion.name}
        </Typography>
        <Typography
          sx={{
            mt: compact ? { xs: 0, sm: 0.2 } : 0.2,
            color: '#71675f',
            fontFamily: 'Kanit, sans-serif',
            fontSize: compact ? { xs: 10.5, sm: 12 } : 12,
          }}
        >
          {leadMenu.name}
          {promotion.menuItems.length > 1
            ? ` + ${promotion.menuItems.length - 1} เมนู`
            : ''}
        </Typography>
        <Typography
          sx={{
            mt: compact ? { xs: 0.5, sm: 0.9 } : 0.9,
            color: '#805637',
            fontFamily: 'Kanit, sans-serif',
            fontSize: compact ? { xs: 13, sm: 18 } : 18,
            fontWeight: 700,
            lineHeight: 1.25,
          }}
        >
          {promotion.benefit}
        </Typography>
        <Box
          sx={{
            mt: compact ? { xs: 0.75, sm: 1.15 } : 1.15,
            p: compact ? { xs: 0.75, sm: 1 } : 1,
            borderRadius: '9px',
            bgcolor: '#f8f4f1',
          }}
        >
          <Typography
            sx={{
              color: '#5f4b3d',
              fontFamily: 'Kanit, sans-serif',
              fontSize: compact ? { xs: 9.5, sm: 11 } : 11,
              fontWeight: 700,
            }}
          >
            ใช้วัตถุดิบตามสูตร {ingredients.length} รายการ
          </Typography>
          <Typography
            noWrap
            sx={{
              mt: compact ? { xs: 0.2, sm: 0.35 } : 0.35,
              color: '#7b7068',
              fontFamily: 'Kanit, sans-serif',
              fontSize: compact ? { xs: 9.5, sm: 11 } : 11,
            }}
          >
            {ingredients.map((ingredient) => ingredient.name).join(' · ')}
          </Typography>
        </Box>
        <Typography
          sx={{
            mt: compact ? { xs: 0.75, sm: 1 } : 1,
            color: '#71675f',
            fontFamily: 'Kanit, sans-serif',
            fontSize: compact ? { xs: 9.5, sm: 11 } : 11,
            lineHeight: 1.4,
          }}
        >
          {promotion.period}
        </Typography>
        {mode === 'admin' && (
          <Typography
            sx={{
              mt: 0.3,
              color: '#8a7d74',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 11,
            }}
          >
            ใช้แล้ว {promotion.usage.toLocaleString('th-TH')} ครั้ง
          </Typography>
        )}
        <Button
          fullWidth
          variant="outlined"
          onClick={() => onSelect(promotion)}
          sx={{
            mt: 'auto',
            pt: compact ? { xs: 0.5, sm: 1 } : 1,
            minHeight: compact ? { xs: 32, sm: 35 } : 35,
            borderRadius: '10px',
            borderColor: '#d8c8bd',
            color: '#5f4030',
            fontFamily: 'Kanit, sans-serif',
            fontSize: compact ? { xs: 10, sm: 12 } : 12,
            fontWeight: 600,
            '&:hover': { borderColor: '#805637', bgcolor: '#f7eee8' },
          }}
        >
          {mode === 'admin' ? 'จัดการโปรโมชั่น' : 'ดูรายละเอียด'}
        </Button>
      </Box>
    </Card>
  );
}

export function PromotionsManagementPage({
  mode,
  branchName = 'อยุธยา',
  embedded = false,
}: {
  mode: 'admin' | 'franchise';
  branchName?: string;
  /** Render inside another app's content shell without a second topbar offset. */
  embedded?: boolean;
}) {
  const detailsCloseRef = useRef<XIconHandle>(null);
  const createCloseRef = useRef<XIconHandle>(null);
  const [promotions, setPromotions] = useState(initialPromotions);
  const [filter, setFilter] = useState<'all' | PromotionStatus>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Promotion | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState(blankPromotion);
  const canCreate = mode === 'admin';
  const counts = useMemo(
    () =>
      promotions.reduce(
        (result, promotion) => ({
          ...result,
          [promotion.status]: result[promotion.status] + 1,
        }),
        { active: 0, upcoming: 0, expired: 0 } as Record<
          PromotionStatus,
          number
        >,
      ),
    [promotions],
  );
  const visiblePromotions = useMemo(
    () =>
      promotions.filter((promotion) => {
        const normalizedQuery = query.trim().toLocaleLowerCase('th-TH');
        return (
          (filter === 'all' || promotion.status === filter) &&
          (!normalizedQuery ||
            promotion.name
              .toLocaleLowerCase('th-TH')
              .includes(normalizedQuery) ||
            promotion.menuItems.some((menu) =>
              menu.name.toLocaleLowerCase('th-TH').includes(normalizedQuery),
            ))
        );
      }),
    [filter, promotions, query],
  );
  const createPromotion = () => {
    const menuItem = menuTemplates.find((menu) => menu.id === draft.menuId);
    if (
      !draft.name.trim() ||
      !draft.benefit.trim() ||
      !draft.period.trim() ||
      !menuItem
    )
      return;
    const next: Promotion = {
      id: Math.max(...promotions.map((promotion) => promotion.id)) + 1,
      name: draft.name.trim(),
      type: draft.type,
      benefit: draft.benefit.trim(),
      branches: draft.branches.trim() || 'ทุกสาขา',
      period: draft.period.trim(),
      channels: 'หน้าร้าน',
      eligibility: 'สมาชิกทุกคนและลูกค้าทั่วไป',
      usage: 0,
      status: 'upcoming',
      menuItems: [menuItem],
      terms: [
        'ใช้ได้กับเมนูที่ร่วมรายการเท่านั้น',
        'ระบบตัดสต๊อกจากสูตรของเมนูเดิมอัตโนมัติ',
      ],
    };
    setPromotions((items) => [next, ...items]);
    setDraft(blankPromotion);
    setCreateOpen(false);
    setSelected(next);
  };
  const filters: Array<['all' | PromotionStatus, string, number]> = [
    ['all', 'ทั้งหมด', promotions.length],
    ['active', 'กำลังใช้งาน', counts.active],
    ['upcoming', 'กำลังจะเริ่ม', counts.upcoming],
    ['expired', 'สิ้นสุดแล้ว', counts.expired],
  ];
  const selectedMenuDraft =
    menuTemplates.find((menu) => menu.id === draft.menuId) ?? menuTemplates[0];

  const content = (
    <>
      <Box sx={{ pb: 3 }}>
        <Stack
          sx={{
            mb: 2.5,
          }}
        >
          <Box>
            {mode === 'franchise' && (
              <Typography
                sx={{
                  color: '#805637',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                สาขา{branchName}
              </Typography>
            )}
            <Typography
              sx={{
                color: '#3c2d24',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 20,
                fontWeight: 600,
                lineHeight: 1.35,
              }}
            >
              โปรโมชั่น
            </Typography>
            <Typography
              sx={{
                mt: 0.35,
                color: 'text.secondary',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 13,
              }}
            >
              {mode === 'admin'
                ? 'โปรโมชั่นจะใช้สูตรวัตถุดิบของเมนูเดิมในการตัดสต๊อกอัตโนมัติ'
                : 'เลือกดูรายการโปรโมชั่นและเมนูที่ร่วมรายการของสาขาคุณ'}
            </Typography>
          </Box>
        </Stack>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{
            alignItems: { sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
            mb: 1,
          }}
        >
          <TextField
            size="small"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อเมนูหรือโปรโมชั่น"
            slotProps={{ htmlInput: { 'aria-label': 'ค้นหาชื่อโปรโมชั่น' } }}
            sx={{
              width: { xs: '100%', sm: 280 },
              '& .MuiOutlinedInput-root': { borderRadius: '10px' },
            }}
          />
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<PlusIcon size={17} />}
              onClick={() => setCreateOpen(true)}
              sx={{
                alignSelf: { xs: 'stretch', sm: 'auto' },
                minHeight: 42,
                px: 2.25,
                borderRadius: '12px',
                bgcolor: '#3c2d24',
                boxShadow: 'none',
                fontFamily: 'Kanit, sans-serif',
                fontWeight: 700,
                '&:hover': { bgcolor: '#201914', boxShadow: 'none' },
              }}
            >
              เพิ่มโปรโมชั่น
            </Button>
          )}
        </Stack>
        <Stack
          sx={{
            mb: 2.5,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{ overflowX: 'auto', pt: 1.5, pb: 0.4 }}
          >
            {filters.map(([value, label, count]) => (
              <FilterPill
                key={value}
                onClick={() => setFilter(value)}
                selected={filter === value}
                count={
                  value === 'all' || value === 'expired' ? undefined : count
                }
                aria-label={
                  value === 'all' || value === 'expired'
                    ? label
                    : `${label} ${count} รายการ`
                }
                sx={{ flexShrink: 0 }}
              >
                {label}
              </FilterPill>
            ))}
          </Stack>
        </Stack>
        {visiblePromotions.length ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: embedded
                ? {
                    xs: 'repeat(2, minmax(0, 1fr))',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    lg: 'repeat(3, minmax(0, 1fr))',
                  }
                : {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(4, minmax(0, 1fr))',
                  },
              gap: embedded ? { xs: 1.25, sm: 2 } : '16px',
            }}
          >
            {visiblePromotions.map((promotion) => (
              <PromotionCard
                key={promotion.id}
                promotion={promotion}
                mode={mode}
                onSelect={setSelected}
                compact={embedded}
              />
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              py: 8,
              textAlign: 'center',
              border: '1px dashed #dfd2c9',
              borderRadius: '15px',
            }}
          >
            <Typography
              sx={{ color: 'text.secondary', fontFamily: 'Kanit, sans-serif' }}
            >
              ไม่พบโปรโมชั่นตามเงื่อนไขที่เลือก
            </Typography>
          </Box>
        )}
      </Box>
      <Drawer
        anchor="bottom"
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        transitionDuration={{ enter: 360, exit: 280 }}
        slotProps={{
          paper: {
            sx: {
              left: embedded ? { lg: '230px' } : { md: '280px' },
              width: embedded
                ? { lg: 'calc(100% - 230px)' }
                : { md: 'calc(100% - 304px)' },
              bottom: embedded
                ? {
                    xs: 'calc(var(--stock-mobile-nav-height, 82px) + env(safe-area-inset-bottom))',
                    md: 0,
                  }
                : undefined,
              height: embedded
                ? {
                    xs: 'calc(100dvh - var(--stock-mobile-nav-height, 82px) - env(safe-area-inset-bottom))',
                    md: 'calc(100dvh - 72px)',
                  }
                : { xs: '88dvh', sm: 'calc(100dvh - 72px)' },
              overflowY: 'auto',
              borderRadius: '22px 22px 0 0',
              bgcolor: '#fffaf7',
            },
          },
        }}
      >
        {selected && (
          <Box sx={{ width: '100%', px: { xs: 2.5, sm: 4 }, pt: 1.5, pb: 3.5 }}>
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
            <Stack
              direction="row"
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Typography
                sx={{
                  color: '#201914',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 21,
                  fontWeight: 700,
                }}
              >
                รายละเอียดโปรโมชั่น
              </Typography>
              <Button
                aria-label="ปิดรายละเอียดโปรโมชั่น"
                onClick={() => setSelected(null)}
                onMouseEnter={() => detailsCloseRef.current?.startAnimation()}
                onMouseLeave={() => detailsCloseRef.current?.stopAnimation()}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
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
                <XIcon ref={detailsCloseRef} size={20} />
              </Button>
            </Stack>
            <Divider
              sx={{
                mt: 2.25,
                mx: { xs: -2.5, sm: -4 },
                borderColor: '#e8ddd5',
              }}
            />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'minmax(0, 1fr) minmax(0, 2fr)',
                },
                gap: 2.5,
                mt: 2.5,
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  overflow: 'hidden',
                  border: '1.5px solid #e8ddd5',
                  borderRadius: '16px',
                  bgcolor: '#f7eee8',
                }}
              >
                <Box
                  component="img"
                  src={selected.menuItems[0].imageUrl ?? coffeeIngredientsImage}
                  alt={`รูป${selected.menuItems[0].name}`}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <Box sx={{ position: 'absolute', top: 12, left: 12 }}>
                  <StatusChip status={selected.status} />
                </Box>
                <Chip
                  label={selected.type}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    bgcolor: '#805637',
                    color: '#fff',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
              </Box>
              <Box>
                <Typography
                  sx={{
                    color: '#201914',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 24,
                    fontWeight: 700,
                    lineHeight: 1.25,
                  }}
                >
                  {selected.name}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.65,
                    color: '#805637',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {selected.benefit}
                </Typography>
                <Typography
                  sx={{
                    mt: 2,
                    color: '#5f4b3d',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  เมนูและสูตรวัตถุดิบที่ใช้ตัดสต๊อก
                </Typography>
                <Typography
                  sx={{
                    mt: 0.25,
                    color: '#7b7068',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 12,
                  }}
                >
                  โปรโมชั่นนี้อ้างอิงสูตรของเมนูเดิม จึงไม่มีการกำหนดวัตถุดิบซ้ำ
                </Typography>
                <Stack spacing={1} sx={{ mt: 1.25 }}>
                  {selected.menuItems.map((menu) => (
                    <Box
                      key={menu.id}
                      sx={{
                        p: 1.35,
                        border: '1px solid #e8ddd5',
                        borderRadius: '11px',
                        bgcolor: '#fff',
                      }}
                    >
                      <Typography
                        sx={{
                          color: '#2a211c',
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {menu.name}
                      </Typography>
                      <Typography
                        sx={{
                          color: '#7b7068',
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 12,
                        }}
                      >
                        {menu.category} · ราคาปกติ {menu.price}
                      </Typography>
                      <Divider sx={{ my: 0.9, borderColor: '#eee5df' }} />
                      {menu.ingredients.map((ingredient) => (
                        <Stack
                          key={ingredient.name}
                          direction="row"
                          sx={{
                            justifyContent: 'space-between',
                            gap: 1,
                            mb: 0.35,
                          }}
                        >
                          <Typography
                            sx={{
                              color: '#5f4b3d',
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 12,
                            }}
                          >
                            {ingredient.name}
                          </Typography>
                          <Typography
                            sx={{
                              color: '#7b7068',
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 12,
                            }}
                          >
                            {ingredient.quantity}
                          </Typography>
                        </Stack>
                      ))}
                    </Box>
                  ))}
                </Stack>
                <Box
                  sx={{
                    mt: 2,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 1.25,
                  }}
                >
                  {[
                    ['ช่วงเวลาแคมเปญ', selected.period],
                    ['สาขาที่เข้าร่วม', selected.branches],
                    ['ช่องทางที่ใช้ได้', selected.channels],
                    ['สิทธิ์การเข้าร่วม', selected.eligibility],
                  ].map(([label, value]) => (
                    <Box key={label}>
                      <Typography
                        sx={{
                          color: '#877a71',
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {label}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.2,
                          color: '#30261f',
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 13,
                        }}
                      >
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography
                    sx={{
                      color: '#877a71',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    เงื่อนไขการใช้สิทธิ์
                  </Typography>
                  <Box
                    component="ul"
                    sx={{ mt: 0.5, mb: 0, pl: 2.25, color: '#4f4640' }}
                  >
                    {selected.terms.map((term) => (
                      <li key={term}>
                        <Typography
                          component="span"
                          sx={{
                            fontFamily: 'Kanit, sans-serif',
                            fontSize: 13,
                            lineHeight: 1.6,
                          }}
                        >
                          {term}
                        </Typography>
                      </li>
                    ))}
                  </Box>
                </Box>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'flex-end', mt: 2.5 }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => setSelected(null)}
                    sx={{
                      minHeight: 40,
                      borderRadius: '10px',
                      borderColor: '#805637',
                      color: '#805637',
                      fontFamily: 'Kanit, sans-serif',
                      fontWeight: 700,
                      '&:hover': { borderColor: '#805637', bgcolor: '#f8f0eb' },
                    }}
                  >
                    ปิดรายละเอียด
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>
      <Drawer
        anchor="bottom"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        transitionDuration={{ enter: 360, exit: 280 }}
        slotProps={{
          paper: {
            sx: {
              left: { md: '280px' },
              width: { md: 'calc(100% - 304px)' },
              height: { xs: '88dvh', sm: 'calc(100dvh - 72px)' },
              overflowY: 'auto',
              borderRadius: '22px 22px 0 0',
              bgcolor: '#fffaf7',
            },
          },
        }}
      >
        <Box
          sx={{
            width: '100%',
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
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Box>
              <Typography
                sx={{
                  color: '#201914',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                เพิ่มโปรโมชั่น
              </Typography>
              <Typography
                sx={{
                  mt: 0.35,
                  color: 'text.secondary',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 13,
                }}
              >
                เลือกเมนูที่มีสูตรแล้ว
                ระบบจะใช้สูตรเดิมของเมนูนั้นตัดสต๊อกอัตโนมัติ
              </Typography>
            </Box>
            <Button
              aria-label="ปิด"
              onClick={() => setCreateOpen(false)}
              onMouseEnter={() => createCloseRef.current?.startAnimation()}
              onMouseLeave={() => createCloseRef.current?.stopAnimation()}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
              <XIcon ref={createCloseRef} size={20} />
            </Button>
          </Stack>
          <Divider
            sx={{
              mt: 2.25,
              mx: { xs: -2.5, sm: -4 },
              borderColor: '#e8ddd5',
            }}
          />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(0, 1fr) minmax(0, 2fr)',
              },
              gap: 2.5,
              mt: 2.5,
              '& .MuiOutlinedInput-root': { borderRadius: '12px' },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                aspectRatio: '1 / 1',
                overflow: 'hidden',
                border: '1.5px dashed #c9b6a9',
                borderRadius: '16px',
                bgcolor: '#f7eee8',
              }}
            >
              <Box
                component="img"
                src={selectedMenuDraft.imageUrl ?? coffeeIngredientsImage}
                alt={`รูป${selectedMenuDraft.name}`}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(32, 25, 20, .42)',
                  color: '#fff',
                  fontFamily: 'Kanit, sans-serif',
                  fontWeight: 600,
                }}
              >
                ใช้รูปจากเมนูที่เลือก
              </Box>
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
                label="ชื่อโปรโมชั่น"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                fullWidth
                sx={{ gridColumn: { sm: '1 / -1' } }}
              />
              <TextField
                select
                label="ประเภทโปรโมชั่น"
                value={draft.type}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    type: event.target.value as PromotionType,
                  }))
                }
                fullWidth
              >
                {(
                  ['ส่วนลด', 'ซื้อ 1 แถม 1', 'สิทธิพิเศษ'] as PromotionType[]
                ).map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="เมนูที่ร่วมโปรโมชั่น"
                value={draft.menuId}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    menuId: event.target.value,
                  }))
                }
                fullWidth
                sx={{ gridColumn: { sm: '1 / -1' } }}
              >
                {menuTemplates.map((menu) => (
                  <MenuItem key={menu.id} value={menu.id}>
                    {menu.name} · สูตร {menu.ingredients.length} รายการ
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="สิทธิพิเศษ / รายละเอียด"
                value={draft.benefit}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    benefit: event.target.value,
                  }))
                }
                fullWidth
              />
              <TextField
                label="สาขาที่เข้าร่วม"
                value={draft.branches}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    branches: event.target.value,
                  }))
                }
                fullWidth
              />
              <TextField
                label="ช่วงเวลาแคมเปญ"
                placeholder="เช่น 1 ธ.ค. 2569 – 31 ธ.ค. 2569"
                value={draft.period}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    period: event.target.value,
                  }))
                }
                fullWidth
              />
              <Box
                sx={{
                  gridColumn: { sm: '1 / -1' },
                  p: 1.5,
                  border: '1px solid #e8ddd5',
                  borderRadius: '12px',
                  bgcolor: '#fff',
                }}
              >
                <Typography
                  sx={{ fontFamily: 'Kanit, sans-serif', fontWeight: 700 }}
                >
                  สูตรที่ระบบจะใช้ตัดสต๊อก
                </Typography>
                <Typography
                  sx={{
                    mt: 0.3,
                    color: 'text.secondary',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 12,
                  }}
                >
                  {selectedMenuDraft.name} · {selectedMenuDraft.category}
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.75}
                  useFlexGap
                  sx={{ mt: 1, flexWrap: 'wrap' }}
                >
                  {selectedMenuDraft.ingredients.map((ingredient) => (
                    <Chip
                      key={ingredient.name}
                      label={`${ingredient.name} ${ingredient.quantity}`}
                      size="small"
                      sx={{
                        bgcolor: '#f7eee8',
                        color: '#5f4b3d',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 11,
                      }}
                    />
                  ))}
                </Stack>
              </Box>
              <Stack
                direction="row"
                spacing={1.25}
                sx={{
                  gridColumn: { sm: '1 / -1' },
                  justifyContent: 'flex-end',
                  pt: 0.5,
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => setCreateOpen(false)}
                  sx={{
                    borderColor: '#cfc2b8',
                    color: '#66574e',
                    borderRadius: '10px',
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="contained"
                  onClick={createPromotion}
                  disabled={
                    !draft.name.trim() ||
                    !draft.benefit.trim() ||
                    !draft.period.trim()
                  }
                  sx={{
                    bgcolor: '#3c2d24',
                    borderRadius: '10px',
                    boxShadow: 'none',
                    fontFamily: 'Kanit, sans-serif',
                    '&:hover': { bgcolor: '#201914', boxShadow: 'none' },
                  }}
                >
                  บันทึกโปรโมชั่น
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );

  return embedded ? content : <DashboardMain>{content}</DashboardMain>;
}
