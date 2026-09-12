import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Drawer,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  DashboardMain,
  coffeeIngredientsImage,
  INGREDIENT_STATUS_BADGES,
  PlusIcon,
  SearchIcon,
  XIcon,
  type IngredientStatus,
  type PlusIconHandle,
  type SearchIconHandle,
  type XIconHandle,
} from '@stackbuild/ui';
import {
  ingredientBranches,
  type IngredientBranch,
} from '../../components/sidebar/IngredientBranchesSidebar';
import { IngredientCardsSkeleton } from '../../components/skeletons/IngredientCardsSkeleton';

type Ingredient = {
  name: string;
  amount: string;
  status: IngredientStatus;
  imagePosition: string;
};

const ingredients: Ingredient[] = [
  {
    name: 'เมล็ดกาแฟ House Blend',
    amount: 'คงเหลือ 18 กก.',
    status: 'พร้อมใช้',
    imagePosition: '12% 50%',
  },
  {
    name: 'นมสด',
    amount: 'คงเหลือ 24 ลิตร',
    status: 'พร้อมใช้',
    imagePosition: '34% 50%',
  },
  {
    name: 'นมโอ๊ต',
    amount: 'คงเหลือ 6 ลิตร',
    status: 'วัตถุดิบใกล้หมด',
    imagePosition: '55% 50%',
  },
  {
    name: 'ไซรัปวานิลลา',
    amount: 'คงเหลือ 8 ขวด',
    status: 'พร้อมใช้',
    imagePosition: '76% 50%',
  },
  {
    name: 'ผงมัทฉะ',
    amount: 'คงเหลือ 0 กก.',
    status: 'วัตถุดิบหมด',
    imagePosition: '38% 24%',
  },
  {
    name: 'แก้วกระดาษ 16 oz',
    amount: 'คงเหลือ 320 ใบ',
    status: 'พร้อมใช้',
    imagePosition: '85% 60%',
  },
  {
    name: 'ซอสคาราเมล',
    amount: 'คงเหลือ 14 ขวด',
    status: 'วัตถุดิบค้างสต๊อก',
    imagePosition: '68% 76%',
  },
  {
    name: 'ผงโกโก้',
    amount: 'คงเหลือ 3 กก.',
    status: 'วัตถุดิบใกล้หมด',
    imagePosition: '50% 85%',
  },
];

const filters = [
  'ทั้งหมด',
  'วัตถุดิบใกล้หมด',
  'วัตถุดิบหมด',
  'วัตถุดิบค้างสต๊อก',
] as const;
type IngredientFilter = (typeof filters)[number];

