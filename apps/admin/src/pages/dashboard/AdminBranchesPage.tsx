import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  BRANCH_STATUS_BADGES,
  DashboardMain,
  SearchField,
  type BranchStatus,
} from '@stackbuild/ui';
import { createCompanyBranch, listBranches, updateBranchSize } from '../../api';
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
};
const statusLabel: Record<string, BranchStatus> = {
  active: 'เปิดให้บริการ',
  maintenance: 'ปิดปรับปรุง',
  inactive: 'ปิดทำการ',
};

export function AdminBranchesPage() {
  const [query, setQuery] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [updatingBranchId, setUpdatingBranchId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newBranch, setNewBranch] = useState({
    name: '',
    code: '',
    size: 'S' as Branch['size'],
  });
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
    setIsCreating(true);
    try {
      const created = await createCompanyBranch(newBranch);
      setBranches((current) => [
        {
          ...created,
          size: created.size ?? newBranch.size,
          status: statusLabel[created.status ?? 'active'] ?? 'เปิดให้บริการ',
          sales: 0,
          orders: 0,
        },
        ...current,
      ]);
      setNewBranch({ name: '', code: '', size: 'S' });
      setIsCreateDialogOpen(false);
      setActionNotice({
        message: 'เพิ่มสาขา SBC แล้ว และเตรียมรายการตามขนาดสาขาเรียบร้อย',
      });
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : 'ไม่สามารถเพิ่มสาขาได้',
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
              setIsCreateDialogOpen(true);
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
      {isLoading ? <AdminBranchesSkeleton /> : null}

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
        {visibleBranches.map((branch) => {
          const badge = BRANCH_STATUS_BADGES[branch.status];
          return (
            <Card
              key={branch.id}
              variant="outlined"
              sx={{ borderRadius: '15px', borderColor: '#e8ddd5' }}
            >
              <Box sx={{ p: { xs: 2.25, md: 2.5 } }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 19,
                        fontWeight: 600,
                      }}
                    >
                      {branch.name}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.35,
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
                <Box sx={{ mt: 2, pt: 1.75, borderTop: '1px solid #eee6e0' }}>
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
                      mt: 1.5,
                      width: '100%',
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
                </Box>
              </Box>
            </Card>
          );
        })}
      </Box>
      {!isLoading && !loadError && visibleBranches.length === 0 && (
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
      <Dialog
        open={isCreateDialogOpen}
        onClose={() => !isCreating && setIsCreateDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '18px' } } }}
      >
        <DialogTitle sx={{ fontFamily: 'Kanit, sans-serif', fontWeight: 600 }}>
          เพิ่มสาขา SBC
        </DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          <Typography
            sx={{
              color: 'text.secondary',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 13,
            }}
          >
            ระบบจะคัดลอกเมนูและสต๊อกเริ่มต้นตามขนาดของสาขา
          </Typography>
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
          />
          <TextField
            select
            required
            label="ขนาดสาขา"
            value={newBranch.size}
            onChange={(event) =>
              setNewBranch((current) => ({
                ...current,
                size: event.target.value as Branch['size'],
              }))
            }
          >
            <MenuItem value="S">S — น้ำและสต๊อก</MenuItem>
            <MenuItem value="M">M — น้ำ อาหาร เบเกอรี่ และสต๊อก</MenuItem>
            <MenuItem value="L">L — น้ำ อาหาร เบเกอรี่ และสต๊อก</MenuItem>
          </TextField>
          {createError ? (
            <Typography
              role="alert"
              sx={{
                color: '#a22e2a',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 13,
              }}
            >
              {createError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            disabled={isCreating}
            onClick={() => setIsCreateDialogOpen(false)}
            sx={{ fontFamily: 'Kanit, sans-serif' }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            disabled={
              isCreating || !newBranch.name.trim() || !newBranch.code.trim()
            }
            onClick={() => void createBranch()}
            sx={{
              bgcolor: '#201914',
              fontFamily: 'Kanit, sans-serif',
              '&:hover': { bgcolor: '#3c2d24' },
            }}
          >
            {isCreating ? 'กำลังเพิ่ม...' : 'เพิ่มสาขา'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardMain>
  );
}
