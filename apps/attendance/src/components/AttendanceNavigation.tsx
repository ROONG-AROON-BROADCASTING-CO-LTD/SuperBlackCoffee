import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Box, Button } from '@mui/material';
import {
  ChartLineIcon,
  ClockIcon,
  LayoutGridIcon,
  LogoutIcon,
  ReceiptTextIcon,
} from '@stackbuild/ui';
import type { StaffPage } from '../types/attendance';

export const attendanceNavigation: Array<{
  page: StaffPage;
  label: string;
  mobileLabel: string;
  icon: ReactNode;
  group: string;
}> = [
  {
    page: 'overview',
    label: 'ภาพรวม',
    mobileLabel: 'ภาพรวม',
    icon: <LayoutGridIcon />,
    group: 'ภาพรวม',
  },
  {
    page: 'attendance',
    label: 'เช็กอิน / เช็กเอาต์',
    mobileLabel: 'ลงเวลา',
    icon: <ClockIcon />,
    group: 'ลงเวลางาน',
  },
  {
    page: 'leave',
    label: 'คำขอลา',
    mobileLabel: 'คำขอลา',
    icon: <ReceiptTextIcon />,
    group: 'คำขอและการติดตาม',
  },
  {
    page: 'history',
    label: 'ประวัติการทำงาน',
    mobileLabel: 'ประวัติ',
    icon: <ChartLineIcon />,
    group: 'คำขอและการติดตาม',
  },
];

type NavigationProps = {
  page: StaffPage;
  onPage: (page: StaffPage) => void;
  onLogout: () => void;
};

export function MobileNavigation({ page, onPage, onLogout }: NavigationProps) {
  const [animatedPage, setAnimatedPage] = useState<StaffPage | null>(null);
  const [hasTextInputFocus, setHasTextInputFocus] = useState(false);
  const animationTimerRef = useRef<number | undefined>(undefined);
  const focusTimerRef = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(animationTimerRef.current);
      window.clearTimeout(focusTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const isTextInput = (element: EventTarget | null) =>
      element instanceof HTMLElement &&
      element.matches('input, textarea, select, [contenteditable="true"]');

    const handleFocusIn = (event: FocusEvent) => {
      if (isTextInput(event.target)) setHasTextInputFocus(true);
    };
    const handleFocusOut = () => {
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = window.setTimeout(() => {
        setHasTextInputFocus(isTextInput(document.activeElement));
      });
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--attendance-mobile-nav-height',
      hasTextInputFocus ? '0px' : '82px',
    );
    return () => {
      document.documentElement.style.removeProperty(
        '--attendance-mobile-nav-height',
      );
    };
  }, [hasTextInputFocus]);

  const handlePageClick = (nextPage: StaffPage) => {
    // Reset first so tapping the already-active item can replay its icon.
    setAnimatedPage(null);
    window.requestAnimationFrame(() => setAnimatedPage(nextPage));
    window.clearTimeout(animationTimerRef.current);
    animationTimerRef.current = window.setTimeout(
      () => setAnimatedPage(null),
      900,
    );
    onPage(nextPage);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        display: { xs: hasTextInputFocus ? 'none' : 'grid', md: 'none' },
        gridTemplateColumns: 'repeat(5, 1fr)',
        alignItems: 'center',
        gap: 0.75,
        zIndex: 5,
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: 'calc(82px + env(safe-area-inset-bottom))',
        p: '12px 12px calc(12px + env(safe-area-inset-bottom))',
        bgcolor: '#171411',
        borderTop: '1px solid #372e29',
        boxShadow: '0 -8px 22px rgba(23,20,17,.12)',
      }}
    >
      {attendanceNavigation.map(({ page: itemPage, mobileLabel, icon }) => (
        <Button
          key={itemPage}
          onClick={() => handlePageClick(itemPage)}
          sx={{
            minWidth: 0,
            minHeight: '54px !important',
            p: '4px 6px !important',
            mx: 0.25,
            borderRadius: '12px',
            color: page === itemPage ? '#fffaf6' : '#d9d0ca',
            display: 'grid',
            gridTemplateRows: '28px 1fr',
            gap: 0.5,
            fontSize: 11,
            fontWeight: page === itemPage ? 600 : 400,
            lineHeight: 1.1,
            letterSpacing: 0,
            transition: 'background-color 160ms ease',
            bgcolor:
              page === itemPage ? 'rgba(191,149,118,.22)' : 'transparent',
            '& svg': {
              fontSize: 22,
              color: page === itemPage ? '#e6ba92' : '#d9d0ca',
            },
            '&:hover': {
              bgcolor:
                page === itemPage
                  ? 'rgba(191,149,118,.26)'
                  : 'rgba(255,255,255,.06)',
            },
          }}
        >
          <Box sx={{ display: 'grid', placeItems: 'center' }}>
            {isValidElement(icon)
              ? cloneElement(icon as ReactElement<{ animate?: boolean }>, {
                  animate: animatedPage === itemPage,
                })
              : icon}
          </Box>
          <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
            {mobileLabel}
          </Box>
        </Button>
      ))}
      <Button
        aria-label="ออกจากระบบ"
        onClick={onLogout}
        sx={{
          minWidth: 0,
          minHeight: '54px !important',
          p: '4px 6px !important',
          mx: 0.25,
          borderRadius: '12px',
          color: '#fff',
          display: 'grid',
          gridTemplateRows: '28px 1fr',
          gap: 0.5,
          fontSize: { xs: 10, sm: 11 },
          fontWeight: 600,
          lineHeight: 1.1,
          letterSpacing: 0,
          transition: 'background-color 160ms ease',
          bgcolor: '#d92d2d',
          '& svg': { fontSize: 22, color: '#fff' },
          '&:hover': { bgcolor: '#b42318' },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            placeItems: 'center',
            lineHeight: 0,
            '& > div': { display: 'flex', alignItems: 'center' },
          }}
        >
          <LogoutIcon size={20} />
        </Box>
        <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
          ออก
        </Box>
      </Button>
    </Box>
  );
}
