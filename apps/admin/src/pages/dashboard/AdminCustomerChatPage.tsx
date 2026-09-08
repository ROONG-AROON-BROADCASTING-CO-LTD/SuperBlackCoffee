import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import {
  DashboardMain,
  SearchIcon,
  SendIcon,
  type SearchIconHandle,
  type SendIconHandle,
} from '@stackbuild/ui';
import { useRef } from 'react';
import { useWebsiteLeads } from '../../hooks/useWebsiteLeads';
import { AdminCustomerChatSkeleton } from '../../components/skeletons/AdminCustomerChatSkeleton';
import { updateWebsiteLeadStatus } from '../../api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActionSnackbar, type ActionNotice } from '@stackbuild/management';

type Customer = {
  id: string;
  name: string;
  initials: string;
  preview: string;
  time: string;
  unread?: number;
  online?: boolean;
};
type Message = {
  id: string;
  body: string;
  time: string;
  from: 'customer' | 'store';
};

const customers: Customer[] = [
  {
    id: 'pim',
    name: 'Pim P.',
    initials: 'PP',
    preview: 'ขอเพิ่มช็อตกาแฟได้ไหมคะ',
    time: '10:24',
    unread: 2,
    online: true,
  },
  {
    id: 'narin',
    name: 'Narin K.',
    initials: 'NK',
    preview: 'รับออเดอร์ที่สาขาอโศกได้เลยครับ',
    time: '10:18',
    online: true,
  },
  {
    id: 'may',
    name: 'May S.',
    initials: 'MS',
    preview: 'ขอบคุณมากค่ะ',
    time: 'เมื่อวาน',
  },
  {
    id: 'beam',
    name: 'BW',
    initials: 'BW',
    preview: 'ใช้สิทธิ์สมาชิกได้ไหมครับ',
    time: 'เมื่อวาน',
  },
  {
    id: 'fah',
    name: 'Fah N.',
    initials: 'FN',
    preview: 'มีเมล็ด House Blend ไหมคะ',
    time: '22 ส.ค.',
  },
  {
    id: 'artit',
    name: 'Artit P.',
    initials: 'AP',
    preview: 'ขอใบเสร็จแบบเต็มได้ไหมครับ',
    time: '22 ส.ค.',
    unread: 1,
  },
  {
    id: 'mew',
    name: 'Mew L.',
    initials: 'ML',
    preview: 'สาขาเอ็มควอเทียร์เปิดกี่โมงคะ',
    time: '21 ส.ค.',
  },
  {
    id: 'tee',
    name: 'Tee P.',
    initials: 'TP',
    preview: 'ขอเปลี่ยนเป็นนมโอ๊ตครับ',
    time: '21 ส.ค.',
  },
  {
    id: 'jane',
    name: 'Jane K.',
    initials: 'JK',
    preview: 'มีโปรสมาชิกวันนี้ไหมคะ',
    time: '20 ส.ค.',
  },
  {
    id: 'oak',
    name: 'Oak J.',
    initials: 'OJ',
    preview: 'รับผ่าน LINE MAN ใช่ไหมครับ',
    time: '20 ส.ค.',
  },
  {
    id: 'nina',
    name: 'Nina C.',
    initials: 'NC',
    preview: 'ขอบคุณสำหรับคำแนะนำนะคะ',
    time: '19 ส.ค.',
  },
  {
    id: 'boss',
    name: 'Boss K.',
    initials: 'BK',
    preview: 'ออเดอร์เสร็จแล้วแจ้งผมได้เลยครับ',
    time: '19 ส.ค.',
  },
  {
    id: 'mild',
    name: 'Mild P.',
    initials: 'MP',
    preview: 'มีที่จอดรถใกล้สาขาไหมคะ',
    time: '18 ส.ค.',
  },
];

