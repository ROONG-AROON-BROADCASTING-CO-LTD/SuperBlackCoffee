import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  DashboardDrawerHeader,
  DashboardFormDrawer,
  DashboardMain,
  DateField,
  DrawerActionBar,
  FilterPill,
  PlusIcon,
} from '@stackbuild/ui';
import {
  createPromotion,
  deletePromotion,
  listPromotionBranches,
  listPromotionMenus,
  listPromotions,
  updatePromotion,
  type BranchOption,
  type Promotion,
  type PromotionInput,
  type PromotionMenu,
  type PromotionStatus,
} from '../api/promotions';
import { imagePlaceholderImage } from '../assets/index';

type PageMode = 'admin' | 'franchise' | 'stock';
type Draft = {
  name: string;
  type: string;
  benefit: string;
  status: PromotionStatus;
  imageUrl: string;
  channels: string;
  eligibility: string;
  startsOn: string;
  endsOn: string;
  terms: string;
  branchIds: number[];
  menuItemIds: number[];
};
const blankDraft = (): Draft => ({
  name: '',
  type: 'ส่วนลด',
  benefit: '',
  status: 'draft',
  imageUrl: '',
  channels: 'หน้าร้าน',
  eligibility: '',
  startsOn: '',
  endsOn: '',
  terms: '',
  branchIds: [],
  menuItemIds: [],
});
const labels: Record<PromotionStatus, string> = {
  draft: 'ฉบับร่าง',
  active: 'กำลังใช้งาน',
  paused: 'พักใช้งาน',
  expired: 'สิ้นสุดแล้ว',
};
const tones: Record<PromotionStatus, { background: string; color: string }> = {
  draft: { background: '#eef1f4', color: '#55616d' },
  active: { background: '#e5f5eb', color: '#1c7b47' },
  paused: { background: '#fff5df', color: '#9a5a10' },
  expired: { background: '#f7e8e7', color: '#b42318' },
};
const items = (value: string) =>
  value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
const dateLabel = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(`${value}T00:00:00`))
    : 'ไม่กำหนด';
const periodLabel = (promotion: Promotion) =>
  promotion.startsOn || promotion.endsOn
    ? `${dateLabel(promotion.startsOn)} – ${dateLabel(promotion.endsOn)}`
    : 'ไม่มีวันเริ่มหรือสิ้นสุด';
const statusChip = (status: PromotionStatus) => (
  <Chip
    size="small"
    label={labels[status]}
    sx={{
      bgcolor: tones[status].background,
      color: tones[status].color,
      fontWeight: 700,
    }}
  />
);

function asInput(draft: Draft): PromotionInput {
  return {
    name: draft.name.trim(),
    type: draft.type,
    benefit: draft.benefit.trim(),
    status: draft.status,
    imageUrl: draft.imageUrl.trim(),
    channels: items(draft.channels),
    eligibility: draft.eligibility.trim(),
    startsOn: draft.startsOn || null,
    endsOn: draft.endsOn || null,
    terms: items(draft.terms),
    branchIds: draft.branchIds,
    menuItemIds: draft.menuItemIds,
  };
}
function fromPromotion(promotion: Promotion): Draft {
  return {
    name: promotion.name,
    type: promotion.type,
    benefit: promotion.benefit,
    status: promotion.status,
    imageUrl: promotion.imageUrl,
    channels: promotion.channels.join(', '),
    eligibility: promotion.eligibility,
    startsOn: promotion.startsOn ?? '',
    endsOn: promotion.endsOn ?? '',
    terms: promotion.terms.join('\n'),
    branchIds: promotion.branches.map((branch) => branch.id),
    menuItemIds: promotion.menuItems.map((menu) => menu.id),
  };
}

