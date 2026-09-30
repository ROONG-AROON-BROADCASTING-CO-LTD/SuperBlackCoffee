import { useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  DateField,
  DashboardMain,
  DrawerActionBar,
  DashboardFormDrawer,
  DashboardDrawerHandle,
  DashboardDrawerHeader,
  FilterPill,
  PlusIcon,
  XIcon,
  type XIconHandle,
} from '@stackbuild/ui';
import { imagePlaceholderImage } from '../assets/index';

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
  imageUrl?: string;
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

export type ExpiryPromotionSuggestion = {
  menuId: number;
  menuName: string;
  category: string;
  storePrice: number;
  lotId: number;
  inventoryItemId: number;
  ingredientName: string;
  lotNumber: string;
  expiryDate: string;
  quantityRemaining: number;
  unit: string;
  daysUntilExpiry: number;
  suggestedDiscountPercent: number;
  reason: string;
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
  startDate: '',
  endDate: '',
  imageUrl: '',
  menuId: menuTemplates[0].id,
};

/** The Stock app's full-height sheet, kept above its persistent mobile nav. */
const stockCartDrawerPaperSx = {
  maxWidth: { xs: 720, md: 'none' },
  mx: { xs: 'auto', md: 0 },
  left: { md: '280px' },
  width: { xs: '100%', md: 'calc(100% - 304px)' },
  bottom: {
    xs: 'calc(var(--stock-mobile-nav-height, 82px) + env(safe-area-inset-bottom))',
    md: 0,
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
  overflowY: 'auto',
  borderRadius: { xs: 0, md: '22px 22px 0 0' },
  p: 0,
  // The Stock navigation hides while the mobile keyboard is open. Reclaim its
  // reserved space for every form control so a gap never remains above the keyboard.
  '@media (max-width: 599.95px)': {
    '&:has(input:focus), &:has(textarea:focus)': {
      bottom: 0,
      height: '100dvh',
      maxHeight: '100dvh',
    },
  },
};

const formatExpiryDate = (date: string) =>
  new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));

const formatCampaignPeriod = (startDate: string, endDate: string) =>
  startDate && endDate
    ? `${formatExpiryDate(startDate)} – ${formatExpiryDate(endDate)}`
    : '';

const todayDateInputValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  mode: 'admin' | 'franchise' | 'stock';
  onSelect: (promotion: Promotion) => void;
  compact?: boolean;
}) {
  const leadMenu = promotion.menuItems[0];
  const ingredients = leadMenu.ingredients;
  const leadImageUrl = promotion.imageUrl?.trim() || leadMenu.imageUrl?.trim();
  const hasLeadMenuImage = Boolean(leadImageUrl);
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
          src={leadImageUrl || imagePlaceholderImage}
          alt={`รูป${leadMenu.name}`}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: hasLeadMenuImage ? 'cover' : 'contain',
            p: hasLeadMenuImage ? 0 : '27%',
            boxSizing: 'border-box',
            bgcolor: '#f5eee8',
          }}
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
  expiryPromotionSuggestions = [],
  embedded = false,
}: {
  mode: 'admin' | 'franchise' | 'stock';
  branchName?: string;
  /** Suggestions calculated from fresh inventory lots that are nearing expiry. */
  expiryPromotionSuggestions?: ExpiryPromotionSuggestion[];
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
  const canCreate = mode === 'admin' || mode === 'stock';
  const promotionMenus = useMemo<PromotionMenu[]>(
    () => [
      ...menuTemplates,
      ...expiryPromotionSuggestions.map((suggestion) => ({
        id: `expiry-${suggestion.menuId}-${suggestion.lotId || suggestion.inventoryItemId}`,
        name: suggestion.menuName,
        category: suggestion.category,
        price: `${suggestion.storePrice.toLocaleString('th-TH')} บาท`,
        ingredients: [
          {
            name: suggestion.ingredientName,
            quantity: `${suggestion.quantityRemaining.toLocaleString('th-TH')} ${suggestion.unit}`,
          },
        ],
      })),
    ],
    [expiryPromotionSuggestions],
  );
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
    const menuItem = promotionMenus.find((menu) => menu.id === draft.menuId);
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
      imageUrl: draft.imageUrl.trim() || undefined,
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
  const createFromExpirySuggestion = (
    suggestion: ExpiryPromotionSuggestion,
  ) => {
    const startDate = todayDateInputValue();
    setDraft({
      name: `${suggestion.menuName} ลด ${suggestion.suggestedDiscountPercent}%`,
      type: 'ส่วนลด',
      benefit: `ลด ${suggestion.suggestedDiscountPercent}% เพื่อใช้ ${suggestion.ingredientName} ล็อตใกล้หมดอายุ`,
      branches: `สาขา${branchName}`,
      startDate,
      endDate: suggestion.expiryDate,
      period: formatCampaignPeriod(startDate, suggestion.expiryDate),
      imageUrl: '',
      menuId: `expiry-${suggestion.menuId}-${suggestion.lotId || suggestion.inventoryItemId}`,
    });
    setCreateOpen(true);
  };
  const filters: Array<['all' | PromotionStatus, string, number]> = [
    ['all', 'ทั้งหมด', promotions.length],
    ['active', 'กำลังใช้งาน', counts.active],
    ['upcoming', 'กำลังจะเริ่ม', counts.upcoming],
    ['expired', 'สิ้นสุดแล้ว', counts.expired],
  ];
  const selectedMenuDraft =
    promotionMenus.find((menu) => menu.id === draft.menuId) ??
    promotionMenus[0];
  const draftPromotionImageUrl =
    draft.imageUrl.trim() || selectedMenuDraft.imageUrl?.trim() || '';

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
                : mode === 'stock'
                  ? 'ดูคำแนะนำจากวัตถุดิบใกล้หมดอายุ แล้วตรวจสอบก่อนสร้างโปรโมชั่น'
                  : 'เลือกดูรายการโปรโมชั่นและเมนูที่ร่วมรายการของสาขาคุณ'}
            </Typography>
          </Box>
        </Stack>
        {mode === 'stock' && expiryPromotionSuggestions.length > 0 && (
          <Card
            component="section"
            aria-label="คำแนะนำโปรโมชั่นจากวันหมดอายุ"
            sx={{
              mb: 2.5,
              p: { xs: 1.5, sm: 2 },
              border: '1px solid #f0d7bd',
              borderRadius: '16px',
              bgcolor: '#fffaf5',
              boxShadow: 'none',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{ justifyContent: 'space-between', gap: 0.6, mb: 1.25 }}
            >
              <Box>
                <Typography
                  sx={{
                    color: '#5f3520',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  แนะนำโปรโมชันเพื่อลดของเสีย
                </Typography>
                <Typography
                  sx={{
                    color: '#7b7068',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 12,
                  }}
                >
                  เลือกหนึ่งรายการ ระบบจะกรอกข้อมูลร่างให้ แล้วตรวจสอบก่อนบันทึก
                </Typography>
              </Box>
              <Chip
                label={`${expiryPromotionSuggestions.length} รายการ`}
                size="small"
                sx={{
                  alignSelf: { xs: 'flex-start', sm: 'center' },
                  bgcolor: '#f7e7d3',
                  color: '#8a4d1d',
                  fontFamily: 'Kanit, sans-serif',
                  fontWeight: 700,
                }}
              />
            </Stack>
            <Stack spacing={1}>
              {expiryPromotionSuggestions.slice(0, 6).map((suggestion) => (
                <Box
                  key={`${suggestion.menuId}-${suggestion.lotId || suggestion.inventoryItemId}`}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'minmax(0, 1fr) auto',
                    },
                    gap: 1,
                    alignItems: 'center',
                    p: 1.25,
                    border: '1px solid #f0e1d5',
                    borderRadius: '12px',
                    bgcolor: '#fff',
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        color: '#3c2d24',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {suggestion.menuName}
                    </Typography>
                    <Typography
                      sx={{
                        color: '#7b7068',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 12,
                      }}
                    >
                      {suggestion.ingredientName} · เหลือ{' '}
                      {suggestion.quantityRemaining.toLocaleString('th-TH')}{' '}
                      {suggestion.unit} · หมดอายุ{' '}
                      {formatExpiryDate(suggestion.expiryDate)}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.2,
                        color: '#a9551b',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      เหลือ {suggestion.daysUntilExpiry} วัน · แนะนำลด{' '}
                      {suggestion.suggestedDiscountPercent}%
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    onClick={() => createFromExpirySuggestion(suggestion)}
                    sx={{
                      minHeight: 38,
                      px: 1.5,
                      borderColor: '#b77948',
                      color: '#6c3e22',
                      borderRadius: '10px',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      '&:hover': {
                        borderColor: '#805637',
                        bgcolor: '#fff6ee',
                      },
                    }}
                  >
                    สร้างโปรโมชั่น
                  </Button>
                </Box>
              ))}
            </Stack>
          </Card>
        )}
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
            slotProps={{
              htmlInput: { 'aria-label': 'ค้นหาเมนูหรือโปรโมชั่น' },
            }}
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
                borderRadius: '16px',
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
                    lg: 'repeat(5, minmax(0, 1fr))',
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
      <DashboardFormDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        paperSx={embedded ? stockCartDrawerPaperSx : { overflowY: 'auto' }}
      >
        {selected && (
          <Box sx={{ width: '100%', px: { xs: 2.5, sm: 4 }, pt: 1.5, pb: 3.5 }}>
            <DashboardDrawerHandle
              sx={{ display: { xs: 'none', md: 'block' } }}
            />
            <DashboardDrawerHeader
              title="รายละเอียดโปรโมชั่น"
              closeLabel="ปิดรายละเอียดโปรโมชั่น"
              onClose={() => setSelected(null)}
              onCloseMouseEnter={() =>
                detailsCloseRef.current?.startAnimation()
              }
              onCloseMouseLeave={() => detailsCloseRef.current?.stopAnimation()}
              closeIcon={<XIcon ref={detailsCloseRef} size={20} />}
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
                  src={
                    selected.imageUrl?.trim() ||
                    selected.menuItems[0].imageUrl?.trim() ||
                    imagePlaceholderImage
                  }
                  alt={`รูป${selected.menuItems[0].name}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit:
                      selected.imageUrl?.trim() ||
                      selected.menuItems[0].imageUrl?.trim()
                        ? 'cover'
                        : 'contain',
                    p:
                      selected.imageUrl?.trim() ||
                      selected.menuItems[0].imageUrl?.trim()
                        ? 0
                        : '27%',
                    boxSizing: 'border-box',
                    bgcolor: '#f5eee8',
                  }}
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
                      px: 2.5,
                      borderRadius: '12px',
                      borderColor: '#d8c8bd',
                      color: '#5f4b3d',
                      fontFamily: 'Kanit, sans-serif',
                      fontWeight: 700,
                      bgcolor: '#fffaf7',
                      '&:hover': { borderColor: '#cbb8aa', bgcolor: '#f7eee8' },
                    }}
                  >
                    ปิดรายละเอียด
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Box>
        )}
      </DashboardFormDrawer>
      <DashboardFormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        paperSx={embedded ? stockCartDrawerPaperSx : { overflowY: 'auto' }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            '@media (max-width: 599.95px)': {
              '&:has(.MuiInputBase-root.Mui-focused) [data-promotion-actions]':
                {
                  display: 'none',
                },
            },
          }}
        >
          <Box sx={{ px: { xs: 2.5, sm: 4 }, pt: 1.5, flexShrink: 0 }}>
            <DashboardDrawerHandle
              sx={{ display: { xs: 'none', md: 'block' } }}
            />
            <DashboardDrawerHeader
              title={
                draft.menuId.startsWith('expiry-')
                  ? 'สร้างโปรโมชั่นจากวัตถุดิบใกล้หมดอายุ'
                  : 'เพิ่มโปรโมชั่น'
              }
              description={
                draft.menuId.startsWith('expiry-')
                  ? 'ตรวจสอบส่วนลด ระยะเวลา และสาขาก่อนบันทึกโปรโมชั่น'
                  : 'เลือกเมนูที่มีสูตรแล้ว ระบบจะใช้สูตรเดิมของเมนูนั้นตัดสต๊อกอัตโนมัติ'
              }
              onClose={() => setCreateOpen(false)}
              onCloseMouseEnter={() => createCloseRef.current?.startAnimation()}
              onCloseMouseLeave={() => createCloseRef.current?.stopAnimation()}
              closeIcon={<XIcon ref={createCloseRef} size={20} />}
            />
          </Box>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              px: { xs: 2.5, sm: 4 },
              pb: 2.5,
            }}
          >
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
                component="label"
                sx={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  overflow: 'hidden',
                  border: '1.5px dashed #c9b6a9',
                  borderRadius: '16px',
                  bgcolor: '#f7eee8',
                  cursor: 'pointer',
                }}
              >
                <Box
                  component="img"
                  src={draftPromotionImageUrl || imagePlaceholderImage}
                  alt={`รูป${selectedMenuDraft.name}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: draftPromotionImageUrl ? 'cover' : 'contain',
                    p: draftPromotionImageUrl ? 0 : '27%',
                    boxSizing: 'border-box',
                    bgcolor: '#f5eee8',
                  }}
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
                    textAlign: 'center',
                    px: 2,
                  }}
                >
                  {draft.imageUrl
                    ? 'แตะเพื่อเปลี่ยนรูปโปรโมชั่น'
                    : 'ใช้รูปเมนูอยู่ • แตะเพื่อเพิ่มรูปโปรโมชั่น'}
                </Box>
                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="อัปโหลดรูปโปรโมชั่น"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setDraft((current) => ({
                      ...current,
                      imageUrl: URL.createObjectURL(file),
                    }));
                    event.target.value = '';
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
                  {promotionMenus.map((menu) => (
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
                <Box
                  sx={{
                    gridColumn: { sm: '1 / -1' },
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 1.25,
                  }}
                >
                  <DateField
                    label="เริ่มแคมเปญ"
                    value={draft.startDate}
                    onChange={(event) =>
                      setDraft((current) => {
                        const startDate = event.target.value;
                        const endDate =
                          current.endDate && current.endDate < startDate
                            ? ''
                            : current.endDate;
                        return {
                          ...current,
                          startDate,
                          endDate,
                          period: formatCampaignPeriod(startDate, endDate),
                        };
                      })
                    }
                  />
                  <DateField
                    label="สิ้นสุดแคมเปญ"
                    value={draft.endDate}
                    min={draft.startDate || undefined}
                    disabled={!draft.startDate}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        endDate: event.target.value,
                        period: formatCampaignPeriod(
                          current.startDate,
                          event.target.value,
                        ),
                      }))
                    }
                  />
                </Box>
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
              </Box>
            </Box>
          </Box>
          <Box data-promotion-actions sx={{ flexShrink: 0 }}>
            <DrawerActionBar
              sx={{
                position: { xs: 'static', sm: 'absolute' },
                width: { xs: '100%', sm: 'fit-content' },
                right: { sm: 32 },
                bottom: { sm: 0 },
                mt: 0,
                borderRadius: { xs: 0, sm: '14px 14px 0 0' },
                gap: 1.5,
                px: { xs: 2, sm: 3 },
                py: 1.5,
                flexDirection: 'row',
                '& > button': {
                  flex: { xs: '1 1 0', sm: '0 0 auto' },
                  width: { xs: 'auto', sm: 128 },
                  height: 64,
                  minHeight: 64,
                  minWidth: { xs: 0, sm: 128 },
                },
              }}
            >
              <Button
                variant="outlined"
                onClick={() => setCreateOpen(false)}
                sx={{
                  minHeight: 64,
                  px: 2,
                  borderColor: '#d8c8bd',
                  color: '#5f4b3d',
                  borderRadius: '16px',
                  bgcolor: '#fffaf7',
                  fontSize: 18,
                  fontWeight: 600,
                  '&:hover': { borderColor: '#cbb8aa', bgcolor: '#f7eee8' },
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
                  minHeight: 64,
                  px: 2,
                  color: '#fff',
                  bgcolor: '#3c2d24',
                  borderRadius: '16px',
                  boxShadow: 'none',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 18,
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#201914', boxShadow: 'none' },
                  '&.Mui-disabled': { bgcolor: '#eadfd7', color: '#8b7567' },
                }}
              >
                บันทึกโปรโมชั่น
              </Button>
            </DrawerActionBar>
          </Box>
        </Box>
      </DashboardFormDrawer>
    </>
  );

  return embedded ? content : <DashboardMain>{content}</DashboardMain>;
}