const initialMessages: Record<string, Message[]> = {
  pim: [
    {
      id: '1',
      body: 'สวัสดีค่ะ ต้องการสอบถามเมนู Black Orange ค่ะ',
      time: '10:20',
      from: 'customer',
    },
    {
      id: '2',
      body: 'สวัสดีครับ Black Orange มีพร้อมเสิร์ฟครับ',
      time: '10:22',
      from: 'store',
    },
    {
      id: '3',
      body: 'ขอเพิ่มช็อตกาแฟได้ไหมคะ',
      time: '10:24',
      from: 'customer',
    },
  ],
  narin: [
    {
      id: '1',
      body: 'สวัสดีครับ ออเดอร์ลาเต้เย็นพร้อมรับหรือยังครับ',
      time: '10:12',
      from: 'customer',
    },
    {
      id: '2',
      body: 'รับออเดอร์ที่สาขาอโศกได้เลยครับ',
      time: '10:18',
      from: 'store',
    },
  ],
  may: [{ id: '1', body: 'ขอบคุณมากค่ะ', time: 'เมื่อวาน', from: 'customer' }],
  beam: [
    {
      id: '1',
      body: 'ใช้สิทธิ์สมาชิกได้ไหมครับ',
      time: 'เมื่อวาน',
      from: 'customer',
    },
  ],
  fah: [
    {
      id: '1',
      body: 'มีเมล็ด House Blend ไหมคะ',
      time: '22 ส.ค.',
      from: 'customer',
    },
  ],
  artit: [
    {
      id: '1',
      body: 'ขอใบเสร็จแบบเต็มได้ไหมครับ',
      time: '22 ส.ค.',
      from: 'customer',
    },
    {
      id: '2',
      body: 'ได้ครับ รบกวนแจ้งเลขออเดอร์ได้เลยครับ',
      time: '22 ส.ค.',
      from: 'store',
    },
  ],
  mew: [
    {
      id: '1',
      body: 'สาขาเอ็มควอเทียร์เปิดกี่โมงคะ',
      time: '21 ส.ค.',
      from: 'customer',
    },
    {
      id: '2',
      body: 'เปิดทุกวัน 07:00–20:00 น. ครับ',
      time: '21 ส.ค.',
      from: 'store',
    },
  ],
  tee: [
    {
      id: '1',
      body: 'ขอเปลี่ยนเป็นนมโอ๊ตครับ',
      time: '21 ส.ค.',
      from: 'customer',
    },
    {
      id: '2',
      body: 'ได้เลยครับ เพิ่ม 20 บาทนะครับ',
      time: '21 ส.ค.',
      from: 'store',
    },
  ],
  jane: [
    {
      id: '1',
      body: 'มีโปรสมาชิกวันนี้ไหมคะ',
      time: '20 ส.ค.',
      from: 'customer',
    },
    {
      id: '2',
      body: 'มีส่วนลด 10% สำหรับเมนูเครื่องดื่มครับ',
      time: '20 ส.ค.',
      from: 'store',
    },
  ],
  oak: [
    {
      id: '1',
      body: 'รับผ่าน LINE MAN ใช่ไหมครับ',
      time: '20 ส.ค.',
      from: 'customer',
    },
    {
      id: '2',
      body: 'ใช่ครับ สามารถสั่งผ่าน LINE MAN ได้เลยครับ',
      time: '20 ส.ค.',
      from: 'store',
    },
  ],
  nina: [
    {
      id: '1',
      body: 'ขอบคุณสำหรับคำแนะนำนะคะ',
      time: '19 ส.ค.',
      from: 'customer',
    },
    {
      id: '2',
      body: 'ยินดีมากครับ หวังว่าจะถูกใจนะครับ',
      time: '19 ส.ค.',
      from: 'store',
    },
  ],
  boss: [
    {
      id: '1',
      body: 'ออเดอร์เสร็จแล้วแจ้งผมได้เลยครับ',
      time: '19 ส.ค.',
      from: 'customer',
    },
    {
      id: '2',
      body: 'ได้เลยครับ เราจะแจ้งทันทีเมื่อพร้อมรับครับ',
      time: '19 ส.ค.',
      from: 'store',
    },
  ],
  mild: [
    {
      id: '1',
      body: 'มีที่จอดรถใกล้สาขาไหมคะ',
      time: '18 ส.ค.',
      from: 'customer',
    },
    {
      id: '2',
      body: 'มีที่จอดรถของอาคารอยู่ใกล้สาขาครับ',
      time: '18 ส.ค.',
      from: 'store',
    },
  ],
};