function PromotionCard({
  promotion,
  onSelect,
}: {
  promotion: Promotion;
  onSelect: () => void;
}) {
  const menu = promotion.menuItems[0];
  const image = promotion.imageUrl || menu?.imageUrl;
  return (
    <Card
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 3,
        borderColor: '#e8ddd5',
      }}
    >
      <Box
        sx={{ position: 'relative', aspectRatio: '1/.68', bgcolor: '#f7eee8' }}
      >
        <Box
          component="img"
          src={image || imagePlaceholderImage}
          alt={promotion.name}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: image ? 'cover' : 'contain',
            p: image ? 0 : '28%',
            boxSizing: 'border-box',
          }}
        />
        <Stack
          direction="row"
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Chip
            label={promotion.type}
            size="small"
            sx={{ bgcolor: '#805637', color: '#fff', fontWeight: 700 }}
          />
          {statusChip(promotion.status)}
        </Stack>
      </Box>
      <Stack spacing={1} sx={{ p: 2, flex: 1 }}>
        <Box>
          <Typography noWrap sx={{ fontWeight: 700 }}>
            {promotion.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {promotion.menuItems.map((item) => item.name).join(' · ') ||
              'ยังไม่ได้เลือกเมนู'}
          </Typography>
        </Box>
        <Typography sx={{ color: '#805637', fontWeight: 700, fontSize: 18 }}>
          {promotion.benefit}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {periodLabel(promotion)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {promotion.branches.length
            ? promotion.branches.map((branch) => branch.name).join(', ')
            : 'ทุกสาขา'}
        </Typography>
        <Button
          fullWidth
          variant="outlined"
          onClick={onSelect}
          sx={{ mt: 'auto', borderColor: '#d8c8bd', color: '#5f4030' }}
        >
          จัดการโปรโมชั่น
        </Button>
      </Stack>
    </Card>
  );
}

