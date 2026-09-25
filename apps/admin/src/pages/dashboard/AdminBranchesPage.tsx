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
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { useQueryClient } from '@tanstack/react-query';
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
import { suggestBranchCode } from '../../utils/branchCode';
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
  isHeadquarters?: boolean;
  workDays?: number[];
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
  workDays: number[];
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
  workDays: [1, 2, 3, 4, 5],
});
const statusLabel: Record<string, BranchStatus> = {
  active: 'เปิดให้บริการ',
  maintenance: 'ปิดปรับปรุง',
  inactive: 'ปิดทำการ',
};
const workdayOptions = [
  { value: 1, label: 'วันจันทร์' },
  { value: 2, label: 'วันอังคาร' },
  { value: 3, label: 'วันพุธ' },
  { value: 4, label: 'วันพฤหัสบดี' },
  { value: 5, label: 'วันศุกร์' },
  { value: 6, label: 'วันเสาร์' },
  { value: 7, label: 'วันอาทิตย์' },
];
const defaultWorkDays = [1, 2, 3, 4, 5];

function workDaysLabel(days?: number[]) {
  const selectedDays = days?.length ? days : defaultWorkDays;
  return workdayOptions
    .filter((option) => selectedDays.includes(option.value))
    .map((option) => option.label)
    .join(' ');
}

