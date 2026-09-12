import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Drawer,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  DashboardMain,
  PlusIcon,
  SearchIcon,
  XIcon,
  type SearchIconHandle,
} from '@stackbuild/ui';
import {
  createFranchisee,
  listBranches,
  listFranchisees,
  updateFranchiseeStatus,
  type Branch,
  type Franchisee,
} from '../../api';
import { AdminFranchiseBranchesSkeleton } from '../../components/skeletons/AdminFranchiseBranchesSkeleton';
import {
  ActionSnackbar,
  type ActionNotice,
  useAutoRetry,
} from '@stackbuild/management';

type FranchisePlan = 'S' | 'M' | 'L';

const plans: Record<
  FranchisePlan,
  {
    title: string;
    subtitle: string;
    investment: string;
    services: string[];
    color: string;
  }
> = {
  S: {
    title: 'S — Smart Café',
    subtitle: 'เริ่มต้นง่าย สำหรับพื้นที่ขนาดกะทัดรัด',
    investment: 'ลงทุนโดยประมาณ 1.5 – 2.5 ล้านบาท',
    services: ['Coffee & Beverage'],
    color: '#3d7c2b',
  },
  M: {
    title: 'M — Lifestyle Café',
    subtitle: 'ร้านกาแฟพร้อมบริการเสริมสำหรับทำเลศักยภาพ',
    investment: 'ลงทุนโดยประมาณ 3.5 – 5 ล้านบาท',
    services: ['Coffee & Beverage', 'Food & Bakery', 'BPOST65 Express'],
    color: '#9b6916',
  },
  L: {
    title: 'L — Lifestyle Hub',
    subtitle: 'ศูนย์รวมบริการครบวงจรสำหรับพื้นที่ขนาดใหญ่',
    investment: 'ลงทุนโดยประมาณ 7 – 10 ล้านบาทขึ้นไป',
    services: [
      'Coffee & Beverage',
      'Food & Bakery',
      'BPOST65 Express',
      'EV Charging',
      'Mobile Café',
    ],
    color: '#b12a22',
  },
};

type FranchiseBranchCard = {
  id: number;
  franchiseeId: number;
  name: string;
  branch: string;
  plan: FranchisePlan;
  status: string;
};

const statusLabel: Record<string, string> = {
  active: 'ใช้งานแล้ว',
  inactive: 'ปิดใช้งาน',
  invited: 'รอเปิดใช้งาน',
};

const toCards = (franchisees: Franchisee[], branches: Branch[]) =>
  branches
    .filter((branch) => branch.franchiseeId !== undefined)
    .map((branch) => {
      const franchisee = franchisees.find(
        (item) => item.id === branch.franchiseeId,
      );
      return {
        id: branch.id,
        franchiseeId: branch.franchiseeId!,
        name: franchisee?.name ?? branch.franchiseeName ?? 'แฟรนไชส์',
        branch: branch.name,
        plan: franchisee?.plan ?? 'S',
        status:
          statusLabel[franchisee?.status ?? branch.status ?? 'inactive'] ??
          'ปิดใช้งาน',
      };
    });