function Editor({
  open,
  editing,
  draft,
  setDraft,
  branches,
  menus,
  menuBranchCode,
  setMenuBranchCode,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: Promotion | null;
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft>>;
  branches: BranchOption[];
  menus: PromotionMenu[];
  menuBranchCode: string;
  setMenuBranchCode: (value: string) => void;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const valid = Boolean(
    draft.name.trim() &&
    draft.benefit.trim() &&
    draft.menuItemIds.length &&
    (!draft.endsOn || !draft.startsOn || draft.endsOn >= draft.startsOn),
  );
  return (
    <DashboardFormDrawer open={open} onClose={onClose}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: { xs: 2.5, sm: 4 }, pt: 1.5 }}>
          <DashboardDrawerHeader
            title={editing ? 'แก้ไขโปรโมชั่น' : 'เพิ่มโปรโมชั่น'}
            description="ทุกค่าแก้ไขได้และบันทึกลงระบบจริง"
            closeLabel="ปิดฟอร์มโปรโมชั่น"
            onClose={onClose}
          />
        </Box>
        <Box
          sx={{ overflowY: 'auto', px: { xs: 2.5, sm: 4 }, py: 2.5, flex: 1 }}
        >
          <Stack spacing={2}>
            <TextField
              required
              label="ชื่อโปรโมชั่น"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                required
                label="ประเภทโปรโมชั่น"
                value={draft.type}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
                fullWidth
                helperText="ตั้งชื่อประเภทให้ตรงกับแคมเปญได้อย่างอิสระ"
              />
              <TextField
                select
                label="สถานะ"
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as PromotionStatus,
                  }))
                }
                fullWidth
              >
                {(Object.keys(labels) as PromotionStatus[]).map((status) => (
                  <MenuItem key={status} value={status}>
                    {labels[status]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              required
              multiline
              minRows={2}
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
              label="URL รูปโปรโมชั่น"
              value={draft.imageUrl}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  imageUrl: event.target.value,
                }))
              }
              fullWidth
              helperText="เว้นว่างไว้เพื่อใช้รูปของเมนู"
            />
            <TextField
              select
              label="เลือกเมนูจากสาขา"
              value={menuBranchCode}
              onChange={(event) => {
                setMenuBranchCode(event.target.value);
                setDraft((current) => ({ ...current, menuItemIds: [] }));
              }}
              fullWidth
            >
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.code}>
                  {branch.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              slotProps={{ select: { multiple: true } }}
              required
              label="เมนูที่ร่วมโปรโมชั่น"
              value={draft.menuItemIds}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  menuItemIds: event.target.value as unknown as number[],
                }))
              }
              fullWidth
            >
              {menus.map((menu) => (
                <MenuItem key={menu.id} value={menu.id}>
                  {menu.name} · {menu.price.toLocaleString('th-TH')} บาท
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              slotProps={{ select: { multiple: true } }}
              label="สาขาที่เข้าร่วม"
              value={draft.branchIds}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  branchIds: event.target.value as unknown as number[],
                }))
              }
              fullWidth
              helperText="ไม่เลือกสาขา หมายถึงใช้ได้ทุกสาขา"
            >
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="ช่องทางที่ใช้ได้"
              value={draft.channels}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  channels: event.target.value,
                }))
              }
              fullWidth
              helperText="คั่นด้วย , เช่น หน้าร้าน, LINE MAN"
            />
            <TextField
              label="สิทธิ์ผู้ใช้ / กลุ่มลูกค้า"
              value={draft.eligibility}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  eligibility: event.target.value,
                }))
              }
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <DateField
                label="เริ่มแคมเปญ"
                value={draft.startsOn}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    startsOn: event.target.value,
                  }))
                }
              />
              <DateField
                label="สิ้นสุดแคมเปญ"
                value={draft.endsOn}
                min={draft.startsOn || undefined}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    endsOn: event.target.value,
                  }))
                }
              />
            </Stack>
            <TextField
              multiline
              minRows={3}
              label="เงื่อนไขเพิ่มเติม"
              value={draft.terms}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  terms: event.target.value,
                }))
              }
              fullWidth
              helperText="หนึ่งเงื่อนไขต่อหนึ่งบรรทัด"
            />
          </Stack>
        </Box>
        <DrawerActionBar>
          <Button variant="outlined" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            disabled={!valid || saving}
            onClick={onSave}
            sx={{ bgcolor: '#3c2d24' }}
          >
            {saving ? 'กำลังบันทึก…' : 'บันทึกโปรโมชั่น'}
          </Button>
        </DrawerActionBar>
      </Box>
    </DashboardFormDrawer>
  );
}

