import type { ReactNode } from 'react';
import { Box, Button, Typography } from '@mui/material';
import {
  BoxesIcon,
  HistoryIcon,
  LayoutGridIcon,
  LogoutIcon,
  ReceiptTextIcon,
} from '@stackbuild/ui';
import type { StockPage } from '../types/stock';

const pages: Array<{ page: StockPage; label: string; icon: ReactNode }> = [
  { page: 'overview', label: 'ภาพรวมสต๊อก', icon: <LayoutGridIcon /> },
  { page: 'sales', label: 'บันทึกเมนูที่ขาย', icon: <ReceiptTextIcon /> },
  { page: 'count', label: 'ตรวจนับ / ตัดสต๊อก', icon: <BoxesIcon /> },
  { page: 'history', label: 'ประวัติที่บันทึก', icon: <HistoryIcon /> },
];

export function StockAppLayout({
  page,
  onPage,
  onLogout,
  name,
  branchName,
  children,
}: {
  page: StockPage;
  onPage: (page: StockPage) => void;
  onLogout: () => void;
  name: string;
  branchName: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: '#fbfaf8', display: 'flex' }}>
      <Box
        component="aside"
        sx={{
          display: { xs: 'none', md: 'flex' },
          position: 'fixed',
          inset: '0 auto 0 0',
          width: 230,
          p: 2,
          bgcolor: '#171411',
          color: '#fff',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Box sx={{ px: 1, py: 1.5 }}>
          <Typography sx={{ fontWeight: 800 }}>SUPER BLACK</Typography>
          <Typography sx={{ fontSize: 12 }} color="#d9d0ca">
            STOCK CONTROL
          </Typography>
        </Box>
        {pages.map((item) => (
          <Button
            key={item.page}
            startIcon={item.icon}
            onClick={() => onPage(item.page)}
            sx={{
              justifyContent: 'flex-start',
              color: page === item.page ? '#171411' : '#f4e9e1',
              bgcolor: page === item.page ? '#fbfaf8' : 'transparent',
              borderRadius: 2,
              py: 1.2,
              '&:hover': {
                bgcolor: page === item.page ? '#fff' : 'rgba(255,255,255,.08)',
              },
            }}
          >
            {item.label}
          </Button>
        ))}
        <Box sx={{ flex: 1 }} />
        <Button
          startIcon={<LogoutIcon />}
          onClick={onLogout}
          sx={{
            justifyContent: 'flex-start',
            color: '#fff',
            bgcolor: '#b42318',
            borderRadius: 2,
          }}
        >
          ออกจากระบบ
        </Button>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, ml: { md: '230px' } }}>
        <Box
          component="header"
          sx={{
            height: 72,
            px: { xs: 2, md: 4 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: '#fff',
            borderBottom: '1px solid #eee7e1',
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>
            {pages.find((item) => item.page === page)?.label}
          </Typography>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
              {name}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 12 }}>
              พนักงานสาขา{branchName}
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            maxWidth: 1160,
            mx: 'auto',
            p: { xs: 2, md: 4 },
            pb: { xs: 11, md: 4 },
          }}
        >
          {children}
        </Box>
      </Box>
      <Box
        sx={{
          display: { xs: 'grid', md: 'none' },
          position: 'fixed',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 0.5,
          bottom: 0,
          left: 0,
          right: 0,
          p: 1,
          bgcolor: '#171411',
          zIndex: 5,
        }}
      >
        {pages.map((item) => (
          <Button
            key={item.page}
            onClick={() => onPage(item.page)}
            sx={{
              minWidth: 0,
              fontSize: 10,
              color: page === item.page ? '#fff' : '#d9d0ca',
              bgcolor:
                page === item.page ? 'rgba(191,149,118,.3)' : 'transparent',
            }}
          >
            {item.label.replace('ตรวจนับ / ', '')}
          </Button>
        ))}
        <Button
          onClick={onLogout}
          sx={{ minWidth: 0, color: '#fff', bgcolor: '#b42318' }}
        >
          <LogoutIcon />
        </Button>
      </Box>
    </Box>
  );
}
