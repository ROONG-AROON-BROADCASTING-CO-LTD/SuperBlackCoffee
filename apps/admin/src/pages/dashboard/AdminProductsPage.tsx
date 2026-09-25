import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Drawer,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  DashboardMain,
  DrawerActionBar,
  ItemActionButtons,
  PlusIcon,
  SearchField,
  selectionPillSx,
  XIcon,
  coffeeIngredientsImage,
  type PlusIconHandle,
  type XIconHandle,
} from '@stackbuild/ui';
import {
  ingredientBranches,
  type IngredientBranch,
} from '../../components/sidebar/IngredientBranchesSidebar';
import { AdminPageIntro } from '../../components/AdminPageIntro';
import { IngredientCardsSkeleton } from '../../components/skeletons/IngredientCardsSkeleton';

type ProductIngredient = { name: string; quantity: string };
type Product = {
  name: string;
  storePrice: number;
  lineManPrice: number;
  category: string;
  status: 'พร้อมขาย' | 'หมดชั่วคราว';
  position: string;
  ingredients: ProductIngredient[];
};
const products: Product[] = [
  {
    name: 'อเมริกาโน่เย็น',
    storePrice: 85,
    lineManPrice: 95,
    category: 'กาแฟ',
    status: 'พร้อมขาย',
    position: '12% 50%',
    ingredients: [
      { name: 'เมล็ดกาแฟ House Blend', quantity: '18 กรัม' },
      { name: 'น้ำแข็ง', quantity: '1 แก้ว' },
    ],
  },
  {
    name: 'ลาเต้เย็น',
    storePrice: 95,
    lineManPrice: 110,
    category: 'กาแฟ',
    status: 'พร้อมขาย',
    position: '34% 50%',
    ingredients: [
      { name: 'เมล็ดกาแฟ House Blend', quantity: '18 กรัม' },
      { name: 'นมสด', quantity: '180 มล.' },
      { name: 'น้ำแข็ง', quantity: '1 แก้ว' },
    ],
  },
  {
    name: 'มัทฉะลาเต้',
    storePrice: 110,
    lineManPrice: 125,
    category: 'ชาและมัทฉะ',
    status: 'พร้อมขาย',
    position: '55% 50%',
    ingredients: [
      { name: 'ผงมัทฉะ', quantity: '3 กรัม' },
      { name: 'นมสด', quantity: '180 มล.' },
      { name: 'น้ำแข็ง', quantity: '1 แก้ว' },
    ],
  },
  {
    name: 'ช็อกโกแลตเย็น',
    storePrice: 100,
    lineManPrice: 115,
    category: 'เครื่องดื่ม',
    status: 'พร้อมขาย',
    position: '76% 50%',
    ingredients: [
      { name: 'ผงโกโก้', quantity: '20 กรัม' },
      { name: 'นมสด', quantity: '180 มล.' },
    ],
  },
  {
    name: 'ครัวซองต์เนยสด',
    storePrice: 75,
    lineManPrice: 85,
    category: 'เบเกอรี่',
    status: 'หมดชั่วคราว',
    position: '38% 24%',
    ingredients: [{ name: 'ครัวซองต์เนยสด', quantity: '1 ชิ้น' }],
  },
  {
    name: 'เค้กช็อกโกแลต',
    storePrice: 120,
    lineManPrice: 135,
    category: 'เบเกอรี่',
    status: 'หมดชั่วคราว',
    position: '50% 85%',
    ingredients: [{ name: 'เค้กช็อกโกแลต', quantity: '1 ชิ้น' }],
  },
];
const filters = [
  'ทั้งหมด',
  'กาแฟ',
  'ชาและมัทฉะ',
  'เครื่องดื่ม',
  'เบเกอรี่',
] as const;
const availableIngredients = [
  'เมล็ดกาแฟ House Blend',
  'นมสด',
  'นมโอ๊ต',
  'ผงมัทฉะ',
  'ผงโกโก้',
  'ไซรัปวานิลลา',
  'ซอสคาราเมล',
  'น้ำแข็ง',
  'แก้วกระดาษ 16 oz',
];
type ProductFilter = (typeof filters)[number];

