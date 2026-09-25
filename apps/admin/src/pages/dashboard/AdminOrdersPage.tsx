import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  DashboardMain,
  SearchField,
  formatDate,
  selectionPillSx,
  useMinimumLoading,
} from '@stackbuild/ui';
import {
  ActionSnackbar,
  type ActionNotice,
  type Branch,
} from '@stackbuild/management';
import {
  useStockRequests,
  useUpdateStockRequestStatus,
} from '../../hooks/useStockRequests';
import {
  useExpenseRequests,
  useUpdateExpenseRequestStatus,
} from '../../hooks/useExpenseRequests';
import { listBranches } from '../../api/branches';
import { AdminOrdersSkeleton } from '../../components/skeletons/AdminOrdersSkeleton';
import { useAutoRetry } from '@stackbuild/management';

type RequestStatus =
  | 'pending'
  | 'approved'
  | 'preparing'
  | 'funded'
  | 'purchasing'
  | 'awaiting_documents'
  | 'completed'
  | 'rejected';
type SupplyType = string;
type SupplyItem = { name: string; quantity: string };
type SupplyRequest = {
  id: string;
  branch: Exclude<Branch, 'ทุกสาขา'>;
  source: 'sbc' | 'franchise';
  type: SupplyType;
  items: SupplyItem[];
  requestedAt: string;
  status: RequestStatus;
  kind: 'stock' | 'expense';
  note?: string;
  requester?: string;
  estimatedAmount?: number;
};
export type RequestTab = 'sbc' | 'franchise' | 'expense';
const statuses = [
  'ทั้งหมด',
  'รออนุมัติ',
  'อนุมัติแล้ว',
  'กำลังจัดเตรียม',
  'โอนเงินแล้ว',
  'กำลังจัดซื้อ',
  'รอเอกสาร',
  'จัดเสร็จแล้ว',
  'ปฏิเสธ',
] as const;
const statusLabels: Record<RequestStatus, string> = {
  pending: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  preparing: 'กำลังจัดเตรียม',
  funded: 'โอนเงินแล้ว',
  purchasing: 'กำลังจัดซื้อ',
  awaiting_documents: 'รอเอกสาร',
  completed: 'จัดเสร็จแล้ว',
  rejected: 'ปฏิเสธ',
};
const statusColors: Record<RequestStatus, { main: string; text: string }> = {
  pending: { main: '#805637', text: '#fff' },
  approved: { main: '#556b82', text: '#fff' },
  preparing: { main: '#ca7a16', text: '#fff' },
  funded: { main: '#265f91', text: '#fff' },
  purchasing: { main: '#704c91', text: '#fff' },
  awaiting_documents: { main: '#8c5d24', text: '#fff' },
  completed: { main: '#e8eee9', text: '#3c5b47' },
  rejected: { main: '#f8dddd', text: '#a22e2a' },
};
const nextStatus: Partial<Record<RequestStatus, RequestStatus>> = {
  pending: 'approved',
  approved: 'preparing',
  preparing: 'completed',
};
const actionLabel: Partial<Record<RequestStatus, string>> = {
  pending: 'อนุมัติคำขอ',
  approved: 'เริ่มจัดเตรียม',
  preparing: 'ยืนยันจัดเสร็จ',
};
const expenseNextStatus: Partial<Record<RequestStatus, RequestStatus>> = {
  pending: 'approved',
  approved: 'funded',
  funded: 'purchasing',
  purchasing: 'awaiting_documents',
  awaiting_documents: 'completed',
};
const expenseActionLabel: Partial<Record<RequestStatus, string>> = {
  pending: 'อนุมัติคำขอ',
  approved: 'บันทึกว่าโอนเงินแล้ว',
  funded: 'เริ่มจัดซื้อ',
  purchasing: 'รอเอกสาร',
  awaiting_documents: 'ปิดงาน',
};
const expenseCategoryLabels = {
  maintenance: 'ค่าซ่อมบำรุง',
  office: 'ค่าใช้จ่ายสำนักงาน',
  transport: 'ค่าขนส่งและเดินทาง',
  service: 'ค่าบริการภายนอก',
  other: 'อื่น ๆ',
} as const;