const coordinateFromGoogleMapsLink = (value: string) => {
  // Google place links include both the viewport after "@" and the actual place
  // location in "!3d...!4d...". Always prefer the latter when it is available.
  const matched =
    value.match(/!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/i) ??
    value.match(
      /(?:@|[?&](?:q|query|ll)=)(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/i,
    );
  if (!matched) return null;
  const latitude = Number(matched[1]);
  const longitude = Number(matched[2]);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
};

export function AdminBranchesPage() {
  const queryClient = useQueryClient();
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
  const [isLocating, setIsLocating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [newBranch, setNewBranch] = useState<BranchForm>(emptyBranchForm);
  const [branchCodeEdited, setBranchCodeEdited] = useState(false);
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
  const existingBranchCodes = useMemo(
    () => branches.map((branch) => branch.code),
    [branches],
  );
  const headquarters = visibleBranches.filter(
    (branch) => branch.isHeadquarters,
  );
  const visibleSbcBranches = visibleBranches.filter(
    (branch) => !branch.isHeadquarters,
  );
  const editingHeadquarters =
    editingBranchId !== null &&
    branches.find((branch) => branch.id === editingBranchId)?.isHeadquarters ===
      true;
  const coordinates = useMemo(() => {
    const latitude = Number(newBranch.latitude);
    const longitude = Number(newBranch.longitude);
    if (
      newBranch.latitude === '' ||
      newBranch.longitude === '' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return null;
    }
    return { latitude, longitude };
  }, [newBranch.latitude, newBranch.longitude]);
  const googleMapsQuery = coordinates
    ? `${coordinates.latitude},${coordinates.longitude}`
    : newBranch.address.trim() || newBranch.name.trim() || 'ประเทศไทย';
  const googleMapsEmbedSrc = `https://www.google.com/maps?q=${encodeURIComponent(googleMapsQuery)}&z=${coordinates ? 18 : 12}&output=embed`;
  const googleMapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleMapsQuery)}`;
  const attendanceRadius = Math.min(
    1000,
    Math.max(25, Number(newBranch.attendanceRadiusM) || 100),
  );
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setCreateError('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่งปัจจุบัน');
      return;
    }
    setCreateError('');
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewBranch((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setIsLocating(false);
      },
      () => {
        setCreateError(
          'ไม่สามารถรับตำแหน่งได้ กรุณาอนุญาตการใช้ตำแหน่งหรือวางลิงก์ Google Maps',
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };
  const changeBranchSize = async (branchId: number, size: Branch['size']) => {
    setUpdatingBranchId(branchId);
    try {
      await updateBranchSize(branchId, size);
      setBranches((current) =>
        current.map((branch) =>
          branch.id === branchId ? { ...branch, size } : branch,
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
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
        workDays: newBranch.workDays,
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
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
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
  const openBranchEditor = (branch: Branch) => {
    setCreateError('');
    setGoogleMapsLink('');
    setEditingBranchId(branch.id);
    setBranchCodeEdited(false);
    setNewBranch({
      name: branch.name,
      code: branch.code,
      size: branch.size,
      address: branch.address ?? '',
      opensAt: branch.opensAt ?? '',
      closesAt: branch.closesAt ?? '',
      latitude: branch.latitude == null ? '' : String(branch.latitude),
      longitude: branch.longitude == null ? '' : String(branch.longitude),
      attendanceRadiusM: String(branch.attendanceRadiusM ?? 100),
      workDays: branch.workDays?.length ? branch.workDays : defaultWorkDays,
    });
    setIsCreateDrawerOpen(true);
  };

  return (
    <DashboardMain>
      <AdminPageIntro
        title="สาขา SBC และสำนักงานใหญ่"
        description="จัดการข้อมูลสำนักงานใหญ่แยกจากสาขา SBC และกำหนดขนาดบริการของแต่ละสาขา"
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
              setGoogleMapsLink('');
              setEditingBranchId(null);
              setNewBranch(emptyBranchForm());
              setBranchCodeEdited(false);
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

      {!showSkeleton && !loadError && headquarters.length > 0 ? (
        <Box sx={{ mb: 3, maxWidth: 1200 }}>
          <Typography
            sx={{ mb: 1.25, color: '#60493b', fontSize: 16, fontWeight: 800 }}
          >
            สำนักงานใหญ่
          </Typography>
          {headquarters.map((branch) => (
            <Card
              key={branch.id}
              variant="outlined"
              sx={{
                borderRadius: '20px',
                borderColor: '#dccabe',
                bgcolor: '#fffcfa',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  p: { xs: 2.25, sm: 2.75 },
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
                    {branch.name}
                  </Typography>
                  <Typography
                    sx={{
                      color: '#805637',
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                    }}
                  >
                    {branch.code}
                  </Typography>
                  <Typography
                    color="text.secondary"
                    sx={{ mt: 1, fontSize: 14 }}
                  >
                    เวลาทำงานมาตรฐาน {branch.opensAt ?? '09:00'}–
                    {branch.closesAt ?? '18:00'} น. · ไม่ใช้ตารางกะ
                  </Typography>
                  <Typography
                    color="text.secondary"
                    sx={{ mt: 0.35, fontSize: 13 }}
                  >
                    พิกัดเช็กอิน{' '}
                    {branch.latitude != null && branch.longitude != null
                      ? `${branch.latitude}, ${branch.longitude} · ${branch.attendanceRadiusM ?? 100} ม.`
                      : 'ยังไม่ตั้งค่า'}
                  </Typography>
                  <Typography
                    color="text.secondary"
                    sx={{ mt: 0.35, fontSize: 13 }}
                  >
                    วันทำงาน {workDaysLabel(branch.workDays)}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditOutlinedIcon sx={{ fontSize: 17 }} />}
                  onClick={() => openBranchEditor(branch)}
                  sx={{
                    minHeight: 40,
                    px: 1.75,
                    borderRadius: '10px',
                    borderColor: '#dfcfc3',
                    color: '#5d4030',
                  }}
                >
                  แก้ไขสำนักงานใหญ่
                </Button>
              </Box>
            </Card>
          ))}
        </Box>
      ) : null}

      {!showSkeleton && !loadError ? (
        <Typography
          sx={{ mb: 1.25, color: '#60493b', fontSize: 16, fontWeight: 800 }}
        >
          สาขา SBC
        </Typography>
      ) : null}

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
        {visibleSbcBranches.map((branch) => {
          const badge = BRANCH_STATUS_BADGES[branch.status];
          return (
            <Card
              key={branch.id}
              variant="outlined"
              sx={{
                borderRadius: '20px',
                borderColor: '#e8ddd5',
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
                    onClick={() => openBranchEditor(branch)}
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
        onClose={() => {
          if (!isCreating) {
            setIsCreateDrawerOpen(false);
          }
        }}
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
                  : editingHeadquarters
                    ? 'แก้ไขสำนักงานใหญ่'
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
                  : editingHeadquarters
                    ? 'กำหนดวันและเวลาทำงานมาตรฐาน รวมถึงพิกัดสำหรับการลงเวลา'
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
                  code:
                    editingBranchId === null && !branchCodeEdited
                      ? suggestBranchCode(
                          event.target.value,
                          existingBranchCodes,
                        )
                      : current.code,
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
              onChange={(event) => {
                setBranchCodeEdited(true);
                setNewBranch((current) => ({
                  ...current,
                  code: event.target.value.toUpperCase(),
                }));
              }}
              slotProps={{ htmlInput: { maxLength: 50 } }}
              fullWidth
            />
            {!editingHeadquarters ? (
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
            ) : null}
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
            {editingHeadquarters ? (
              <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                <Typography
                  sx={{ fontSize: 15, fontWeight: 700, color: '#201914' }}
                >
                  วันทำงานของสำนักงานใหญ่
                </Typography>
                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}
                >
                  {workdayOptions.map((option) => {
                    const isSelected = newBranch.workDays.includes(
                      option.value,
                    );
                    return (
                      <Button
                        key={option.value}
                        size="small"
                        variant={isSelected ? 'contained' : 'outlined'}
                        aria-pressed={isSelected}
                        disabled={isSelected && newBranch.workDays.length === 1}
                        onClick={() =>
                          setNewBranch((current) => ({
                            ...current,
                            workDays: isSelected
                              ? current.workDays.filter(
                                  (day) => day !== option.value,
                                )
                              : [...current.workDays, option.value].sort(
                                  (a, b) => a - b,
                                ),
                          }))
                        }
                        sx={{
                          minWidth: 88,
                          borderRadius: '10px',
                          ...(isSelected
                            ? {
                                bgcolor: '#5d4030',
                                '&:hover': { bgcolor: '#432d20' },
                              }
                            : { borderColor: '#dfcfc3', color: '#5d4030' }),
                        }}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </Box>
                <Typography
                  color="text.secondary"
                  sx={{ mt: 0.75, fontSize: 12 }}
                >
                  วันหยุดนักขัตฤกษ์ยังเป็นวันหยุด แม้เลือกวันนั้นเป็นวันทำงาน
                </Typography>
              </Box>
            ) : null}
            <Typography
              sx={{
                gridColumn: { sm: '1 / -1' },
                fontFamily: 'Kanit, sans-serif',
                fontSize: 16,
                fontWeight: 600,
                color: '#201914',
              }}
            >
              ตั้งค่าพิกัดร้านสำหรับการลงเวลา
            </Typography>
            <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
              <Box
                sx={{
                  position: 'relative',
                  height: { xs: 250, sm: 330 },
                  overflow: 'hidden',
                  border: '1px solid #e1d2c7',
                  borderRadius: '16px',
                  bgcolor: '#f6f0eb',
                }}
              >
                <Box
                  component="iframe"
                  title="แผนที่ตำแหน่งสาขา"
                  src={googleMapsEmbedSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  sx={{ width: '100%', height: '100%', border: 0 }}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  mt: 1,
                  color: 'text.secondary',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 12,
                }}
              >
                <PlaceOutlinedIcon sx={{ fontSize: 16, color: '#805637' }} />
                หมุดสีแดงบน Google Maps คือพิกัดร้านที่จะบันทึก
              </Box>
              <Box
                aria-label={`รัศมีเช็กอิน ${attendanceRadius} เมตร`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  mt: 1,
                  px: 1.25,
                  py: 1,
                  border: '1px solid #e8ddd5',
                  borderRadius: '12px',
                  bgcolor: '#fff',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    border: '2px solid rgba(129, 83, 52, 0.72)',
                    borderRadius: '50%',
                    bgcolor: 'rgba(137, 88, 53, 0.12)',
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#805637',
                    }}
                  />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      color: '#3f2e24',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    รัศมีเช็กอิน {attendanceRadius} เมตร
                  </Typography>
                  <Typography
                    sx={{
                      color: 'text.secondary',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 11,
                    }}
                  >
                    ใช้ตรวจระยะจากหมุด Google Maps ตอนเช็กอิน/เช็กเอาต์
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  mt: 1.25,
                }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  disabled={isLocating}
                  startIcon={<MyLocationOutlinedIcon sx={{ fontSize: 17 }} />}
                  onClick={useCurrentLocation}
                  sx={{ fontFamily: 'Kanit, sans-serif', borderRadius: '10px' }}
                >
                  {isLocating ? 'กำลังหาตำแหน่ง...' : 'ใช้ตำแหน่งปัจจุบัน'}
                </Button>
                <Button
                  size="small"
                  component="a"
                  href={googleMapsHref}
                  target="_blank"
                  rel="noreferrer"
                  variant="outlined"
                  endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 16 }} />}
                  sx={{ fontFamily: 'Kanit, sans-serif', borderRadius: '10px' }}
                >
                  เปิด Google Maps เพื่อตรวจสอบตำแหน่ง
                </Button>
              </Box>
            </Box>
            <TextField
              label="วางลิงก์ Google Maps เพื่อบันทึกพิกัด"
              placeholder="https://www.google.com/maps/@16.8211,100.2659,17z"
              value={googleMapsLink}
              onChange={(event) => {
                const value = event.target.value;
                setGoogleMapsLink(value);
                const location = coordinateFromGoogleMapsLink(value);
                if (location) {
                  setNewBranch((current) => ({
                    ...current,
                    latitude: String(location.latitude),
                    longitude: String(location.longitude),
                  }));
                  setCreateError('');
                }
              }}
              helperText="ค้นหาสถานที่หรือปักหมุดใน Google Maps แล้วคัดลอกลิงก์ที่มีพิกัดมาวาง"
              fullWidth
              sx={{ gridColumn: { sm: '1 / -1' } }}
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
              helperText="วงบนแผนที่แสดงรัศมีที่บันทึกไว้สำหรับเช็กอิน/เช็กเอาต์ 25–1,000 เมตร"
              fullWidth
            />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 1.25,
              }}
            >
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
                fullWidth
              />
            </Box>
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