export function AdminFranchiseBranchesPage() {
  const searchIconRef = useRef<SearchIconHandle>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    plan: 'S' as FranchisePlan,
    branchName: '',
    branchCode: '',
    username: '',
    password: '',
  });
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [activationError, setActivationError] = useState('');
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [franchisees, setFranchisees] = useState<FranchiseBranchCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useAutoRetry(loadError, () => setReloadKey((key) => key + 1));
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(false);
    void Promise.all([listFranchisees(), listBranches()])
      .then(([owners, branches]) => {
        if (!cancelled) setFranchisees(toCards(owners, branches));
      })
      .catch(() => {
        if (!cancelled) {
          setFranchisees([]);
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
  const visibleFranchisees = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('th-TH');
    if (!normalizedQuery) return franchisees;
    return franchisees.filter((franchisee) =>
      `${franchisee.name} ${franchisee.branch}`
        .toLocaleLowerCase('th-TH')
        .includes(normalizedQuery),
    );
  }, [franchisees, query]);
  const updateForm = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    setSaveError('');
    setIsSaving(true);
    try {
      await createFranchisee(form);
      const [owners, branches] = await Promise.all([
        listFranchisees(),
        listBranches(),
      ]);
      setFranchisees(toCards(owners, branches));
      setForm({
        name: '',
        email: '',
        plan: 'S',
        branchName: '',
        branchCode: '',
        username: '',
        password: '',
      });
      setIsDrawerOpen(false);
      setActionNotice({ message: 'เพิ่มแฟรนไชส์แล้ว' });
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'ไม่สามารถสร้างแฟรนไชส์ได้',
      );
    } finally {
      setIsSaving(false);
    }
  };
  const activateFranchisee = async (franchiseeId: number) => {
    setActivationError('');
    setActivatingId(franchiseeId);
    try {
      await updateFranchiseeStatus(franchiseeId, 'active');
      setFranchisees((current) =>
        current.map((item) =>
          item.franchiseeId === franchiseeId
            ? { ...item, status: 'ใช้งานแล้ว' }
            : item,
        ),
      );
      setActionNotice({ message: 'เปิดใช้งานแฟรนไชส์แล้ว' });
    } catch (error) {
      setActivationError(
        error instanceof Error ? error.message : 'ไม่สามารถเปิดใช้งานได้',
      );
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <DashboardMain>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 2.5,
        }}
      >
        <TextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => searchIconRef.current?.startAnimation()}
          onBlur={() => searchIconRef.current?.stopAnimation()}
          placeholder="ค้นหาสาขาแฟรนไชส์"
          size="small"
          name="franchise-branch-search"
          autoComplete="off"
          sx={{
            width: { xs: '100%', sm: 310 },
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
          startIcon={<PlusIcon size={16} />}
          onClick={() => setIsDrawerOpen(true)}
          sx={{
            minHeight: 40,
            borderRadius: '12px',
            bgcolor: '#201914',
            fontFamily: 'Kanit, sans-serif',
            fontWeight: 500,
            boxShadow: 'none',
            '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
          }}
        >
          เพิ่มบัญชีแฟรนไชส์
        </Button>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mt: 1.5,
          mb: 1.25,
        }}
      >
        <Typography
          sx={{
            color: '#3c2d24',
            fontFamily: 'Kanit, sans-serif',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          บัญชีแฟรนไชส์
        </Typography>
        <Typography
          sx={{
            color: 'text.secondary',
            fontFamily: 'Kanit, sans-serif',
            fontSize: 13,
          }}
        >
          แสดงเฉพาะข้อมูลสำหรับเข้าใช้ระบบ
        </Typography>
      </Box>
      <Box
        sx={{
          display: isLoading || loadError ? 'none' : 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          gap: '16px',
        }}
      >
        {visibleFranchisees.map((franchisee) => (
          <Card
            key={franchisee.id}
            variant="outlined"
            sx={{ borderRadius: '15px', borderColor: '#e8ddd5' }}
          >
            <Box sx={{ p: { xs: 2.25, md: 2.5 } }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      color: '#201914',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 19,
                      fontWeight: 600,
                    }}
                  >
                    {franchisee.name}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.35,
                      color: '#805637',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {franchisee.branch}
                  </Typography>
                </Box>
                <Chip
                  label={franchisee.status}
                  size="small"
                  sx={{
                    height: 25,
                    borderRadius: '12px',
                    bgcolor:
                      franchisee.status === 'ใช้งานแล้ว'
                        ? '#def4e7'
                        : '#f8edd8',
                    color:
                      franchisee.status === 'ใช้งานแล้ว'
                        ? '#177245'
                        : '#a76415',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Box sx={{ mt: 2, pt: 1.75, borderTop: '1px solid #eee6e0' }}>
                <Chip
                  label={`แพ็กเกจ ${franchisee.plan}`}
                  size="small"
                  sx={{
                    height: 25,
                    borderRadius: '12px',
                    bgcolor: `${plans[franchisee.plan].color}16`,
                    color: plans[franchisee.plan].color,
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <Typography
                  sx={{
                    mt: 1.1,
                    color: 'text.secondary',
                    fontFamily: 'Inter, Kanit, sans-serif',
                    fontSize: 12,
                    overflowWrap: 'anywhere',
                  }}
                >
                  บัญชีผู้ดูแล: {franchisee.name}
                </Typography>
                {franchisee.status !== 'ใช้งานแล้ว' ? (
                  <Button
                    size="small"
                    variant="contained"
                    disabled={activatingId === franchisee.franchiseeId}
                    onClick={() =>
                      void activateFranchisee(franchisee.franchiseeId)
                    }
                    sx={{
                      mt: 1.25,
                      minHeight: 32,
                      borderRadius: '10px',
                      bgcolor: '#2d6d47',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 12,
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#245a3b', boxShadow: 'none' },
                    }}
                  >
                    {activatingId === franchisee.franchiseeId
                      ? 'กำลังเปิดใช้งาน...'
                      : 'เปิดใช้งาน'}
                  </Button>
                ) : null}
              </Box>
            </Box>
          </Card>
        ))}
      </Box>
      {isLoading ? <AdminFranchiseBranchesSkeleton contentOnly /> : null}
      {loadError && (
        <Card
          variant="outlined"
          role="alert"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            p: 2,
            borderColor: '#edc7c3',
            borderRadius: '15px',
            bgcolor: '#fffaf8',
          }}
        >
          <Typography
            sx={{
              color: '#a22e2a',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 14,
            }}
          >
            ไม่สามารถโหลดข้อมูลแฟรนไชส์ได้
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
            กำลังลองเชื่อมต่อใหม่อัตโนมัติ
          </Typography>
        </Card>
      )}
      {!isLoading && !loadError && visibleFranchisees.length === 0 && (
        <Typography
          sx={{
            pt: 4,
            textAlign: 'center',
            color: 'text.secondary',
            fontFamily: 'Kanit, sans-serif',
          }}
        >
          ไม่พบข้อมูลสาขาแฟรนไชส์
        </Typography>
      )}
      {activationError ? (
        <Typography
          sx={{ mt: 1.5, color: 'error.main', fontFamily: 'Kanit, sans-serif' }}
        >
          {activationError}
        </Typography>
      ) : null}
      <Drawer
        anchor="bottom"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        transitionDuration={{ enter: 360, exit: 280 }}
        slotProps={{
          paper: {
            sx: {
              left: { md: '254px' },
              width: { md: 'calc(100% - 278px)' },
              height: { xs: '88dvh', sm: 'calc(100dvh - 72px)' },
              overflow: 'hidden',
              borderRadius: '24px 24px 0 0',
              bgcolor: '#fffaf7',
              boxShadow: '0 -12px 32px rgba(50, 35, 25, .18)',
            },
          },
        }}
      >
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
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
                เพิ่มบัญชีแฟรนไชส์
              </Typography>
              <Typography
                sx={{
                  mt: 0.25,
                  color: 'text.secondary',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 14,
                }}
              >
                กำหนดข้อมูลสำหรับเข้าสู่ระบบของผู้ซื้อแฟรนไชส์
              </Typography>
            </Box>
            <Button
              aria-label="ปิด"
              onClick={() => setIsDrawerOpen(false)}
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
              mb: 0,
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
              gap: 2,
              mt: 0,
            }}
          >
            <TextField
              required
              label="ชื่อผู้ซื้อแฟรนไชส์ / บริษัท"
              value={form.name}
              onChange={(event) => updateForm('name', event.target.value)}
              fullWidth
            />
            <TextField
              required
              label="อีเมล"
              type="email"
              value={form.email}
              onChange={(event) => updateForm('email', event.target.value)}
              fullWidth
            />
            <TextField
              required
              label="ชื่อสาขา"
              value={form.branchName}
              onChange={(event) => updateForm('branchName', event.target.value)}
              fullWidth
            />
            <TextField
              required
              label="รหัสสาขา"
              value={form.branchCode}
              onChange={(event) => updateForm('branchCode', event.target.value)}
              fullWidth
            />
            <TextField
              required
              label="ชื่อผู้ใช้สำหรับเข้าใช้ระบบ"
              name="username"
              autoComplete="username"
              value={form.username}
              onChange={(event) => updateForm('username', event.target.value)}
              fullWidth
            />
            <TextField
              required
              label="รหัสผ่านสำหรับเข้าใช้ระบบ"
              type="password"
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => updateForm('password', event.target.value)}
              fullWidth
            />
            <TextField
              required
              select
              label="รูปแบบแฟรนไชส์"
              value={form.plan}
              fullWidth
              onChange={(event) =>
                updateForm('plan', event.target.value as FranchisePlan)
              }
            >
              {(Object.keys(plans) as FranchisePlan[]).map((plan) => (
                <MenuItem key={plan} value={plan}>
                  {plans[plan].title}
                </MenuItem>
              ))}
            </TextField>
            {saveError ? (
              <Typography
                sx={{ gridColumn: { sm: '1 / -1' }, color: 'error.main' }}
              >
                {saveError}
              </Typography>
            ) : null}
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
                onClick={() => setIsDrawerOpen(false)}
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
                type="submit"
                variant="contained"
                disabled={
                  isSaving ||
                  !form.name ||
                  !form.email ||
                  !form.branchName ||
                  !form.branchCode ||
                  !form.username ||
                  form.password.length < 8
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
                {isSaving ? 'กำลังสร้างบัญชี...' : 'สร้างและส่งคำเชิญ'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Drawer>
      <ActionSnackbar
        notice={actionNotice}
        onClose={() => setActionNotice(null)}
      />
    </DashboardMain>
  );
}