export function AdminOrdersPage({
  activeBranch,
  activeTab: controlledTab,
  onTabChange,
}: {
  activeBranch: Branch;
  activeTab?: RequestTab;
  onTabChange?: (tab: RequestTab) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof statuses)[number]>('ทั้งหมด');
  const [activeTab, setActiveTab] = useState<RequestTab>('sbc');
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const selectedTab = controlledTab ?? activeTab;
  const {
    data: apiRequests = [],
    isLoading: rawLoading,
    error,
  } = useStockRequests();
  const {
    data: apiExpenses = [],
    isLoading: expensesLoading,
    error: expensesError,
  } = useExpenseRequests();
  const isLoading = useMinimumLoading(rawLoading || expensesLoading);
  const updateStatus = useUpdateStockRequestStatus();
  const updateExpenseStatus = useUpdateExpenseRequestStatus();
  const [branches, setBranches] = useState<
    Awaited<ReturnType<typeof listBranches>>
  >([]);
  const [branchLoadError, setBranchLoadError] = useState(false);
  const [branchReloadKey, setBranchReloadKey] = useState(0);
  useAutoRetry(branchLoadError, () => setBranchReloadKey((key) => key + 1));
  useEffect(() => {
    let active = true;
    setBranchLoadError(false);
    void listBranches()
      .then((items) => {
        if (active) setBranches(items);
      })
      .catch(() => {
        if (active) {
          setBranches([]);
          setBranchLoadError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [branchReloadKey]);
  const franchiseBranchIds = useMemo(
    () =>
      new Set(
        branches.flatMap((branch) => (branch.franchiseeId ? [branch.id] : [])),
      ),
    [branches],
  );
  const requestStates = useMemo<SupplyRequest[]>(
    () =>
      apiRequests.map((request) => ({
        id: `REQ-${request.id}`,
        branch: request.branch.name as Exclude<Branch, 'ทุกสาขา'>,
        source:
          request.branch.isFranchise ||
          franchiseBranchIds.has(request.branch.id)
            ? 'franchise'
            : 'sbc',
        type: 'วัตถุดิบ',
        items: request.items.map((item) => ({
          name: item.name,
          quantity: `${item.quantity} ${item.unit}`,
        })),
        requestedAt: formatDate(request.createdAt),
        status: request.status,
        kind: 'stock' as const,
      })),
    [apiRequests, franchiseBranchIds],
  );
  const expenseStates = useMemo<SupplyRequest[]>(
    () =>
      apiExpenses.map((request) => ({
        id: `EXP-${request.id}`,
        branch: request.branch.name as Exclude<Branch, 'ทุกสาขา'>,
        source: 'sbc' as const,
        type: expenseCategoryLabels[request.category],
        items: [
          {
            name: request.title,
            quantity: `${request.estimatedAmount.toLocaleString('th-TH')} บาท`,
          },
        ],
        requestedAt: formatDate(request.createdAt),
        status: request.status,
        kind: 'expense' as const,
        note: request.note,
        requester: request.requestedByName,
        estimatedAmount: request.estimatedAmount,
      })),
    [apiExpenses],
  );
  const visibleRequestStates =
    selectedTab === 'expense' ? expenseStates : requestStates;
  const filteredRequests = useMemo(
    () =>
      visibleRequestStates.filter((request) => {
        const matchesBranch =
          activeBranch === 'ทุกสาขา' || request.branch === activeBranch;
        const matchesStatus =
          filter === 'ทั้งหมด' || statusLabels[request.status] === filter;
        const matchesSource =
          selectedTab === 'expense' || request.source === selectedTab;
        return (
          matchesBranch &&
          matchesStatus &&
          matchesSource &&
          `${request.id}${request.branch}${request.items.map((item) => item.name).join(' ')}`
            .toLowerCase()
            .includes(query.toLowerCase())
        );
      }),
    [activeBranch, selectedTab, filter, query, visibleRequestStates],
  );
  const advanceRequest = async (id: string) => {
    const current = visibleRequestStates.find((request) => request.id === id);
    if (!current) return;
    const next = (current.kind === 'expense' ? expenseNextStatus : nextStatus)[
      current.status
    ] as Exclude<RequestStatus, 'pending'> | undefined;
    if (!next) return;
    try {
      const requestId = Number(
        id.replace(current.kind === 'expense' ? 'EXP-' : 'REQ-', ''),
      );
      if (!Number.isNaN(requestId))
        if (current.kind === 'expense')
          await updateExpenseStatus.mutateAsync({
            id: requestId,
            status: next as
              | 'approved'
              | 'funded'
              | 'purchasing'
              | 'awaiting_documents'
              | 'completed'
              | 'rejected',
          });
        else
          await updateStatus.mutateAsync({
            id: requestId,
            status: next as 'approved' | 'preparing' | 'completed' | 'rejected',
          });
      setActionNotice({ message: 'อัปเดตสถานะคำขอแล้ว' });
    } catch (error) {
      setActionNotice({
        message: error instanceof Error ? error.message : 'อัปเดตคำขอไม่สำเร็จ',
        severity: 'error',
      });
    }
  };
  const rejectRequest = async (id: string) => {
    try {
      const current = visibleRequestStates.find((request) => request.id === id);
      if (!current) return;
      const requestId = Number(
        id.replace(current.kind === 'expense' ? 'EXP-' : 'REQ-', ''),
      );
      if (!Number.isNaN(requestId))
        if (current.kind === 'expense')
          await updateExpenseStatus.mutateAsync({
            id: requestId,
            status: 'rejected',
          });
        else
          await updateStatus.mutateAsync({ id: requestId, status: 'rejected' });
      setActionNotice({ message: 'ปฏิเสธคำขอแล้ว' });
    } catch (error) {
      setActionNotice({
        message: error instanceof Error ? error.message : 'ปฏิเสธคำขอไม่สำเร็จ',
        severity: 'error',
      });
    }
  };
  const tabCounts = useMemo(
    () => ({
      sbc: requestStates.filter(
        (request) => request.source === 'sbc' && request.status === 'pending',
      ).length,
      franchise: requestStates.filter(
        (request) =>
          request.source === 'franchise' && request.status === 'pending',
      ).length,
      expense: expenseStates.filter((request) => request.status === 'pending')
        .length,
    }),
    [requestStates, expenseStates],
  );
  const changeTab = (tab: RequestTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <DashboardMain>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          justifyContent: 'space-between',
          alignItems: { lg: 'center' },
          gap: 1.5,
          mb: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: '#3c2d24',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            {selectedTab === 'expense'
              ? 'คำขอเบิกค่าใช้จ่ายภายนอก'
              : selectedTab === 'franchise'
                ? 'คำสั่งซื้อแฟรนไชส์และคำขอจัดส่ง'
                : 'คำสั่งซื้อและคำขอจัดส่ง'}
          </Typography>
          <Typography
            sx={{
              color: 'text.secondary',
              fontFamily: 'Kanit, sans-serif',
              fontSize: 13,
            }}
          >
            {selectedTab === 'expense'
              ? 'คำขอจาก App Stock ที่ไม่ได้ตัดหรือเพิ่มยอดสต็อก'
              : 'แยกการดำเนินการระหว่างสาขา SBC และแฟรนไชส์ให้ชัดเจน'}
          </Typography>
        </Box>
        <SearchField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ค้นหาเลขคำขอ สาขา หรือรายการ"
          size="small"
          sx={{ width: { xs: '100%', lg: 310 } }}
        />
      </Box>
      <Box
        role="tablist"
        aria-label="ประเภทคำสั่งซื้อ"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1.5,
          mb: 2,
        }}
      >
        <Box
          sx={{ display: 'flex', gap: 2.25, overflowX: 'auto', py: 1, pr: 2 }}
        >
          {(
            [
              ['sbc', 'คำสั่งซื้อสาขา SBC'],
              ['franchise', 'คำขอวัตถุดิบจากแฟรนไชส์'],
              ['expense', 'คำขอค่าใช้จ่ายภายนอก'],
            ] as const
          ).map(([tab, label]) => (
            <Button
              key={tab}
              role="tab"
              aria-label={`${label} · ${tabCounts[tab]}`}
              aria-selected={selectedTab === tab}
              onClick={() => {
                changeTab(tab);
                setFilter('ทั้งหมด');
              }}
              variant={selectedTab === tab ? 'contained' : 'outlined'}
              sx={{
                ...selectionPillSx(selectedTab === tab),
                flexShrink: 0,
                position: 'relative',
                zIndex: selectedTab === tab ? 2 : 1,
                overflow: 'visible',
              }}
            >
              {label}
              {tabCounts[tab] > 0 ? (
                <Box
                  component="span"
                  aria-hidden="true"
                  sx={{
                    position: 'absolute',
                    top: -7,
                    right: -7,
                    display: 'grid',
                    placeItems: 'center',
                    minWidth: 24,
                    height: 24,
                    px: 0.5,
                    borderRadius: 99,
                    bgcolor: '#df292d',
                    color: '#fff',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 12,
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  {tabCounts[tab]}
                </Box>
              ) : null}
            </Button>
          ))}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Divider
            orientation="vertical"
            flexItem
            sx={{
              display: { xs: 'none', sm: 'block' },
              borderColor: '#dfd2c8',
            }}
          />
          <TextField
            select
            label="สถานะ"
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as (typeof statuses)[number])
            }
            size="small"
            sx={{
              width: { xs: '100%', sm: 220 },
              '& .MuiOutlinedInput-root': { borderRadius: '12px' },
              '& .MuiInputLabel-root, & .MuiSelect-select': {
                fontFamily: 'Kanit, sans-serif',
              },
            }}
          >
            {statuses.map((item) => (
              <MenuItem
                key={item}
                value={item}
                sx={{ fontFamily: 'Kanit, sans-serif' }}
              >
                {item}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>
      <Divider
        sx={{
          mb: 2,
          mx: { xs: -2, md: -5 },
          borderColor: '#e8ddd5',
        }}
      />
      {(error || expensesError) && (
        <Card
          variant="outlined"
          role="alert"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            p: 2,
            borderRadius: '15px',
            borderColor: '#edc7c3',
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
            โหลดคำขอไม่สำเร็จ
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
            กำลังลองเชื่อมต่อใหม่อัตโนมัติ
          </Typography>
        </Card>
      )}
      {branchLoadError ? (
        <Box
          role="alert"
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: '#fff0ee',
            color: '#a22e2a',
          }}
        >
          โหลดรายชื่อสาขาไม่สำเร็จ · กำลังลองเชื่อมต่อใหม่อัตโนมัติ
        </Box>
      ) : null}
      {isLoading && <AdminOrdersSkeleton />}
      <Box
        sx={{
          display: isLoading || error || expensesError ? 'none' : 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(3, minmax(0, 1fr))',
          },
          gap: '16px',
        }}
      >
        {!isLoading &&
          filteredRequests.map((request) => {
            const color = statusColors[request.status];
            const canAdvance = Boolean(
              (request.kind === 'expense' ? expenseNextStatus : nextStatus)[
                request.status
              ],
            );
            return (
              <Card
                key={request.id}
                variant="outlined"
                sx={{ borderRadius: '15px', borderColor: '#e8ddd5' }}
              >
                <Box sx={{ p: 2.5 }}>
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
                          color: '#3c2d24',
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 19,
                          fontWeight: 600,
                        }}
                      >
                        {request.kind === 'expense'
                          ? 'ค่าใช้จ่ายภายนอก'
                          : request.source === 'sbc'
                            ? 'สาขา SBC'
                            : 'แฟรนไชส์'}{' '}
                        · {request.branch}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.15,
                          color: 'text.secondary',
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 12,
                        }}
                      >
                        {request.id}
                      </Typography>
                    </Box>
                    <Chip
                      label={statusLabels[request.status]}
                      size="small"
                      sx={{
                        height: 25,
                        borderRadius: '12px',
                        bgcolor: color.main,
                        color: color.text,
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 11,
                      }}
                    />
                  </Box>
                  <Chip
                    label={request.type}
                    size="small"
                    variant="outlined"
                    sx={{
                      mt: 1.5,
                      height: 24,
                      borderRadius: '9px',
                      borderColor:
                        request.type === 'วัตถุดิบ' ? '#b8a296' : '#a8b6c1',
                      color:
                        request.type === 'วัตถุดิบ' ? '#805637' : '#276a9c',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 11,
                    }}
                  />
                  <Box
                    sx={{
                      mt: 1.5,
                      p: 1.25,
                      borderRadius: '10px',
                      bgcolor: '#f8f0eb',
                      border: '1px solid #eadbd2',
                    }}
                  >
                    <Typography
                      sx={{
                        mb: 0.75,
                        color: '#5f4030',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {request.kind === 'expense'
                        ? 'รายละเอียดคำขอ'
                        : request.source === 'sbc'
                          ? 'รายการสั่งซื้อ'
                          : 'รายการที่ขอ'}{' '}
                      <Box
                        component="span"
                        sx={{ color: '#8a6b58', fontWeight: 500 }}
                      >
                        · {request.items.length} รายการ
                      </Box>
                    </Typography>
                    {request.items.map((item) => (
                      <Box
                        key={item.name}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                          py: 0.5,
                          '& + &': { borderTop: '1px solid #eadbd2' },
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: 'Kanit, sans-serif',
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        >
                          {item.name}
                        </Typography>
                        <Typography
                          sx={{
                            flexShrink: 0,
                            color: '#805637',
                            fontFamily: 'Kanit, sans-serif',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {item.quantity}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  {request.note ? (
                    <Typography
                      sx={{ mt: 1.25, color: 'text.secondary', fontSize: 12 }}
                    >
                      {request.note}
                    </Typography>
                  ) : null}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      mt: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        color: 'text.secondary',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 12,
                      }}
                    >
                      {request.requestedAt}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                      {canAdvance ? (
                        <Button
                          onClick={() => advanceRequest(request.id)}
                          variant="contained"
                          size="small"
                          sx={{
                            minHeight: 34,
                            borderRadius: '10px',
                            bgcolor: '#201914',
                            fontFamily: 'Kanit, sans-serif',
                            fontSize: 12,
                            boxShadow: 'none',
                            '&:hover': {
                              bgcolor: '#3c2d24',
                              boxShadow: 'none',
                            },
                          }}
                        >
                          {request.kind === 'expense'
                            ? expenseActionLabel[request.status]
                            : actionLabel[request.status]}
                        </Button>
                      ) : null}
                      {request.status === 'pending' ||
                      (request.kind === 'expense' &&
                        request.status === 'approved') ? (
                        <Button
                          onClick={() => rejectRequest(request.id)}
                          color="error"
                          variant="outlined"
                          size="small"
                          sx={{
                            minHeight: 34,
                            borderRadius: '10px',
                            fontFamily: 'Kanit, sans-serif',
                            fontSize: 12,
                          }}
                        >
                          ปฏิเสธ
                        </Button>
                      ) : null}
                    </Box>
                  </Box>
                </Box>
              </Card>
            );
          })}
      </Box>
      {filteredRequests.length === 0 && (
        <Typography
          sx={{
            pt: 4,
            textAlign: 'center',
            color: 'text.secondary',
            fontFamily: 'Kanit, sans-serif',
          }}
        >
          {selectedTab === 'expense'
            ? 'ยังไม่มีคำขอค่าใช้จ่ายภายนอก'
            : selectedTab === 'sbc'
              ? 'ไม่พบคำสั่งซื้อจากสาขา SBC ที่ค้นหา'
              : 'ไม่พบคำขอวัตถุดิบจากแฟรนไชส์ที่ค้นหา'}
        </Typography>
      )}
      <ActionSnackbar
        notice={actionNotice}
        onClose={() => setActionNotice(null)}
      />
    </DashboardMain>
  );
}