export function AdminCustomerChatPage() {
  const searchRef = useRef<SearchIconHandle>(null);
  const sendRef = useRef<SendIconHandle>(null);
  const [query, setQuery] = useState('');
  const [activeCustomerId, setActiveCustomerId] = useState('pim');
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [isCustomerListScrolling, setIsCustomerListScrolling] = useState(false);
  const [isMessagesScrolling, setIsMessagesScrolling] = useState(false);
  const scrollTimeoutsRef = useRef<
    Record<'customers' | 'messages', number | undefined>
  >({ customers: undefined, messages: undefined });
  const {
    data: websiteLeads = [],
    isLoading: isLeadsLoading,
    isError: leadsError,
    refetch: refetchLeads,
  } = useWebsiteLeads();
  const queryClient = useQueryClient();
  const updateLeadStatus = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number;
      status: 'new' | 'contacted' | 'closed';
    }) => updateWebsiteLeadStatus(id, status),
    onSuccess: (_, variables) => {
      setActionNotice({
        message:
          variables.status === 'closed'
            ? 'ปิดลีดแล้ว'
            : 'ทำเครื่องหมายว่าติดต่อแล้ว',
      });
      return queryClient.invalidateQueries({ queryKey: ['website-leads'] });
    },
    onError: (error) =>
      setActionNotice({
        message: error instanceof Error ? error.message : 'อัปเดตลีดไม่สำเร็จ',
        severity: 'error',
      }),
  });
  const leadCustomers: Customer[] = websiteLeads.map((lead) => ({
    id: `lead-${lead.id}`,
    name: lead.name,
    initials: lead.name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    preview: `เว็บไซต์: ${lead.message || `${lead.topic} · ${lead.phone}`}`,
    time: new Date(lead.createdAt).toLocaleDateString('th-TH'),
    unread: lead.status === 'new' ? 1 : undefined,
  }));
  const allCustomers = [...leadCustomers, ...customers];
  const activeCustomer =
    allCustomers.find((customer) => customer.id === activeCustomerId) ??
    allCustomers[0];
  const visibleCustomers = useMemo(
    () =>
      allCustomers.filter((customer) =>
        `${customer.name}${customer.preview}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query, websiteLeads],
  );
  const sendMessage = () => {
    if (activeCustomerId.startsWith('lead-')) return;
    const body = draft.trim();
    if (!body) return;
    setMessages((current) => ({
      ...current,
      [activeCustomerId]: [
        ...(current[activeCustomerId] ?? []),
        { id: crypto.randomUUID(), body, time: 'ตอนนี้', from: 'store' },
      ],
    }));
    setDraft('');
  };
  const revealScrollbar = (target: 'customers' | 'messages') => {
    if (target === 'customers') setIsCustomerListScrolling(true);
    else setIsMessagesScrolling(true);
    window.clearTimeout(scrollTimeoutsRef.current[target]);
    scrollTimeoutsRef.current[target] = window.setTimeout(() => {
      if (target === 'customers') setIsCustomerListScrolling(false);
      else setIsMessagesScrolling(false);
    }, 700);
  };
  useEffect(
    () => () => {
      window.clearTimeout(scrollTimeoutsRef.current.customers);
      window.clearTimeout(scrollTimeoutsRef.current.messages);
    },
    [],
  );

  return (
    <DashboardMain>
      {isLeadsLoading ? <AdminCustomerChatSkeleton /> : null}
      <Card
        variant="outlined"
        sx={{
          display: isLeadsLoading ? 'none' : 'grid',
          gridTemplateColumns: { xs: '1fr', md: '300px minmax(0, 1fr)' },
          height: { xs: 'calc(100dvh - 112px)', md: 'calc(100dvh - 128px)' },
          minHeight: { xs: 520, md: 590 },
          overflow: 'hidden',
          borderRadius: '15px',
          borderColor: '#e8ddd5',
        }}
      >
        <Box
          sx={{
            minHeight: 0,
            borderRight: { md: '1px solid #eee6e0' },
            borderBottom: { xs: '1px solid #eee6e0', md: 0 },
            bgcolor: '#fffaf7',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              boxSizing: 'border-box',
              height: 76,
              p: 1.75,
              borderBottom: '1px solid #eee6e0',
            }}
          >
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => searchRef.current?.startAnimation()}
              onBlur={() => searchRef.current?.stopAnimation()}
              placeholder="ค้นหาลูกค้า"
              size="small"
              name="customer-search"
              autoComplete="off"
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              slotProps={{
                htmlInput: { autoComplete: 'off' },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon ref={searchRef} size={18} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
          <Box
            onScroll={() => revealScrollbar('customers')}
            sx={{
              height: { xs: 260, md: 'calc(100% - 73px)' },
              overflowY: 'auto',
              scrollbarColor: isCustomerListScrolling
                ? '#b89781 transparent'
                : 'transparent transparent',
              scrollbarWidth: 'thin',
              '&::-webkit-scrollbar': { width: 8 },
              '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: isCustomerListScrolling ? '#b89781' : 'transparent',
                borderRadius: 99,
                border: '2px solid #f4e9e2',
                transition: 'background-color .2s ease',
              },
            }}
          >
            {leadsError && (
              <Box sx={{ p: 1.5 }}>
                <Typography color="error" sx={{ fontSize: 12 }}>
                  โหลดข้อความจากเว็บไซต์ไม่สำเร็จ
                </Typography>
                <Button size="small" onClick={() => refetchLeads()}>
                  ลองใหม่
                </Button>
              </Box>
            )}
            {visibleCustomers.map((customer) => (
              <Box
                key={customer.id}
                component="button"
                type="button"
                onClick={() => setActiveCustomerId(customer.id)}
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  p: 1.5,
                  border: 0,
                  borderBottom: '1px solid #f1e9e4',
                  bgcolor:
                    customer.id === activeCustomerId
                      ? '#f4e9e2'
                      : 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit',
                  '&:hover': { bgcolor: '#f8f0eb' },
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    bgcolor: '#805637',
                    color: '#fff',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {customer.initials}
                  {customer.online && (
                    <Box
                      sx={{
                        position: 'absolute',
                        right: 0,
                        bottom: 1,
                        width: 10,
                        height: 10,
                        border: '2px solid #fffaf7',
                        borderRadius: '50%',
                        bgcolor: '#177245',
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Typography
                      noWrap
                      sx={{
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 14,
                        fontWeight:
                          customer.id === activeCustomerId ? 600 : 500,
                      }}
                    >
                      {customer.name}
                    </Typography>
                    <Typography
                      sx={{
                        flexShrink: 0,
                        color: 'text.secondary',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 11,
                      }}
                    >
                      {customer.time}
                    </Typography>
                  </Box>
                  <Typography
                    noWrap
                    sx={{
                      mt: 0.15,
                      color: 'text.secondary',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 12,
                    }}
                  >
                    {customer.preview}
                  </Typography>
                </Box>
                {customer.unread && (
                  <Chip
                    label={customer.unread}
                    size="small"
                    sx={{
                      height: 20,
                      minWidth: 20,
                      bgcolor: '#805637',
                      color: '#fff',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 10,
                    }}
                  />
                )}
              </Box>
            ))}
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            minWidth: 0,
            minHeight: 0,
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              boxSizing: 'border-box',
              height: 76,
              gap: 1.25,
              p: 1.75,
              borderBottom: '1px solid #eee6e0',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                placeItems: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: '#805637',
                color: '#fff',
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {activeCustomer.initials}
            </Box>
            <Box>
              <Typography
                sx={{
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                {activeCustomer.name}
              </Typography>
              <Typography
                sx={{
                  color: activeCustomer.online ? '#177245' : 'text.secondary',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 12,
                }}
              >
                {activeCustomer.online ? 'กำลังใช้งาน' : 'ลูกค้า'}
              </Typography>
            </Box>
          </Box>
          <Box
            onScroll={() => revealScrollbar('messages')}
            sx={{
              display: 'flex',
              flex: 1,
              minHeight: 0,
              flexDirection: 'column',
              gap: 1.25,
              overflowY: 'auto',
              scrollbarColor: isMessagesScrolling
                ? '#b89781 transparent'
                : 'transparent transparent',
              scrollbarWidth: 'thin',
              '&::-webkit-scrollbar': { width: 8 },
              '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: isMessagesScrolling ? '#b89781' : 'transparent',
                borderRadius: 99,
                border: '2px solid #fcf8f5',
                transition: 'background-color .2s ease',
              },
              p: { xs: 1.75, sm: 2.5 },
              bgcolor: '#fcf8f5',
            }}
          >
            {activeCustomerId.startsWith('lead-')
              ? (() => {
                  const lead = websiteLeads.find(
                    (item) => `lead-${item.id}` === activeCustomerId,
                  );
                  return (
                    lead && (
                      <Box sx={{ alignSelf: 'flex-start', maxWidth: '78%' }}>
                        <Box
                          sx={{
                            px: 1.5,
                            py: 1,
                            borderRadius: '14px 14px 14px 3px',
                            bgcolor: '#fff',
                            color: '#3c2d24',
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 14,
                              lineHeight: 1.7,
                            }}
                          >
                            ข้อความจากเว็บไซต์\n\nโทร: {lead.phone}\nอีเมล:{' '}
                            {lead.email || '-'}\nทำเล: {lead.province || '-'}
                            \nรูปแบบ: {lead.plan || '-'}\n\n
                            {lead.message || 'ไม่ได้ระบุข้อความเพิ่มเติม'}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 1,
                              mt: 2,
                            }}
                          >
                            {lead.status !== 'contacted' && (
                              <Button
                                size="small"
                                disabled={updateLeadStatus.isPending}
                                onClick={() =>
                                  updateLeadStatus.mutate({
                                    id: lead.id,
                                    status: 'contacted',
                                  })
                                }
                              >
                                ทำเครื่องหมายว่าติดต่อแล้ว
                              </Button>
                            )}
                            {lead.status !== 'closed' && (
                              <Button
                                size="small"
                                color="success"
                                disabled={updateLeadStatus.isPending}
                                onClick={() =>
                                  updateLeadStatus.mutate({
                                    id: lead.id,
                                    status: 'closed',
                                  })
                                }
                              >
                                ปิดลีด
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    )
                  );
                })()
              : (messages[activeCustomerId] ?? []).map((message) => (
                  <Box
                    key={message.id}
                    sx={{
                      alignSelf:
                        message.from === 'store' ? 'flex-end' : 'flex-start',
                      maxWidth: '78%',
                    }}
                  >
                    <Box
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius:
                          message.from === 'store'
                            ? '14px 14px 3px 14px'
                            : '14px 14px 14px 3px',
                        bgcolor: message.from === 'store' ? '#201914' : '#fff',
                        color: message.from === 'store' ? '#fff' : '#3c2d24',
                        boxShadow:
                          message.from === 'store'
                            ? 'none'
                            : '0 2px 8px rgba(50,35,25,.06)',
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: 'Kanit, sans-serif',
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}
                      >
                        {message.body}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        mt: 0.25,
                        color: 'text.secondary',
                        textAlign: message.from === 'store' ? 'right' : 'left',
                        fontFamily: 'Kanit, sans-serif',
                        fontSize: 10,
                      }}
                    >
                      {message.time}
                    </Typography>
                  </Box>
                ))}
          </Box>
          {activeCustomerId.startsWith('lead-') ? (
            <Box sx={{ p: 1.5, borderTop: '1px solid #eee6e0' }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                ลีดจากเว็บไซต์ยังไม่มีช่องทางรับข้อความกลับ
                กรุณาติดต่อผ่านเบอร์โทรศัพท์หรืออีเมลที่แสดงด้านบน
              </Typography>
            </Box>
          ) : (
            <Box
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
              sx={{
                display: 'flex',
                gap: 1,
                p: 1.5,
                borderTop: '1px solid #eee6e0',
              }}
            >
              <TextField
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="พิมพ์ข้อความถึงลูกค้า"
                size="small"
                name="customer-message"
                autoComplete="off"
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                slotProps={{ htmlInput: { autoComplete: 'off' } }}
              />
              <Button
                type="submit"
                aria-label="ส่งข้อความ"
                variant="contained"
                onMouseEnter={() => sendRef.current?.startAnimation()}
                onMouseLeave={() => sendRef.current?.stopAnimation()}
                sx={{
                  minWidth: 48,
                  width: 48,
                  borderRadius: '10px',
                  bgcolor: '#201914',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
                }}
              >
                <SendIcon ref={sendRef} size={20} />
              </Button>
            </Box>
          )}
        </Box>
      </Card>
      <ActionSnackbar
        notice={actionNotice}
        onClose={() => setActionNotice(null)}
      />
    </DashboardMain>
  );
}
