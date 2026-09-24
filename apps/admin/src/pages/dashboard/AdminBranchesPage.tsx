import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Drawer,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MyLocationOutlinedIcon from '@mui/icons-material/MyLocationOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import {
  BRANCH_STATUS_BADGES,
  DashboardMain,
  SearchField,
  XIcon,
  useMinimumLoading,
  type BranchStatus,
} from '@stackbuild/ui';
import {
  createCompanyBranch,
  listBranches,
  updateBranchSize,
  updateCompanyBranchDetails,
  type CompanyBranchInput,
} from '../../api';
import { AdminBranchesSkeleton } from '../../components/skeletons/AdminBranchesSkeleton';
import { AdminPageIntro } from '../../components/AdminPageIntro';
import {
  ActionSnackbar,
  type ActionNotice,
  useAutoRetry,
} from '@stackbuild/management';

type Branch = {
  id: number;
  name: string;
  code: string;
  size: 'S' | 'M' | 'L';
  status: BranchStatus;
  address?: string;
  opensAt?: string;
  closesAt?: string;
  latitude?: number;
  longitude?: number;
  attendanceRadiusM?: number;
};
type BranchForm = {
  name: string;
  code: string;
  size: Branch['size'];
  address: string;
  opensAt: string;
  closesAt: string;
  latitude: string;
  longitude: string;
  attendanceRadiusM: string;
};
const emptyBranchForm = (): BranchForm => ({
  name: '',
  code: '',
  size: 'S',
  address: '',
  opensAt: '',
  closesAt: '',
  latitude: '',
  longitude: '',
  attendanceRadiusM: '100',
});
const statusLabel: Record<string, BranchStatus> = {
  active: 'เปิดให้บริการ',
  maintenance: 'ปิดปรับปรุง',
  inactive: 'ปิดทำการ',
};

