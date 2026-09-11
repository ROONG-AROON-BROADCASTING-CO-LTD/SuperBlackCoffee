import type { ReactElement, ReactNode } from 'react';
import {
  cloneElement,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  Box,
  Button,
  Drawer,
  Fade,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { LogoutIcon, type LogoutIconHandle } from '../icons/LogoutIcon';
import {
  PanelLeftCloseIcon,
  type PanelLeftCloseIconHandle,
} from '../icons/PanelLeftCloseIcon';
import {
  PanelLeftOpenIcon,
  type PanelLeftOpenIconHandle,
} from '../icons/PanelLeftOpenIcon';
import superBlackLogo from '../../assets/superblack-logo.png';

type NavigationItem = {
  id?: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  group?: string;
};

export function DashboardSidebar({
  activePage,
  navigation,
  onNavigate,
  onLogout,
  selectedColor,
  activeBackground,
  accentColor,
  collapsed,
  onToggle,
  hideToggle = false,
  disableActiveConnection = false,
  collapseContentImmediately = false,
  disableWidthTransition = false,
  attachedPanel,
}: {
  activePage: string;
  navigation: NavigationItem[];
  onNavigate: (page: string) => void;
  onLogout: () => void;
  selectedColor: string;
  activeBackground: string;
  accentColor: string;
  collapsed: boolean;
  onToggle: () => void;
  hideToggle?: boolean;
  disableActiveConnection?: boolean;
  collapseContentImmediately?: boolean;
  disableWidthTransition?: boolean;
  attachedPanel?: ReactNode;
}) {
  const logoutIconRef = useRef<LogoutIconHandle>(null);
  const closeIconRef = useRef<PanelLeftCloseIconHandle>(null);
  const openIconRef = useRef<PanelLeftOpenIconHandle>(null);
  const navigationListRef = useRef<HTMLUListElement>(null);
  const [showExpandedContent, setShowExpandedContent] = useState(!collapsed);
  const [expandedContentVisible, setExpandedContentVisible] =
    useState(!collapsed);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [hoverCardMenu, setHoverCardMenu] = useState<string | null>(null);
  const [hoverCardVisible, setHoverCardVisible] = useState(false);
  const [hoverAnchor, setHoverAnchor] = useState<HTMLElement | null>(null);
  const [hoverAnchorPosition, setHoverAnchorPosition] = useState({
    left: 0,
    top: 0,
  });
  const [clickedMenu, setClickedMenu] = useState<string | null>(null);
  const hoverTimerRef = useRef<number | undefined>(undefined);
  const [, setScrollbarThumb] = useState({
    visible: false,
    left: 0,
    top: 0,
    height: 0,
  });

  const updateScrollbarThumb = () => {
    const list = navigationListRef.current;
    if (!list) return;

    const { top, height } = list.getBoundingClientRect();
    const sidebarRight =
      list.parentElement?.getBoundingClientRect().right ??
      list.getBoundingClientRect().right;
    const isScrollable = list.scrollHeight > list.clientHeight;
    const thumbHeight = isScrollable
      ? Math.max(
          28,
          (list.clientHeight * list.clientHeight) / list.scrollHeight,
        )
      : 0;
    const maxScroll = list.scrollHeight - list.clientHeight;
    const maxThumbOffset = list.clientHeight - thumbHeight;
    const thumbOffset = maxScroll
      ? (list.scrollTop / maxScroll) * maxThumbOffset
      : 0;

    setScrollbarThumb({
      visible: isScrollable,
      left: sidebarRight - 6,
      top: top + thumbOffset,
      height: Math.min(thumbHeight, height),
    });
  };

  const clearHoveredMenu = () => {
    setHoveredMenu(null);
    setHoverCardVisible(false);
    setHoverAnchor(null);
  };

  const hoveredNavigation = navigation.find(
    (item) => (item.id ?? item.label) === hoverCardMenu,
  );

  const scheduleHoverClear = () => {
    // Keep the shared hover state alive while the pointer crosses from the
    // sidebar button into the portalled label; this prevents a visible flash.
    hoverTimerRef.current = window.setTimeout(clearHoveredMenu, 220);
  };

  const isInsideHoverCard = (target: EventTarget | null) =>
    target instanceof Element &&
    target.closest('[data-sbc-sidebar-hover-card="true"]') !== null;

  const navigateHoveredMenu = () => {
    if (!hoveredMenu) return;
    setClickedMenu(hoveredMenu);
    window.setTimeout(() => setClickedMenu(null), 350);
    onNavigate(hoveredMenu);
    clearHoveredMenu();
  };

  useEffect(() => {
    updateScrollbarThumb();
    window.addEventListener('resize', updateScrollbarThumb);
    return () => window.removeEventListener('resize', updateScrollbarThumb);
  }, [collapsed, navigation.length]);

  useEffect(() => {
    // A page can force the sidebar into its compact layout after navigation.
    // Do not reuse an expanded row as the Popper anchor in that new layout.
    window.clearTimeout(hoverTimerRef.current);
    clearHoveredMenu();
  }, [collapsed]);

  useLayoutEffect(() => {
    if (collapsed) {
      setExpandedContentVisible(false);
      if (collapseContentImmediately) {
        setShowExpandedContent(false);
        return undefined;
      }
      const timer = window.setTimeout(() => setShowExpandedContent(false), 280);
      return () => window.clearTimeout(timer);
    }
    setShowExpandedContent(true);
    const frame = window.requestAnimationFrame(() =>
      setExpandedContentVisible(true),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [collapsed, collapseContentImmediately]);
  const width = collapsed ? 96 : 230;
  const renderExpandedContent =
    showExpandedContent && (!collapseContentImmediately || !collapsed);
  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        transition: disableWidthTransition
          ? 'none'
          : 'width .28s cubic-bezier(.2,.8,.2,1)',
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          bgcolor: '#171411',
          color: '#fff',
          border: 0,
          borderRadius: '0 12px 0 0',
          overflow: 'visible',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          transition: disableWidthTransition
            ? 'none'
            : 'width .28s cubic-bezier(.2,.8,.2,1), padding .28s cubic-bezier(.2,.8,.2,1)',
        },
      }}
    >
      <Button
        onClick={onToggle}
        onMouseEnter={() =>
          (collapsed
            ? openIconRef.current
            : closeIconRef.current
          )?.startAnimation()
        }
        onMouseLeave={() =>
          (collapsed
            ? openIconRef.current
            : closeIconRef.current
          )?.stopAnimation()
        }
        aria-label={collapsed ? 'ขยายเมนู' : 'ยุบเมนู'}
        sx={{
          position: 'absolute',
          display: hideToggle ? 'none' : 'inline-flex',
          top: 18,
          right: -20,
          minWidth: 40,
          width: 40,
          height: 40,
          p: 0,
          borderRadius: '50%',
          bgcolor: '#171411',
          color: '#fff',
          boxShadow: 'none',
          zIndex: 2,
          '&:hover': { bgcolor: '#171411' },
        }}
      >
        {collapsed ? (
          <PanelLeftOpenIcon ref={openIconRef} size={24} />
        ) : (
          <PanelLeftCloseIcon ref={closeIconRef} size={24} />
        )}
      </Button>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          pb: 1.5,
        }}
      >
        <Box
          component="img"
          src={superBlackLogo}
          alt="Super Black Coffee"
          sx={{ width: 52, height: 52, objectFit: 'contain' }}
        />
        <Typography
          sx={{
            fontSize: 12,
            letterSpacing: 0.5,
            fontWeight: 800,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            maxHeight: 24,
            minHeight: 24,
            opacity: collapsed ? 0 : 1,
            visibility:
              collapseContentImmediately && collapsed ? 'hidden' : 'visible',
            overflow: 'hidden',
            transition: collapseContentImmediately
              ? 'none'
              : 'opacity .14s ease',
          }}
        >
          SUPER{' '}
          <Box component="span" color={accentColor}>
            BLACK
          </Box>{' '}
          COFFEE
        </Typography>
      </Box>
      <List
        ref={navigationListRef}
        onScroll={() => {
          // A scroll changes the row's viewport coordinates. Hide the label
          // instead of leaving it at a stale position until the next hover.
          clearHoveredMenu();
          updateScrollbarThumb();
        }}
        sx={{
          flex: 1,
          minHeight: 0,
          // Extend only through the Drawer padding so selected rows can meet
          // the panel edge. The previous 32px extension escaped the Drawer
          // and rendered this element's scrollbar over the page content.
          // Leave a small reveal at the panel edge so the active item's
          // curved connection remains visible beside the main content.
          width: 'calc(100% + 20px)',
          mr: -2.5,
          py: 0,
          pr: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          // The native scrollbar reserves space on the right. Hide it and
          // draw the thumb above the navigation so selected rows stay flush.
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { width: 0, height: 0 },
        }}
      >
        {navigation.map(({ id, label, icon, badge, group }, index) => (
          <Box key={id ?? label}>
            {group &&
              group !== navigation[index - 1]?.group &&
              !collapsed &&
              renderExpandedContent && (
                <Typography
                  sx={{
                    mt: index === 0 ? 0 : 1.25,
                    mb: 0.5,
                    px: 1,
                    color: 'rgba(255,255,255,.46)',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '.08em',
                    lineHeight: 1.5,
                    opacity: expandedContentVisible ? 1 : 0,
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    transition: 'opacity .14s ease',
                  }}
                >
                  {group}
                </Typography>
              )}
            <ListItemButton
              selected={(id ?? label) === activePage}
              disableRipple
              disableTouchRipple
              onClick={() => {
                setClickedMenu(id ?? label);
                window.setTimeout(() => setClickedMenu(null), 350);
                // Prevent an expanded row's hover anchor from leaking into a
                // route that immediately forces the sidebar to collapse.
                clearHoveredMenu();
                onNavigate(id ?? label);
              }}
              onMouseEnter={(event) => {
                window.clearTimeout(hoverTimerRef.current);
                // A selected item already has its connected active surface.
                // In compact mode it must never open the duplicate hover card.
                if (collapsed && (id ?? label) === activePage) {
                  clearHoveredMenu();
                  return;
                }
                const anchorRect = event.currentTarget.getBoundingClientRect();
                const sidebarRect = event.currentTarget
                  .closest('.MuiDrawer-paper')
                  ?.getBoundingClientRect();

                // When navigation forces the sidebar to collapse, the pointer
                // can briefly re-enter a row that still has the old 230px
                // layout. Never use that stale row as a compact Popper anchor.
                if (collapsed && sidebarRect && sidebarRect.width > 128) return;

                setHoveredMenu(id ?? label);
                setHoverCardMenu(id ?? label);
                setHoverCardVisible(true);
                setHoverAnchor(event.currentTarget);
                setHoverAnchorPosition({
                  left: sidebarRect ? anchorRect.left - sidebarRect.left : 0,
                  top: sidebarRect ? anchorRect.top - sidebarRect.top : 0,
                });
              }}
              onMouseLeave={(event) => {
                // The label card is rendered in a portal, so treat it as the
                // same hover surface as its source row. Without this check,
                // moving from the icon into the label schedules a close before
                // the card can take over and creates the visible flash.
                if (!isInsideHoverCard(event.relatedTarget)) {
                  scheduleHoverClear();
                }
              }}
              sx={{
                minHeight: 48,
                justifyContent: collapsed ? 'center' : 'flex-start',
                position: 'relative',
                transition: 'background-color .18s ease',
                borderRadius: '12px',
                // The selected final item has curved pseudo-elements below it.
                // Reserve that space only for the final row so it renders the
                // same as selected items in the middle of the menu.
                mb: index === navigation.length - 1 ? 2 : 0.5,
                '&.Mui-selected': disableActiveConnection
                  ? {
                      bgcolor: 'transparent !important',
                      color: '#171411',
                      borderRadius: 0,
                      overflow: 'visible',
                      mr: 0,
                    }
                  : collapsed
                    ? {
                        bgcolor: 'transparent !important',
                        color: '#171411',
                        borderRadius: 0,
                        overflow: 'visible',
                        mr: 0,
                        width: 'calc(100% + 1px)',
                        position: 'relative',
                        zIndex: 1,
                      }
                    : {
                        bgcolor: 'transparent !important',
                        color: '#171411',
                        borderRadius: 0,
                        overflow: 'visible',
                        mr: 0,
                        width: 'calc(100% + 1px)',
                        position: 'relative',
                        zIndex: 1,
                      },
                '&.Mui-selected:hover': {
                  bgcolor: 'transparent !important',
                },
                // Keep the active surface independent from ListItemButton's
                // built-in radius. The route fallback briefly reapplies that
                // radius, so the connected edge used to turn round on click.
                '&.Mui-selected::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: -1,
                  bottom: 0,
                  left: 0,
                  bgcolor: activeBackground,
                  borderRadius: '16px 0 0 16px',
                  pointerEvents: 'none',
                  zIndex: 0,
                },
                '&.Mui-selected .MuiListItemIcon-root': {
                  position: 'absolute',
                  zIndex: 1,
                },
                '&.Mui-selected .MuiListItemText-root': {
                  position: 'relative',
                  zIndex: 1,
                },
                '&:not(.Mui-selected):hover': collapsed
                  ? {
                      bgcolor: 'transparent',
                      width: '100%',
                      position: 'relative',
                      zIndex: 2,
                    }
                  : {
                      bgcolor: selectedColor,
                      width: '100%',
                      borderRadius: '16px',
                    },
              }}
            >
              <ListItemIcon
                sx={{
                  color: 'inherit',
                  position: 'absolute',
                  left: 0,
                  width: 64,
                  minWidth: 64,
                  display: 'flex',
                  justifyContent: 'center',
                  transition: 'color .2s ease',
                }}
              >
                {isValidElement(icon)
                  ? cloneElement(icon as ReactElement<{ animate?: boolean }>, {
                      animate:
                        (!collapsed && hoveredMenu === (id ?? label)) ||
                        clickedMenu === (id ?? label),
                    })
                  : icon}
              </ListItemIcon>
              {renderExpandedContent && (
                <ListItemText
                  sx={{
                    m: 0,
                    ml: '44px',
                    whiteSpace: 'nowrap',
                    opacity: expandedContentVisible ? 1 : 0,
                    transform: expandedContentVisible
                      ? 'translateX(0)'
                      : 'translateX(-10px)',
                    transition: 'opacity .14s ease, transform .14s ease',
                  }}
                  primary={
                    <Typography
                      sx={{
                        fontSize: 14,
                        fontWeight: 400,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </Typography>
                  }
                />
              )}
              {!!badge && (
                <Box
                  className="sbc-nav-badge"
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: collapsed ? 48 : 172,
                    zIndex: 3,
                    display: 'grid',
                    placeItems: 'center',
                    minWidth: 22,
                    height: 22,
                    px: 0.5,
                    borderRadius: 99,
                    bgcolor: '#e5291d',
                    color: '#fff',
                    transform: 'translateY(-50%)',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 11,
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {badge > 99 ? '99+' : badge}
                </Box>
              )}
            </ListItemButton>
          </Box>
        ))}
      </List>
      {collapsed && hoverCardMenu !== null && Boolean(hoverAnchor) && (
        <Fade
          in={hoverCardVisible && hoverCardMenu !== activePage}
          timeout={{ enter: 140, exit: 100 }}
          onExited={() => {
            setHoverCardMenu(null);
            setHoverAnchorPosition({ left: 0, top: 0 });
          }}
        >
          <Box
            data-sbc-sidebar-hover-card="true"
            onMouseEnter={() => window.clearTimeout(hoverTimerRef.current)}
            onMouseLeave={(event) => {
              const relatedTarget = event.relatedTarget;
              const isBackOnAnchor =
                relatedTarget instanceof Node &&
                Boolean(hoverAnchor?.contains(relatedTarget));

              if (!isBackOnAnchor) scheduleHoverClear();
            }}
            onClick={navigateHoveredMenu}
            sx={{
              // The hover label always belongs to the compact rail. Using the
              // source row's measured width here made the route-driven
              // collapse reuse a transient 230px measurement, unlike a
              // manual collapse where the row already measures 96px.
              width: width + 152,
              height: 48,
              position: 'absolute',
              left: hoverAnchorPosition.left,
              top: hoverAnchorPosition.top,
              // Admin's attached branch panel sits at z-index 1201. Keep the
              // collapsed-menu label above it, matching the unobstructed
              // Franchise sidebar rather than letting the panel cut the label.
              zIndex: 1202,
              display: 'flex',
              alignItems: 'center',
              bgcolor: selectedColor,
              color: '#fff',
              borderRadius: '16px',
              fontSize: 14,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            <Box
              sx={{
                // Match the original sidebar icon rail (left: 0, width: 64),
                // rather than centering the replacement icon in the full row.
                width: 64,
                minWidth: 64,
                display: 'grid',
                placeItems: 'center',
                lineHeight: 0,
              }}
            >
              {isValidElement(hoveredNavigation?.icon)
                ? cloneElement(
                    hoveredNavigation.icon as ReactElement<{
                      animate?: boolean;
                    }>,
                    { animate: false },
                  )
                : hoveredNavigation?.icon}
            </Box>
            <Typography
              sx={{
                ml: -1,
                px: 1,
                fontSize: 14,
                fontWeight: 500,
                color: 'inherit',
              }}
            >
              {hoveredNavigation?.label}
            </Typography>
          </Box>
        </Fade>
      )}
      <Box
        sx={{
          mt: 'auto',
          px: 0,
          pt: 1.5,
          pb: 0,
          bgcolor: '#171411',
          borderRadius: '14px 14px 0 0',
        }}
      >
        <Button
          onClick={onLogout}
          fullWidth
          onMouseEnter={() => logoutIconRef.current?.startAnimation()}
          onMouseLeave={() => logoutIconRef.current?.stopAnimation()}
          sx={{
            minHeight: 48,
            p: 0,
            color: '#fff',
            bgcolor: '#b42318',
            borderRadius: '12px',
            fontSize: 14,
            fontWeight: 400,
            '&:hover': { bgcolor: '#8f1c13' },
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              position: 'relative',
              lineHeight: 1,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                // The logout SVG has a 16px inherited inline offset inside
                // MUI's Button content. Offset it by 5px here so its visible
                // box starts at the same x coordinate as menu icons.
                left: collapsed ? '50%' : 5,
                top: '50%',
                display: 'flex',
                transform: collapsed
                  ? 'translate(-50%, -50%)'
                  : 'translateY(-50%)',
                transition: 'color .2s ease',
              }}
            >
              <LogoutIcon
                ref={logoutIconRef}
                size={22}
                style={{ display: 'flex', alignItems: 'center', lineHeight: 0 }}
              />
            </Box>
            {renderExpandedContent && (
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  // Match ListItemText's 44px offset in every sidebar row.
                  left: 44,
                  top: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  opacity: expandedContentVisible ? 1 : 0,
                  transform: expandedContentVisible
                    ? 'translate(0, -50%)'
                    : 'translate(-10px, -50%)',
                  transition: 'opacity .14s ease, transform .14s ease',
                }}
              >
                ออกจากระบบ
              </Box>
            )}
          </Box>
        </Button>
      </Box>
      {attachedPanel}
    </Drawer>
  );
}