export function PromotionsManagementPage({
  mode,
  branchName = 'สาขาของคุณ',
  embedded = false,
}: {
  mode: PageMode;
  branchName?: string;
  embedded?: boolean;
}) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [menus, setMenus] = useState<PromotionMenu[]>([]);
  const [menuBranchCode, setMenuBranchCode] = useState('');
  const [filter, setFilter] = useState<'all' | PromotionStatus>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Promotion | null>(null);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canWrite = mode !== 'franchise';
  const sessionRole = mode === 'franchise' ? 'franchise_owner' : mode;
  useEffect(() => {
    let active = true;
    void Promise.all([
      listPromotions(sessionRole),
      listPromotionBranches(sessionRole),
    ])
      .then(([nextPromotions, nextBranches]) => {
        if (!active) return;
        setPromotions(nextPromotions);
        setBranches(nextBranches);
        setMenuBranchCode(nextBranches[0]?.code ?? '');
      })
      .catch(
        (reason) =>
          active &&
          setError(
            reason instanceof Error
              ? reason.message
              : 'ไม่สามารถโหลดโปรโมชั่นได้',
          ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [sessionRole]);
  useEffect(() => {
    if (!menuBranchCode) {
      setMenus([]);
      return;
    }
    let active = true;
    void listPromotionMenus(menuBranchCode, sessionRole)
      .then((nextMenus) => active && setMenus(nextMenus))
      .catch(
        (reason) =>
          active &&
          setError(
            reason instanceof Error ? reason.message : 'ไม่สามารถโหลดเมนูได้',
          ),
      );
    return () => {
      active = false;
    };
  }, [menuBranchCode, sessionRole]);
  const visible = useMemo(
    () =>
      promotions.filter((promotion) => {
        const needle = query.trim().toLocaleLowerCase('th-TH');
        return (
          (filter === 'all' || promotion.status === filter) &&
          (!needle ||
            promotion.name.toLocaleLowerCase('th-TH').includes(needle) ||
            promotion.menuItems.some((menu) =>
              menu.name.toLocaleLowerCase('th-TH').includes(needle),
            ))
        );
      }),
    [filter, promotions, query],
  );
  const counts = useMemo(
    () =>
      promotions.reduce(
        (result, promotion) => ({
          ...result,
          [promotion.status]: result[promotion.status] + 1,
        }),
        { draft: 0, active: 0, paused: 0, expired: 0 } as Record<
          PromotionStatus,
          number
        >,
      ),
    [promotions],
  );
  const closeEditor = () => {
    setCreating(false);
    setEditing(null);
    setDraft(blankDraft());
  };
  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const next = editing
        ? await updatePromotion(editing.id, asInput(draft), sessionRole)
        : await createPromotion(asInput(draft), sessionRole);
      setPromotions((current) =>
        editing
          ? current.map((item) => (item.id === next.id ? next : item))
          : [next, ...current],
      );
      closeEditor();
      setSelected(next);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'ไม่สามารถบันทึกโปรโมชั่นได้',
      );
    } finally {
      setSaving(false);
    }
  };
  const remove = async (promotion: Promotion) => {
    if (!window.confirm(`ลบโปรโมชั่น “${promotion.name}” หรือไม่?`)) return;
    setSaving(true);
    try {
      await deletePromotion(promotion.id, sessionRole);
      setPromotions((current) =>
        current.filter((item) => item.id !== promotion.id),
      );
      setSelected(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'ไม่สามารถลบโปรโมชั่นได้',
      );
    } finally {
      setSaving(false);
    }
  };
  const content = (
    <>
      <Stack spacing={2.25} sx={{ pb: 3 }}>
        <Box>
          {mode === 'franchise' && (
            <Typography
              sx={{ color: '#805637', fontSize: 13, fontWeight: 700 }}
            >
              สาขา{branchName}
            </Typography>
          )}
          <Typography sx={{ color: '#3c2d24', fontSize: 20, fontWeight: 700 }}>
            โปรโมชั่น
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ข้อมูลจริงจากระบบ — สร้าง แก้ไข หยุดใช้ หรือลบได้ตามแคมเปญ
          </Typography>
        </Box>
        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          sx={{ justifyContent: 'space-between' }}
        >
          <TextField
            size="small"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อโปรโมชั่นหรือเมนู"
            slotProps={{ htmlInput: { 'aria-label': 'ค้นหาโปรโมชั่น' } }}
            sx={{ width: { xs: '100%', sm: 300 } }}
          />
          {canWrite && (
            <Button
              variant="contained"
              startIcon={<PlusIcon size={17} />}
              onClick={() => {
                setDraft(blankDraft());
                setEditing(null);
                setCreating(true);
              }}
              sx={{ bgcolor: '#3c2d24', '&:hover': { bgcolor: '#201914' } }}
            >
              เพิ่มโปรโมชั่น
            </Button>
          )}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto' }}>
          {(
            [
              ['all', 'ทั้งหมด', promotions.length],
              ['draft', 'ฉบับร่าง', counts.draft],
              ['active', 'กำลังใช้งาน', counts.active],
              ['paused', 'พักใช้งาน', counts.paused],
              ['expired', 'สิ้นสุดแล้ว', counts.expired],
            ] as const
          ).map(([value, label, count]) => (
            <FilterPill
              key={value}
              selected={filter === value}
              onClick={() => setFilter(value)}
              count={count}
            >
              {label}
            </FilterPill>
          ))}
        </Stack>
        {loading ? (
          <Stack sx={{ py: 8, alignItems: 'center' }}>
            <CircularProgress size={28} />
          </Stack>
        ) : visible.length ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2,minmax(0,1fr))',
                lg: embedded
                  ? 'repeat(5,minmax(0,1fr))'
                  : 'repeat(4,minmax(0,1fr))',
              },
              gap: 2,
            }}
          >
            {visible.map((promotion) => (
              <PromotionCard
                key={promotion.id}
                promotion={promotion}
                onSelect={() => setSelected(promotion)}
              />
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              py: 8,
              textAlign: 'center',
              border: '1px dashed #dfd2c9',
              borderRadius: 3,
            }}
          >
            <Typography color="text.secondary">
              ยังไม่มีโปรโมชั่นตามเงื่อนไขนี้
            </Typography>
          </Box>
        )}
      </Stack>
      <DashboardFormDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
            <DashboardDrawerHeader
              title="รายละเอียดโปรโมชั่น"
              closeLabel="ปิดรายละเอียดโปรโมชั่น"
              onClose={() => setSelected(null)}
            />
            <Stack spacing={2} sx={{ mt: 3 }}>
              <Box
                component="img"
                src={
                  selected.imageUrl ||
                  selected.menuItems[0]?.imageUrl ||
                  imagePlaceholderImage
                }
                alt={selected.name}
                sx={{
                  width: '100%',
                  maxHeight: 260,
                  objectFit: 'cover',
                  borderRadius: 3,
                  bgcolor: '#f7eee8',
                }}
              />
              <Stack direction="row" spacing={1}>
                {statusChip(selected.status)}
                <Chip label={selected.type} size="small" />
              </Stack>
              <Box>
                <Typography variant="h6">{selected.name}</Typography>
                <Typography sx={{ color: '#805637', fontWeight: 700 }}>
                  {selected.benefit}
                </Typography>
              </Box>
              <Divider />
              <Typography variant="body2">
                <b>เมนู:</b>{' '}
                {selected.menuItems.map((menu) => menu.name).join(', ')}
              </Typography>
              <Typography variant="body2">
                <b>สาขา:</b>{' '}
                {selected.branches.length
                  ? selected.branches.map((branch) => branch.name).join(', ')
                  : 'ทุกสาขา'}
              </Typography>
              <Typography variant="body2">
                <b>ช่องทาง:</b> {selected.channels.join(', ')}
              </Typography>
              <Typography variant="body2">
                <b>สิทธิ์:</b> {selected.eligibility || 'ไม่กำหนด'}
              </Typography>
              <Typography variant="body2">
                <b>ช่วงเวลา:</b> {periodLabel(selected)}
              </Typography>
              {selected.terms.length > 0 && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    เงื่อนไข
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {selected.terms.map((term) => (
                      <li key={term}>
                        <Typography variant="body2">{term}</Typography>
                      </li>
                    ))}
                  </Box>
                </Box>
              )}
              {canWrite && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'flex-end' }}
                >
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={saving}
                    onClick={() => void remove(selected)}
                  >
                    ลบ
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => {
                      setDraft(fromPromotion(selected));
                      setEditing(selected);
                      setSelected(null);
                    }}
                    sx={{ bgcolor: '#3c2d24' }}
                  >
                    แก้ไข
                  </Button>
                </Stack>
              )}
            </Stack>
          </Box>
        )}
      </DashboardFormDrawer>
      {canWrite && (creating || editing !== null) && (
        <Editor
          open
          editing={editing}
          draft={draft}
          setDraft={setDraft}
          branches={branches}
          menus={menus}
          menuBranchCode={menuBranchCode}
          setMenuBranchCode={setMenuBranchCode}
          saving={saving}
          onClose={closeEditor}
          onSave={() => void save()}
        />
      )}
    </>
  );
  return embedded ? content : <DashboardMain>{content}</DashboardMain>;
}