export function AdminBranchesPage() {
  const [query, setQuery] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const showSkeleton = useMinimumLoading(isLoading);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [updatingBranchId, setUpdatingBranchId] = useState<number | null>(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newBranch, setNewBranch] = useState<BranchForm>(emptyBranchForm);
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  useAutoRetry(loadError, () => setReloadKey((key) => key + 1));

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(false);
    void listBranches()
      .then((items) => {
        if (!cancelled)
          setBranches(
            items
              .filter((item) => item.franchiseeId === undefined)
              .map((item) => ({
                ...item,
                size: item.size ?? 'S',
                status: statusLabel[item.status ?? 'inactive'] ?? 'ปิดทำการ',
              })),
          );
      })
      .catch(() => {
        if (!cancelled) {
          setBranches([]);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const visibleBranches = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('th-TH');
    if (!normalizedQuery) return branches;
    return branches.filter((branch) =>
      `${branch.name} ${branch.code}`
        .toLocaleLowerCase('th-TH')
        .includes(normalizedQuery),
    );
  }, [branches, query]);
  const changeBranchSize = async (branchId: number, size: Branch['size']) => {
    setUpdatingBranchId(branchId);
    try {
      await updateBranchSize(branchId, size);
      setBranches((current) =>
        current.map((branch) =>
          branch.id === branchId ? { ...branch, size } : branch,
        ),
      );
      setActionNotice({ message: 'บันทึกขนาดสาขาแล้ว' });
    } catch (error) {
      setActionNotice({
        message:
          error instanceof Error ? error.message : 'ไม่สามารถบันทึกขนาดสาขาได้',
        severity: 'error',
      });
    } finally {
      setUpdatingBranchId(null);
    }
  };
  const createBranch = async () => {
    setCreateError('');
    if ((newBranch.latitude === '') !== (newBranch.longitude === '')) {
      setCreateError('กรุณาระบุละติจูดและลองจิจูดให้ครบทั้งคู่');
      return;
    }
    setIsCreating(true);
    try {
      const input: CompanyBranchInput = {
        name: newBranch.name.trim(),
        code: newBranch.code.trim(),
        size: newBranch.size,
        address: newBranch.address.trim(),
        opensAt: newBranch.opensAt,
        closesAt: newBranch.closesAt,
        latitude: newBranch.latitude === '' ? null : Number(newBranch.latitude),
        longitude:
          newBranch.longitude === '' ? null : Number(newBranch.longitude),
        attendanceRadiusM: Number(newBranch.attendanceRadiusM),
      };
      if (editingBranchId !== null) {
        await updateCompanyBranchDetails(editingBranchId, input);
        setBranches((current) =>
          current.map((branch) =>
            branch.id === editingBranchId
              ? {
                  ...branch,
                  ...input,
                  latitude: input.latitude ?? undefined,
                  longitude: input.longitude ?? undefined,
                }
              : branch,
          ),
        );
      } else {
        const created = await createCompanyBranch(input);
        setBranches((current) => [
          {
            ...created,
            size: created.size ?? newBranch.size,
            status: statusLabel[created.status ?? 'active'] ?? 'เปิดให้บริการ',
          },
          ...current,
        ]);
      }
      setNewBranch(emptyBranchForm());
      setEditingBranchId(null);
      setIsCreateDrawerOpen(false);
      setActionNotice({
        message:
          editingBranchId !== null
            ? 'บันทึกข้อมูลสาขาแล้ว'
            : 'เพิ่มสาขา SBC แล้ว และเตรียมรายการตามขนาดสาขาเรียบร้อย',
      });
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : 'ไม่สามารถบันทึกสาขาได้',
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardMain>
      <AdminPageIntro
        title="สาขา Super Black Coffee"
        description="จัดการข้อมูลสาขา SBC และกำหนดขนาดบริการของแต่ละสาขา"
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 2,
        }}
      >
        <SearchField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ค้นหาสาขา"
          size="small"
          name="branch-search"
          autoComplete="off"
          sx={{ width: { xs: '100%', sm: 310 } }}
        />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant="contained"
            onClick={() => {
              setCreateError('');
              setEditingBranchId(null);
              setNewBranch(emptyBranchForm());
              setIsCreateDrawerOpen(true);
            }}
            sx={{
              minHeight: 34,
              borderRadius: '12px',
              bgcolor: '#201914',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 12,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
            }}
          >
            เพิ่มสาขา SBC
          </Button>
        </Box>
      </Box>

      {loadError ? (
        <Typography
          sx={{ mb: 3, color: '#a22e2a', fontFamily: 'Kanit, sans-serif' }}
        >
          ไม่สามารถโหลดข้อมูลสาขาได้ กำลังลองเชื่อมต่อใหม่อัตโนมัติ
        </Typography>
      ) : null}
      {showSkeleton ? <AdminBranchesSkeleton /> : null}

      <Box
        sx={{
          display: showSkeleton || loadError ? 'none' : 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'repeat(2, minmax(0, 1fr))',
          },
          gap: 2.25,
          maxWidth: 1200,
        }}
      >
        {visibleBranches.map((branch) => {
          const badge = BRANCH_STATUS_BADGES[branch.status];
          return (
            <Card
              key={branch.id}
              variant="outlined"
              sx={{
                borderRadius: '20px',
                borderColor: '#e8ddd5',
                boxShadow: '0 8px 30px rgba(57, 34, 19, 0.035)',
                transition: 'box-shadow 180ms ease, transform 180ms ease',
                '&:hover': {
                  boxShadow: '0 14px 36px rgba(57, 34, 19, 0.09)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box sx={{ p: { xs: 2.25, sm: 3 } }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1.5, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 46,
                        height: 46,
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '14px',
                        bgcolor: '#f5ede7',
                        color: '#76533c',
                      }}
                    >
                      <StorefrontOutlinedIcon sx={{ fontSize: 25 }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 20,
                          fontWeight: 600,
                          lineHeight: 1.35,
                        }}
                      >
                        {branch.name}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.2,
                          color: '#805637',
                          fontFamily: '"SBC Sans", sans-serif',
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                        }}
                      >
                        {branch.code}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={branch.status}
                    size="small"
                    sx={{
                      height: 25,
                      borderRadius: '12px',
                      bgcolor: badge.main,
                      color: badge.contrastText,
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 1.35,
                    mt: 2.5,
                    pt: 2.25,
                    borderTop: '1px solid #eee6e0',
                  }}
                >
                  {[
                    {
                      icon: <AccessTimeRoundedIcon sx={{ fontSize: 19 }} />,
                      label: 'เวลาเปิด–ปิด',
                      value:
                        branch.opensAt && branch.closesAt
                          ? `${branch.opensAt}–${branch.closesAt}`
                          : 'ยังไม่ระบุ',
                    },
                    {
                      icon: <PlaceOutlinedIcon sx={{ fontSize: 19 }} />,
                      label: 'ที่อยู่ร้าน',
                      value: branch.address || 'ยังไม่ระบุ',
                    },
                    {
                      icon: <MyLocationOutlinedIcon sx={{ fontSize: 19 }} />,
                      label: 'พิกัดเช็กอิน',
                      value:
                        branch.latitude != null && branch.longitude != null
                          ? `${branch.latitude}, ${branch.longitude} · ${branch.attendanceRadiusM ?? 100} ม.`
                          : 'ยังไม่ตั้งค่า',
                    },
                  ].map((detail) => (
                    <Box
                      key={detail.label}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.2,
                      }}
                    >
                      <Box sx={{ color: '#a17c61', mt: '2px', lineHeight: 0 }}>
                        {detail.icon}
                      </Box>
                      <Typography
                        sx={{
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 13,
                          lineHeight: 1.55,
                          color: '#665449',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        <Box
                          component="span"
                          sx={{ color: '#97877c', mr: 0.75 }}
                        >
                          {detail.label}
                        </Box>
                        {detail.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 1.5,
                    mt: 2.5,
                    pt: 2,
                    borderTop: '1px solid #eee6e0',
                  }}
                >
                  <TextField
                    select
                    size="small"
                    label="ขนาดสาขา"
                    value={branch.size}
                    disabled={updatingBranchId === branch.id}
                    onChange={(event) =>
                      void changeBranchSize(
                        branch.id,
                        event.target.value as Branch['size'],
                      )
                    }
                    sx={{
                      width: { xs: '100%', sm: 245 },
                      '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                    }}
                  >
                    <MenuItem value="S">S — น้ำและสต๊อก</MenuItem>
                    <MenuItem value="M">
                      M — น้ำ อาหาร เบเกอรี่ และสต๊อก
                    </MenuItem>
                    <MenuItem value="L">
                      L — น้ำ อาหาร เบเกอรี่ และสต๊อก
                    </MenuItem>
                  </TextField>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditOutlinedIcon sx={{ fontSize: 17 }} />}
                    onClick={() => {
                      setCreateError('');
                      setEditingBranchId(branch.id);
                      setNewBranch({
                        name: branch.name,
                        code: branch.code,
                        size: branch.size,
                        address: branch.address ?? '',
                        opensAt: branch.opensAt ?? '',
                        closesAt: branch.closesAt ?? '',
                        latitude:
                          branch.latitude == null
                            ? ''
                            : String(branch.latitude),
                        longitude:
                          branch.longitude == null
                            ? ''
                            : String(branch.longitude),
                        attendanceRadiusM: String(
                          branch.attendanceRadiusM ?? 100,
                        ),
                      });
                      setIsCreateDrawerOpen(true);
                    }}
                    sx={{
                      minHeight: 40,
                      px: 1.75,
                      borderRadius: '10px',
                      borderColor: '#dfcfc3',
                      color: '#5d4030',
                      fontFamily: 'Kanit, sans-serif',
                      whiteSpace: 'nowrap',
                      '&:hover': { borderColor: '#9a7458', bgcolor: '#f9f3ef' },
                    }}
                  >
                    แก้ไขข้อมูลสาขา
                  </Button>
                </Box>
              </Box>
            </Card>
          );
        })}
      </Box>
      {!showSkeleton && !loadError && visibleBranches.length === 0 && (
        <Typography
          sx={{
            pt: 4,
            textAlign: 'center',
            color: 'text.secondary',
            fontFamily: 'Kanit, sans-serif',
          }}
        >
          ไม่พบข้อมูลสาขา
        </Typography>
      )}
      <ActionSnackbar
        notice={actionNotice}
        onClose={() => setActionNotice(null)}
      />
      <Drawer
        anchor="bottom"
        open={isCreateDrawerOpen}
        onClose={() => !isCreating && setIsCreateDrawerOpen(false)}
        transitionDuration={{ enter: 360, exit: 280 }}
        slotProps={{
          paper: {
            sx: {
              left: { md: '254px' },
              width: { md: 'calc(100% - 278px)' },
              height: { xs: '88dvh', sm: 'calc(100dvh - 72px)' },
              overflow: 'hidden',
              borderRadius: '16px 16px 0 0',
              bgcolor: '#fffaf7',
            },
          },
        }}
      >
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            void createBranch();
          }}
          sx={{
            width: '100%',
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 2.5, sm: 4 },
            pt: 1.5,
            pb: 3.5,
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              bgcolor: '#fff',
            },
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
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
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
                {editingBranchId === null
                  ? 'เพิ่มสาขา SBC'
                  : 'แก้ไขข้อมูลสาขา SBC'}
              </Typography>
              <Typography
                sx={{
                  mt: 0.25,
                  color: 'text.secondary',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 14,
                }}
              >
                {editingBranchId === null
                  ? 'ระบบจะคัดลอกเมนูและสต๊อกเริ่มต้นตามขนาดของสาขา'
                  : 'ปรับที่อยู่ เวลาเปิด–ปิด และพิกัดร้านสำหรับการลงเวลา'}
              </Typography>
            </Box>
            <Button
              aria-label="ปิด"
              disabled={isCreating}
              onClick={() => setIsCreateDrawerOpen(false)}
              sx={{
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
              <XIcon size={20} />
            </Button>
          </Box>
          <Divider
            sx={{
              mt: 2.25,
              mx: { xs: -2.5, sm: -4 },
              borderColor: '#e8ddd5',
            }}
          />
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              pt: 2.25,
              pr: 0.5,
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
              },
              alignContent: 'start',
              gap: 2,
            }}
          >
            <TextField
              autoFocus
              required
              label="ชื่อสาขา"
              value={newBranch.name}
              onChange={(event) =>
                setNewBranch((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              slotProps={{ htmlInput: { maxLength: 100 } }}
              fullWidth
            />
            <TextField
              required
              label="รหัสสาขา"
              placeholder="SBC-CNX-001"
              value={newBranch.code}
              onChange={(event) =>
                setNewBranch((current) => ({
                  ...current,
                  code: event.target.value.toUpperCase(),
                }))
              }
              slotProps={{ htmlInput: { maxLength: 50 } }}
              fullWidth
            />
            <TextField
              select
              required
              label="ขนาดสาขา"
              value={newBranch.size}
              disabled={editingBranchId !== null}
              onChange={(event) =>
                setNewBranch((current) => ({
                  ...current,
                  size: event.target.value as Branch['size'],
                }))
              }
              fullWidth
            >
              <MenuItem value="S">S — น้ำและสต๊อก</MenuItem>
              <MenuItem value="M">M — น้ำ อาหาร เบเกอรี่ และสต๊อก</MenuItem>
              <MenuItem value="L">L — น้ำ อาหาร เบเกอรี่ และสต๊อก</MenuItem>
            </TextField>
            <TextField
              label="ที่อยู่สาขา"
              value={newBranch.address}
              onChange={(event) =>
                setNewBranch((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
              multiline
              minRows={2}
              fullWidth
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
            <TextField
              label="เวลาเปิด"
              type="time"
              value={newBranch.opensAt}
              onChange={(event) =>
                setNewBranch((current) => ({
                  ...current,
                  opensAt: event.target.value,
                }))
              }
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="เวลาปิด"
              type="time"
              value={newBranch.closesAt}
              onChange={(event) =>
                setNewBranch((current) => ({
                  ...current,
                  closesAt: event.target.value,
                }))
              }
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <Typography
              sx={{
                gridColumn: { sm: '1 / -1' },
                fontFamily: 'Kanit, sans-serif',
                fontSize: 16,
                fontWeight: 600,
                color: '#201914',
              }}
            >
              พิกัดร้านสำหรับการลงเวลา
            </Typography>
            <TextField
              label="ละติจูด"
              type="number"
              value={newBranch.latitude}
              onChange={(event) =>
                setNewBranch((current) => ({
                  ...current,
                  latitude: event.target.value,
                }))
              }
              slotProps={{ htmlInput: { min: -90, max: 90, step: 'any' } }}
              helperText="ตัวอย่าง 16.8211"
              fullWidth
            />
            <TextField
              label="ลองจิจูด"
              type="number"
              value={newBranch.longitude}
              onChange={(event) =>
                setNewBranch((current) => ({
                  ...current,
                  longitude: event.target.value,
                }))
              }
              slotProps={{ htmlInput: { min: -180, max: 180, step: 'any' } }}
              helperText="ตัวอย่าง 100.2659"
              fullWidth
            />
            <TextField
              label="รัศมีเช็กอิน (เมตร)"
              type="number"
              value={newBranch.attendanceRadiusM}
              onChange={(event) =>
                setNewBranch((current) => ({
                  ...current,
                  attendanceRadiusM: event.target.value,
                }))
              }
              slotProps={{ htmlInput: { min: 25, max: 1000, step: 1 } }}
              helperText="บันทึกไว้สำหรับการตรวจระยะตอนเช็กอิน/เช็กเอาต์ 25–1,000 เมตร (ยังไม่เปิดใช้การตรวจระยะ)"
              fullWidth
            />
            {createError ? (
              <Typography
                role="alert"
                sx={{
                  alignSelf: 'center',
                  color: '#a22e2a',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 13,
                }}
              >
                {createError}
              </Typography>
            ) : null}
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1.25,
              pt: 2,
            }}
          >
            <Button
              disabled={isCreating}
              onClick={() => setIsCreateDrawerOpen(false)}
              sx={{
                minHeight: 40,
                borderRadius: '12px',
                color: '#5f4b3d',
                fontFamily: 'Kanit, sans-serif',
              }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={
                isCreating ||
                !newBranch.name.trim() ||
                !newBranch.code.trim() ||
                (newBranch.latitude === '') !== (newBranch.longitude === '') ||
                !newBranch.attendanceRadiusM ||
                Number(newBranch.attendanceRadiusM) < 25 ||
                Number(newBranch.attendanceRadiusM) > 1000
              }
              sx={{
                minHeight: 40,
                borderRadius: '12px',
                bgcolor: '#201914',
                fontFamily: 'Kanit, sans-serif',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
              }}
            >
              {isCreating
                ? 'กำลังบันทึก...'
                : editingBranchId === null
                  ? 'เพิ่มสาขา'
                  : 'บันทึกข้อมูล'}
            </Button>
          </Box>
        </Box>
      </Drawer>
    </DashboardMain>
  );
}