export function AdminProductsPage({
  activeBranch,
}: {
  activeBranch: IngredientBranch;
}) {
  const plusRef = useRef<PlusIconHandle>(null);
  const closeRef = useRef<XIconHandle>(null);
  const branchSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProductFilter>('ทั้งหมด');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [productIngredients, setProductIngredients] = useState<
    ProductIngredient[]
  >([{ name: '', quantity: '' }]);
  const [visibleBranches, setVisibleBranches] = useState<Set<string>>(
    () => new Set(),
  );
  const [loadedBranches, setLoadedBranches] = useState<Set<string>>(
    () => new Set(),
  );
  const matches = useMemo(
    () =>
      products.filter(
        (item) =>
          item.name.includes(query) &&
          (filter === 'ทั้งหมด' || item.category === filter),
      ),
    [filter, query],
  );
  const displayedBranches =
    activeBranch === 'ทุกสาขา' ? ingredientBranches.slice(1) : [activeBranch];
  const openAdd = () => {
    setEditing(null);
    setPreview(null);
    setProductIngredients([{ name: '', quantity: '' }]);
    setDrawerOpen(true);
  };
  const openEdit = (item: Product) => {
    setEditing(item);
    setPreview(null);
    setProductIngredients(item.ingredients);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (activeBranch !== 'ทุกสาขา') {
      setVisibleBranches(new Set([activeBranch]));
      setLoadedBranches(new Set([activeBranch]));
      return undefined;
    }
    setVisibleBranches(new Set());
    setLoadedBranches(new Set());
    const timers = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const branch = entry.target.getAttribute('data-branch');
          if (!branch) return;
          setVisibleBranches((current) =>
            current.has(branch) ? current : new Set(current).add(branch),
          );
          if (!timers.has(branch))
            timers.set(
              branch,
              window.setTimeout(
                () =>
                  setLoadedBranches((current) =>
                    current.has(branch)
                      ? current
                      : new Set(current).add(branch),
                  ),
                220,
              ),
            );
        }),
      { rootMargin: '0px' },
    );
    Object.values(branchSectionRefs.current).forEach(
      (section) => section && observer.observe(section),
    );
    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activeBranch]);

  return (
    <DashboardMain>
      <AdminPageIntro
        title="เมนูและสินค้า"
        description="จัดการเมนู ราคา และข้อมูลสินค้าของแต่ละสาขา"
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: { xs: 'stretch', lg: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 2,
        }}
      >
        <SearchField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ค้นหาเมนูและสินค้า"
          size="small"
          sx={{ width: { xs: '100%', lg: 310 } }}
        />
        <Button
          variant="contained"
          startIcon={<PlusIcon ref={plusRef} size={16} />}
          onClick={openAdd}
          onMouseEnter={() => plusRef.current?.startAnimation()}
          onMouseLeave={() => plusRef.current?.stopAnimation()}
          sx={{
            minHeight: 40,
            borderRadius: '12px',
            bgcolor: '#201914',
            fontFamily: 'Kanit, sans-serif',
            fontWeight: 500,
            boxShadow: 'none',
            '& .MuiButton-startIcon': { ml: 0.5, mr: 0.75 },
            '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
          }}
        >
          เพิ่มเมนูและสินค้า
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {filters.map((item) => (
          <Button
            key={item}
            onClick={() => setFilter(item)}
            size="small"
            variant={filter === item ? 'contained' : 'outlined'}
            sx={selectionPillSx(filter === item)}
          >
            {item}
          </Button>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gap: 4 }}>
        {displayedBranches.map((branch, index) => {
          const visible =
            activeBranch !== 'ทุกสาขา' || visibleBranches.has(branch);
          const loaded =
            activeBranch !== 'ทุกสาขา' || loadedBranches.has(branch);
          return (
            <Box
              key={branch}
              ref={(node: HTMLDivElement | null) => {
                branchSectionRefs.current[branch] = node;
              }}
              data-branch={branch}
              sx={
                index === 0
                  ? undefined
                  : {
                      position: 'relative',
                      pt: 4,
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-40px',
                        right: '-40px',
                        borderTop: '1px solid #e8ddd5',
                      },
                    }
              }
            >
              {activeBranch === 'ทุกสาขา' && (
                <Typography
                  sx={{
                    mb: 1.5,
                    color: '#3c2d24',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 19,
                    fontWeight: 600,
                  }}
                >
                  สาขา {branch}
                </Typography>
              )}
              {!visible ? (
                <Box sx={{ minHeight: 420 }} />
              ) : !loaded ? (
                <IngredientCardsSkeleton count={Math.min(matches.length, 4)} />
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(0, 1fr))',
                      md: 'repeat(4, minmax(0, 1fr))',
                    },
                    gap: '16px',
                  }}
                >
                  {matches.map((item) => {
                    const productKey = `${branch}-${item.name}`;
                    return (
                      <Card
                        key={productKey}
                        variant="outlined"
                        sx={{
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          borderRadius: '15px',
                          borderColor: '#e8ddd5',
                        }}
                      >
                        <Box sx={{ position: 'relative' }}>
                          <Box
                            component="img"
                            src={coffeeIngredientsImage}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                            sx={{
                              display: 'block',
                              width: '100%',
                              aspectRatio: { xs: '1 / 1', md: '4 / 3' },
                              objectFit: 'cover',
                              objectPosition: item.position,
                            }}
                          />
                          <Chip
                            label={item.status}
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              height: 25,
                              borderRadius: '12px',
                              bgcolor:
                                item.status === 'พร้อมขาย'
                                  ? '#177245'
                                  : '#805637',
                              color: '#fff',
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 11,
                            }}
                          />
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            p: 2.5,
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 18,
                              fontWeight: 500,
                            }}
                          >
                            {item.name}
                          </Typography>
                          <Typography
                            sx={{
                              mt: 0.6,
                              color: 'text.secondary',
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 13,
                            }}
                          >
                            {item.category}
                          </Typography>
                          <Box
                            sx={{
                              display: 'grid',
                              gap: 0.35,
                              mt: 0.8,
                            }}
                          >
                            <Typography
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: 1,
                                py: 0.45,
                                borderRadius: '8px',
                                color: '#805637',
                                fontFamily: 'Kanit, sans-serif',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              ราคาหน้าร้าน
                              <Box
                                component="span"
                                sx={{
                                  fontSize: 20,
                                  fontWeight: 700,
                                  lineHeight: 1,
                                }}
                              >
                                {item.storePrice} บาท
                              </Box>
                            </Typography>
                            <Typography
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: 1,
                                py: 0.45,
                                borderRadius: '8px',
                                color: '#06C755',
                                fontFamily: 'Kanit, sans-serif',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              ราคา LINE MAN
                              <Box
                                component="span"
                                sx={{
                                  fontSize: 20,
                                  fontWeight: 700,
                                  lineHeight: 1,
                                }}
                              >
                                {item.lineManPrice} บาท
                              </Box>
                            </Typography>
                          </Box>
                          <ItemActionButtons
                            editLabel="แก้ไขสินค้า"
                            deleteLabel="ลบสินค้า"
                            onEdit={() => openEdit(item)}
                            onDelete={() => setDeleting(productKey)}
                            sx={{ mt: 'auto', pt: 2 }}
                          />
                        </Box>
                        {deleting === productKey && (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              zIndex: 2,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 2,
                              p: 2.5,
                              bgcolor: 'rgba(32,25,20,.94)',
                              color: '#fff',
                              textAlign: 'center',
                            }}
                          >
                            <Typography
                              sx={{
                                fontFamily: 'Kanit, sans-serif',
                                fontSize: 18,
                                fontWeight: 600,
                              }}
                            >
                              ยืนยันการลบสินค้า?
                            </Typography>
                            <Typography
                              sx={{
                                color: 'rgba(255,255,255,.75)',
                                fontFamily: 'Kanit, sans-serif',
                                fontSize: 13,
                              }}
                            >
                              รายการนี้จะถูกลบออกจากเมนู
                            </Typography>
                            <Box
                              sx={{ display: 'flex', width: '100%', gap: 1 }}
                            >
                              <Button
                                fullWidth
                                onClick={() => setDeleting(null)}
                                sx={{
                                  minHeight: 38,
                                  borderRadius: '10px',
                                  color: '#fff',
                                  border: '1px solid rgba(255,255,255,.45)',
                                  fontFamily: 'Kanit, sans-serif',
                                }}
                              >
                                ยกเลิก
                              </Button>
                              <Button
                                fullWidth
                                variant="contained"
                                color="error"
                                onClick={() => setDeleting(null)}
                                sx={{
                                  minHeight: 38,
                                  borderRadius: '10px',
                                  fontFamily: 'Kanit, sans-serif',
                                  boxShadow: 'none',
                                }}
                              >
                                ยืนยันลบ
                              </Button>
                            </Box>
                          </Box>
                        )}
                      </Card>
                    );
                  })}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
      {matches.length === 0 && (
        <Typography
          sx={{
            pt: 4,
            textAlign: 'center',
            color: 'text.secondary',
            fontFamily: 'Kanit, sans-serif',
          }}
        >
          ไม่พบเมนูหรือสินค้าที่ค้นหา
        </Typography>
      )}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        transitionDuration={{ enter: 360, exit: 280 }}
        sx={{ zIndex: 1300 }}
        slotProps={{
          paper: {
            sx: {
              left: { md: '280px' },
              width: { md: 'calc(100% - 304px)' },
              height: { xs: '88dvh', sm: 'calc(100dvh - 72px)' },
              overflowY: 'auto',
              borderRadius: '16px 16px 0 0',
              bgcolor: '#fffaf7',
            },
          },
        }}
      >
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
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Kanit, sans-serif',
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {editing ? 'แก้ไขเมนูและสินค้า' : 'เพิ่มเมนูและสินค้า'}
            </Typography>
            <Button
              aria-label="ปิด"
              onClick={() => setDrawerOpen(false)}
              onMouseEnter={() => closeRef.current?.startAnimation()}
              onMouseLeave={() => closeRef.current?.stopAnimation()}
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
              <XIcon ref={closeRef} size={20} />
            </Button>
          </Box>
          <Typography
            sx={{
              mt: 0.5,
              color: 'text.secondary',
              fontFamily: 'Kanit, sans-serif',
            }}
          >
            {editing
              ? 'แก้ไขข้อมูลสินค้าในเมนู'
              : 'กรอกข้อมูลเพื่อเพิ่มสินค้าใหม่'}
          </Typography>
          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              setDrawerOpen(false);
            }}
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(0, 1fr) minmax(0, 2fr)',
              },
              gap: 2.5,
              mt: 3,
              '& .MuiOutlinedInput-root': { borderRadius: '12px' },
            }}
          >
            <Box
              component="label"
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                aspectRatio: '1 / 1',
                overflow: 'hidden',
                border: '1.5px dashed #c9b6a9',
                borderRadius: '16px',
                bgcolor: '#f7eee8',
                cursor: 'pointer',
              }}
            >
              {preview || editing ? (
                <Box
                  component="img"
                  src={preview ?? coffeeIngredientsImage}
                  alt="ตัวอย่างรูปสินค้า"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Typography sx={{ fontFamily: 'Kanit, sans-serif' }}>
                  + เพิ่มรูปสินค้า
                </Typography>
              )}
              {editing && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'rgba(32, 25, 20, .42)',
                    color: '#fff',
                    fontFamily: 'Kanit, sans-serif',
                  }}
                >
                  เปลี่ยนรูปสินค้า
                </Box>
              )}
              <input
                hidden
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setPreview(URL.createObjectURL(file));
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
                required
                fullWidth
                label="ชื่อสินค้า"
                defaultValue={editing?.name}
                sx={{ gridColumn: { sm: '1 / -1' } }}
              />
              <TextField
                required
                select
                fullWidth
                label="หมวดหมู่"
                defaultValue="coffee"
              >
                <MenuItem value="coffee">กาแฟ</MenuItem>
                <MenuItem value="tea">ชาและมัทฉะ</MenuItem>
                <MenuItem value="bakery">เบเกอรี่</MenuItem>
              </TextField>
              <TextField
                required
                fullWidth
                label="ราคาหน้าร้าน"
                type="number"
                defaultValue={editing?.storePrice}
              />
              <TextField
                required
                fullWidth
                label="ราคา LINE MAN"
                type="number"
                defaultValue={editing?.lineManPrice}
              />
              <TextField
                required
                select
                fullWidth
                label="สถานะ"
                defaultValue="available"
              >
                <MenuItem value="available">พร้อมขาย</MenuItem>
                <MenuItem value="soldout">หมดชั่วคราว</MenuItem>
              </TextField>
              <Box
                sx={{
                  gridColumn: { sm: '1 / -1' },
                  p: 2,
                  border: '1px solid #e8ddd5',
                  borderRadius: '12px',
                  bgcolor: '#fff',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        color: '#3c2d24',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 15,
                        fontWeight: 600,
                      }}
                    >
                      วัตถุดิบและส่วนผสม
                    </Typography>
                    <Typography
                      sx={{
                        color: 'text.secondary',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 11,
                      }}
                    >
                      ระบุวัตถุดิบที่ใช้ต่อ 1 เมนู
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    onClick={() =>
                      setProductIngredients((items) => [
                        ...items,
                        { name: '', quantity: '' },
                      ])
                    }
                    sx={{
                      minHeight: 34,
                      borderRadius: '10px',
                      color: '#805637',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    + เพิ่มส่วนผสม
                  </Button>
                </Box>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  {productIngredients.map((ingredient, index) => (
                    <Box
                      key={`${ingredient.name}-${index}`}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns:
                          'minmax(0, 1fr) minmax(110px, .55fr) 40px',
                        gap: 2,
                        alignItems: 'center',
                      }}
                    >
                      <TextField
                        select
                        value={ingredient.name}
                        onChange={(event) =>
                          setProductIngredients((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, name: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="เลือกวัตถุดิบ"
                        slotProps={{ select: { displayEmpty: true } }}
                      >
                        <MenuItem value="" disabled>
                          เลือกวัตถุดิบ
                        </MenuItem>
                        {availableIngredients.map((name) => (
                          <MenuItem key={name} value={name}>
                            {name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        value={ingredient.quantity}
                        onChange={(event) =>
                          setProductIngredients((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, quantity: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="ปริมาณ"
                      />
                      <Button
                        aria-label="ลบส่วนผสม"
                        disabled={productIngredients.length === 1}
                        onClick={() =>
                          setProductIngredients((items) =>
                            items.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        sx={{
                          minWidth: 40,
                          width: 40,
                          height: 40,
                          p: 0,
                          borderRadius: '10px',
                          bgcolor: '#fff0ee',
                          color: '#b42318',
                          '&:hover': { bgcolor: '#fbded9' },
                        }}
                      >
                        <XIcon size={18} />
                      </Button>
                    </Box>
                  ))}
                </Box>
              </Box>
              <DrawerActionBar
                sx={{
                  gridColumn: { sm: '1 / -1' },
                }}
              >
                <Button
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    minHeight: 40,
                    borderRadius: '12px',
                    color: '#5f4b3d',
                    fontFamily: 'Kanit, sans-serif',
                  }}
                >
                  {editing ? 'ยกเลิกแก้ไข' : 'ยกเลิกเพิ่ม'}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    minHeight: 40,
                    borderRadius: '12px',
                    bgcolor: '#201914',
                    fontFamily: 'Kanit, sans-serif',
                  }}
                >
                  {editing ? 'บันทึกการแก้ไข' : 'บันทึกสินค้า'}
                </Button>
              </DrawerActionBar>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </DashboardMain>
  );
}
