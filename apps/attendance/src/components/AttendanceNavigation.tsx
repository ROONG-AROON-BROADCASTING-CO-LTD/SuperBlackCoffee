import type { ReactNode } from 'react';
import { Box, Button } from '@mui/material';
import {
  ChartLineIcon,
  ClockIcon,
  LayoutGridIcon,
  ReceiptTextIcon,
} from '@stackbuild/ui';
import type { StaffPage } from '../types/attendance';

export const attendanceNavigation: Array<{
  page: StaffPage;
  label: string;
  icon: ReactNode;
  group: string;
}> = [
  {
    page: 'overview',
    label: 'ภาพรวม',
    icon: <LayoutGridIcon />,
    group: 'ภาพรวม',
  },
  {
    page: 'attendance',
    label: 'เช็กอิน / เช็กเอาต์',
    icon: <ClockIcon />,
    group: 'ลงเวลางาน',
  },
  {
    page: 'leave',
    label: 'คำขอลา',
    icon: <ReceiptTextIcon />,
    group: 'คำขอและการติดตาม',
  },
  {
    page: 'history',
    label: 'ประวัติการทำงาน',
    icon: <ChartLineIcon />,
    group: 'คำขอและการติดตาม',
  },
];

type NavigationProps = {
  page: StaffPage;
  onPage: (page: StaffPage) => void;
};

export function MobileNavigation({ page, onPage }: NavigationProps) {
  return (
    <Box
      sx={{
        position: 'fixed',
        display: { xs: 'grid', md: 'none' },
        gridTemplateColumns: 'repeat(4, 1fr)',
        alignItems: 'center',
        zIndex: 5,
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: 'calc(66px + env(safe-area-inset-bottom))',
        p: '5px 6px env(safe-area-inset-bottom)',
        bgcolor: '#171411',
        borderTop: '1px solid #372e29',
      }}
    >
      {attendanceNavigation.map(({ page: itemPage, label, icon }) => (
        <Button
          key={itemPage}
          onClick={() => onPage(itemPage)}
          sx={{
            minWidth: 0,
            minHeight: 58,
            p: 0.5,
            color: page === itemPage ? '#e6ba92' : '#f7f0eb',
            display: 'grid',
            gap: 0.25,
            fontSize: 10,
            lineHeight: 1.1,
            '& svg': { fontSize: 21 },
          }}
        >
          {icon}
          <span>{label}</span>
        </Button>
      ))}
    </Box>
  );
}