export function AdminIngredientsPage({
  activeBranch,
}: {
  activeBranch: IngredientBranch;
}) {
  const plusIconRef = useRef<PlusIconHandle>(null);
  const searchIconRef = useRef<SearchIconHandle>(null);
  const closeIconRef = useRef<XIconHandle>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<IngredientFilter>('ทั้งหมด');
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null,
  );
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [deleteTargetKey, setDeleteTargetKey] = useState<string | null>(null);
  const [visibleBranchNames, setVisibleBranchNames] = useState<Set<string>>(
    () => new Set(),
  );
  const [loadedBranchNames, setLoadedBranchNames] = useState<Set<string>>(
    () => new Set(),
  );
  const branchSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const filteredIngredients = useMemo(
    () =>
      ingredients.filter((ingredient) => {
        const matchesQuery = ingredient.name
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        const matchesFilter =
          filter === 'ทั้งหมด' || ingredient.status === filter;
        return matchesQuery && matchesFilter;
      }),
    [filter, query],
  );
  useEffect(
    () => () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    },
    [imagePreviewUrl],
  );
  useEffect(() => {
    if (activeBranch !== 'ทุกสาขา') {
      setVisibleBranchNames(new Set([activeBranch]));
      setLoadedBranchNames(new Set([activeBranch]));
      return undefined;
    }
    setVisibleBranchNames(new Set());
    setLoadedBranchNames(new Set());
    const timers = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const branch = entry.target.getAttribute('data-branch');
          if (!branch) return;
          setVisibleBranchNames((names) =>
            names.has(branch) ? names : new Set(names).add(branch),
          );
          if (!timers.has(branch))
            timers.set(
              branch,
              window.setTimeout(
                () =>
                  setLoadedBranchNames((names) =>
                    names.has(branch) ? names : new Set(names).add(branch),
                  ),
                branch === ingredientBranches[1] ? 360 : 220,
              ),
            );
        });
      },
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
  const displayedBranches =
    activeBranch === 'ทุกสาขา' ? ingredientBranches.slice(1) : [activeBranch];
  const drawerTitle = editingIngredient ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบ';
  const imageSource =
    imagePreviewUrl ?? (editingIngredient ? coffeeIngredientsImage : null);

  return (
    <DashboardMain>
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
        <TextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => searchIconRef.current?.startAnimation()}
          onBlur={() => searchIconRef.current?.stopAnimation()}
          placeholder="ค้นหาวัตถุดิบ"
          size="small"
          name="ingredient-search"
          autoComplete="off"
          sx={{
            width: { xs: '100%', lg: 310 },
            '& .MuiOutlinedInput-root': { borderRadius: '12px' },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment
                  position="start"
                  sx={{
                    alignSelf: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    height: 18,
                  }}
                >
                  <SearchIcon ref={searchIconRef} size={18} />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          variant="contained"
          startIcon={<PlusIcon ref={plusIconRef} size={16} />}
          onClick={() => {
            setEditingIngredient(null);
            setImagePreviewUrl(null);
            setIsAddDrawerOpen(true);
          }}
          onMouseEnter={() => plusIconRef.current?.startAnimation()}
          onMouseLeave={() => plusIconRef.current?.stopAnimation()}
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
          เพิ่มวัตถุดิบ
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {filters.map((item) => (
          <Button
            key={item}
            size="small"
            variant={filter === item ? 'contained' : 'outlined'}
            onClick={() => setFilter(item)}
            sx={{
              minHeight: 34,
              borderRadius: '12px',
              borderColor: '#d8c8bd',
              bgcolor: filter === item ? '#201914' : '#fff',
              color: filter === item ? '#fff' : '#5f4b3d',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 12,
              fontWeight: 500,
              boxShadow: 'none',
              '&:hover': {
                borderColor: '#201914',
                bgcolor: filter === item ? '#3c2d24' : '#f5eee9',
                boxShadow: 'none',
              },
            }}
          >
            {item}
          </Button>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gap: 4 }}>
        {displayedBranches.map((branch, index) => {
          const isBranchVisible =
            activeBranch !== 'ทุกสาขา' || visibleBranchNames.has(branch);
          const isBranchLoaded =
            activeBranch !== 'ทุกสาขา' || loadedBranchNames.has(branch);
          return (
            <Box
              key={branch}
              ref={(section: HTMLDivElement | null) => {
                branchSectionRefs.current[branch] = section;
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
              {!isBranchVisible ? (
                <Box sx={{ minHeight: 420 }} />
              ) : !isBranchLoaded ? (
                <IngredientCardsSkeleton
                  count={Math.min(filteredIngredients.length, 4)}
                />
              ) : (
                <>
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
                    {filteredIngredients.map((ingredient, ingredientIndex) => {
                      const statusBadge =
                        INGREDIENT_STATUS_BADGES[ingredient.status];
                      const ingredientKey = `${branch}-${ingredient.name}`;
                      return (
                        <Card
                          key={ingredientKey}
                          variant="outlined"
                          sx={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            borderRadius: '15px',
                            borderColor: '#e8ddd5',
                            contentVisibility: {
                              xs: 'visible',
                              xl: ingredientIndex >= 5 ? 'auto' : 'visible',
                            },
                            containIntrinsicSize: {
                              xl: ingredientIndex >= 5 ? 'auto 430px' : 'auto',
                            },
                          }}
                        >
                          <Box sx={{ position: 'relative' }}>
                            <Box
                              component="img"
                              src={coffeeIngredientsImage}
                              alt={ingredient.name}
                              loading="lazy"
                              decoding="async"
                              sx={{
                                display: 'block',
                                width: '100%',
                                aspectRatio: { xs: '1 / 1', md: '4 / 3' },
                                objectFit: 'cover',
                                objectPosition: ingredient.imagePosition,
                              }}
                            />
                            <Chip
                              label={ingredient.status}
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                height: 25,
                                borderRadius: '12px',
                                bgcolor: statusBadge.main,
                                color: statusBadge.contrastText,
                                fontFamily: 'Kanit, sans-serif',
                                fontSize: 11,
                                fontWeight: 500,
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
                              {ingredient.name}
                            </Typography>
                            <Typography
                              sx={{
                                mt: 0.6,
                                color: 'text.secondary',
                                fontFamily: 'Kanit, sans-serif',
                                fontSize: 13,
                              }}
                            >
                              {ingredient.amount}
                            </Typography>
                            <Box
                              sx={{
                                display: 'flex',
                                gap: 1,
                                mt: 'auto',
                                pt: 2,
                              }}
                            >
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => {
                                  setEditingIngredient(ingredient);
                                  setImagePreviewUrl(null);
                                  setIsAddDrawerOpen(true);
                                }}
                                sx={{
                                  flex: 1,
                                  minHeight: 34,
                                  borderRadius: '10px',
                                  bgcolor: '#5f4030',
                                  color: '#fff',
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  boxShadow: 'none',
                                  '&:hover': {
                                    bgcolor: '#3c2d24',
                                    boxShadow: 'none',
                                  },
                                }}
                              >
                                แก้ไขวัตถุดิบ
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                onClick={() =>
                                  setDeleteTargetKey(ingredientKey)
                                }
                                sx={{
                                  flex: 1,
                                  minHeight: 34,
                                  borderRadius: '10px',
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  boxShadow: 'none',
                                  '&:hover': { boxShadow: 'none' },
                                }}
                              >
                                ลบวัตถุดิบ
                              </Button>
                            </Box>
                          </Box>
                          {deleteTargetKey === ingredientKey && (
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
                                bgcolor: 'rgba(32, 25, 20, .94)',
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
                                ยืนยันการลบวัตถุดิบ?
                              </Typography>
                              <Typography
                                sx={{
                                  color: 'rgba(255,255,255,.75)',
                                  fontFamily: 'Kanit, sans-serif',
                                  fontSize: 13,
                                }}
                              >
                                รายการนี้จะถูกลบออกจากสต๊อก
                              </Typography>
                              <Box
                                sx={{ display: 'flex', width: '100%', gap: 1 }}
                              >
                                <Button
                                  fullWidth
                                  onClick={() => setDeleteTargetKey(null)}
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
                                  onClick={() => setDeleteTargetKey(null)}
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
                </>
              )}
            </Box>
          );
        })}
      </Box>
      {filteredIngredients.length === 0 && (
        <Typography
          sx={{
            pt: 4,
            textAlign: 'center',
            color: 'text.secondary',
            fontFamily: 'Kanit, sans-serif',
          }}
        >
          ไม่พบวัตถุดิบที่ค้นหา
        </Typography>
      )}
      <Drawer
        anchor="bottom"
        open={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        transitionDuration={{ enter: 360, exit: 280 }}
        sx={{ zIndex: 1300 }}
        slotProps={{
          paper: {
            sx: {
              left: { md: '280px' },
              width: { md: 'calc(100% - 304px)' },
              height: { xs: '88dvh', sm: 'calc(100dvh - 72px)' },
              overflowY: 'auto',
              borderRadius: '24px 24px 0 0',
              bgcolor: '#fffaf7',
              boxShadow: '0 -12px 32px rgba(50, 35, 25, .18)',
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
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Typography
              sx={{
                color: '#201914',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {drawerTitle}
            </Typography>
            <Button
              aria-label="ปิด"
              onClick={() => setIsAddDrawerOpen(false)}
              onMouseEnter={() => closeIconRef.current?.startAnimation()}
              onMouseLeave={() => closeIconRef.current?.stopAnimation()}
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
              <XIcon
                ref={closeIconRef}
                size={20}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 0,
                }}
              />
            </Button>
          </Box>
          <Typography
            sx={{
              mt: 0.5,
              color: 'text.secondary',
              fontFamily: 'Kanit, sans-serif',
            }}
          >
            {editingIngredient
              ? 'แก้ไขข้อมูลวัตถุดิบในสต๊อก'
              : 'กรอกข้อมูลวัตถุดิบเพื่อเพิ่มเข้าสต๊อก'}
          </Typography>
          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              setIsAddDrawerOpen(false);
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
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                aspectRatio: '1 / 1',
                p: 2,
                overflow: 'hidden',
                border: '1.5px dashed #c9b6a9',
                borderRadius: '16px',
                bgcolor: '#f7eee8',
                color: '#5f4b3d',
                cursor: 'pointer',
                transition: 'background-color .2s ease, border-color .2s ease',
                '&:hover': { bgcolor: '#f1e4da', borderColor: '#805637' },
              }}
            >
              {imageSource ? (
                <Box
                  component="img"
                  src={imageSource}
                  alt="ตัวอย่างรูปวัตถุดิบ"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <>
                  <Box
                    sx={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 44,
                      height: 44,
                      mb: 1,
                      borderRadius: '50%',
                      bgcolor: '#ead9cd',
                      color: '#5f4030',
                      fontSize: 28,
                      lineHeight: 1,
                    }}
                  >
                    +
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 14,
                      fontWeight: 500,
                      textAlign: 'center',
                    }}
                  >
                    เพิ่มรูปวัตถุดิบ
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.25,
                      color: 'text.secondary',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 11,
                      textAlign: 'center',
                    }}
                  >
                    JPG, PNG ไม่เกิน 5 MB
                  </Typography>
                </>
              )}
              <input
                hidden
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setImagePreviewUrl(URL.createObjectURL(file));
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
                label="ชื่อวัตถุดิบ"
                placeholder="เช่น เมล็ดกาแฟคั่วกลาง"
                defaultValue={editingIngredient?.name}
                sx={{ gridColumn: { sm: '1 / -1' } }}
              />
              <TextField
                required
                select
                fullWidth
                label="หมวดหมู่"
                defaultValue=""
              >
                <MenuItem value="" disabled>
                  เลือกหมวดหมู่
                </MenuItem>
                <MenuItem value="coffee">เมล็ดกาแฟ</MenuItem>
                <MenuItem value="milk">นมและครีม</MenuItem>
                <MenuItem value="syrup">ไซรัปและผงชง</MenuItem>
                <MenuItem value="other">อื่น ๆ</MenuItem>
              </TextField>
              <TextField
                fullWidth
                label="จำนวนคงเหลือ"
                type="number"
                defaultValue={editingIngredient?.amount.match(/\d+/)?.[0]}
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <TextField
                required
                select
                fullWidth
                label="หน่วย"
                defaultValue="kg"
              >
                <MenuItem value="kg">กิโลกรัม</MenuItem>
                <MenuItem value="liter">ลิตร</MenuItem>
                <MenuItem value="bottle">ขวด</MenuItem>
                <MenuItem value="piece">ชิ้น</MenuItem>
              </TextField>
              <TextField
                fullWidth
                label="แจ้งเตือนเมื่อคงเหลือ"
                type="number"
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <TextField
                fullWidth
                label="หมายเหตุ"
                placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                sx={{ gridColumn: { sm: '1 / -1' } }}
              />
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 1.25,
                  mt: 1,
                  gridColumn: { sm: '1 / -1' },
                }}
              >
                <Button
                  onClick={() => setIsAddDrawerOpen(false)}
                  sx={{
                    minHeight: 40,
                    borderRadius: '12px',
                    color: '#5f4b3d',
                    fontFamily: 'Kanit, sans-serif',
                  }}
                >
                  {editingIngredient ? 'ยกเลิกแก้ไข' : 'ยกเลิกเพิ่ม'}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    minHeight: 40,
                    borderRadius: '12px',
                    bgcolor: '#201914',
                    fontFamily: 'Kanit, sans-serif',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
                  }}
                >
                  {editingIngredient ? 'บันทึกการแก้ไข' : 'บันทึกวัตถุดิบ'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </DashboardMain>
  );
}
