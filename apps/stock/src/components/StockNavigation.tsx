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
  BoxesIcon,
  CartIcon,
  HistoryIcon,
  LogoutIcon,
  ReceiptTextIcon,
} from '@stackbuild/ui';
import type { StockPage } from '../types/stock';

export const stockNavigation: Array<{
  page: StockPage;
  label: string;
  mobileLabel: string;
  icon: ReactNode;
  group: string;
}> = [
  {
    page: 'sales',
    label: 'บันทึกเมนูที่ขาย',
    mobileLabel: 'บันทึกขาย',
    icon: <ReceiptTextIcon />,
    group: 'บันทึกการขาย',
  },
  {
    page: 'count',
    label: 'ตรวจนับ / ตัดสต๊อก',
    mobileLabel: 'ตัดสต๊อก',
    icon: <BoxesIcon />,
    group: 'จัดการสต๊อก',
  },
  {
    page: 'history',
    label: 'ประวัติที่บันทึก',
    mobileLabel: 'ประวัติ',
    icon: <HistoryIcon />,
    group: 'จัดการสต๊อก',
  },
];

type StockNavigationProps = {
  page: StockPage;
  onPage: (page: StockPage) => void;
  onLogout: () => void;
  cartItemCount: number;
  cartOpen: boolean;
  onToggleCart: () => void;
};

export function StockMobileNavigation({
  page,
  onPage,
  onLogout,
  cartItemCount,
  cartOpen,
  onToggleCart,
}: StockNavigationProps) {
  const [animatedPage, setAnimatedPage] = useState<StockPage | null>(null);
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
      '--stock-mobile-nav-height',
      hasTextInputFocus ? '0px' : '82px',
    );
    return () => {
      document.documentElement.style.removeProperty(
        '--stock-mobile-nav-height',
      );
    };
  }, [hasTextInputFocus]);

  const handlePageClick = (nextPage: StockPage) => {
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
        // Keep the navigation visible above the cart Drawer and its backdrop.
        // The cart sheet itself stops immediately above this bar.
        zIndex: (theme) => theme.zIndex.modal + 1,
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: 'calc(82px + env(safe-area-inset-bottom))',
        p: '12px 12px calc(12px + env(safe-area-inset-bottom))',
        bgcolor: '#171411',
        borderTop: '1px solid #372e29',
      }}
    >
      {stockNavigation.map(({ page: itemPage, mobileLabel, icon }, index) => (
        <Button
          key={itemPage}
          onClick={() => handlePageClick(itemPage)}
          sx={{
            gridColumn: index < 2 ? index + 1 : index + 2,
            gridRow: 1,
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
        aria-label={cartOpen ? 'ปิดตะกร้าตัดสต๊อก' : 'เปิดตะกร้าตัดสต๊อก'}
        onClick={onToggleCart}
        sx={{
          gridColumn: 3,
          gridRow: 1,
          minWidth: 0,
          minHeight: '54px !important',
          p: '4px 6px !important',
          mx: 0.25,
          borderRadius: '12px',
          color: '#fffaf6',
          display: 'grid',
          gridTemplateRows: '28px 1fr',
          gap: 0.5,
          // The regular cart label follows the same type scale as the other
          // inactive navigation labels. The count and close states override
          // this locally below.
          fontSize: '14px !important',
          fontWeight: '400 !important',
          lineHeight: 1.1,
          letterSpacing: 0,
          transition: 'background-color 160ms ease',
          bgcolor: '#5f4030',
          '& svg': { fontSize: 22, color: '#fffaf6' },
          '&:hover': { bgcolor: '#3c2d24' },
        }}
      >
        {cartOpen || cartItemCount > 0 ? (
          <>
            {/* Preserve the exact two-row track size used by every nav item. */}
            <Box
              aria-hidden="true"
              sx={{
                gridColumn: 1,
                gridRow: 1,
                height: 28,
                visibility: 'hidden',
              }}
            />
            <Box
              aria-hidden="true"
              sx={{
                gridColumn: 1,
                gridRow: 2,
                height: '19.6px',
                visibility: 'hidden',
              }}
            />
            <Box
              component="span"
              sx={{
                gridColumn: 1,
                gridRow: '1 / -1',
                alignSelf: 'center',
                whiteSpace: 'nowrap',
                fontSize: '26px !important',
                fontWeight: '700 !important',
              }}
            >
              {cartOpen ? 'ปิด' : cartItemCount}
            </Box>
          </>
        ) : (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 0,
                '& > div': {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 0,
                },
              }}
            >
              <CartIcon size={22} />
            </Box>
            <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
              ตะกร้า
            </Box>
          </>
        )}
      </Button>
      <Button
        aria-label="ออกจากระบบ"
        onClick={onLogout}
        sx={{
          gridColumn: 5,
          gridRow: 1,
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
