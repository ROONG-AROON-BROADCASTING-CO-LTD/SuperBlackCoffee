import { useEffect, useMemo, useState } from 'react';
import { Alert, Snackbar, useMediaQuery } from '@mui/material';
import { SbcThemeProvider } from '@stackbuild/ui';
import { attendanceNavigation } from './components/AttendanceNavigation';
import {
  checkIn,
  checkOut,
  createLeaveRequest,
  getAttendanceHistory,
  getAttendanceStatus,
  getAttendanceSummary,
  loginAttendance,
  logoutAttendance,
  restoreAttendanceSession,
  setupAttendancePIN,
  type AttendanceHistoryItem,
  type AttendanceSession,
  type AttendanceStatus,
  type AttendanceSummary,
} from './api/attendance';
import { ApiRequestError } from './api/client';
import { AutoRetrySnackbar } from './components/AutoRetrySnackbar';
import { AttendanceLoginPage } from './features/auth/AttendanceLoginPage';
import { useAttendanceClock } from './hooks/useAttendanceClock';
import { AttendanceAppLayout } from './layouts/AttendanceAppLayout';
import { AttendancePageRouter } from './routes/AttendancePageRouter';
import type { StaffPage } from './types/attendance';

function isAttendanceSession(
  value: Awaited<ReturnType<typeof loginAttendance>>,
): value is AttendanceSession {
  return !('requiresPIN' in value) && !('requiresPINSetup' in value);
}

function isInvalidAttendanceSession(error: unknown) {
  return (
    error instanceof ApiRequestError &&
    (error.status === 401 || error.status === 403)
  );
}

const staffPagePaths: Record<StaffPage, string> = {
  overview: '/',
  attendance: '/attendance',
  leave: '/leave',
  history: '/history',
};

function staffPageFromPath(pathname: string): StaffPage {
  switch (pathname.replace(/\/+$/, '') || '/') {
    case '/attendance':
      return 'attendance';
    case '/leave':
      return 'leave';
    case '/history':
      return 'history';
    default:
      return 'overview';
  }
}

export default function App() {
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [page, setPage] = useState<StaffPage>(() =>
    staffPageFromPath(window.location.pathname),
  );
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [history, setHistory] = useState<AttendanceHistoryItem[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [initialDataLoading, setInitialDataLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const isTabletOrSmaller = useMediaQuery('(max-width:899.95px)');
  const clock = useAttendanceClock();
  const title = useMemo(
    () =>
      attendanceNavigation.find((item) => item.page === page)?.label ??
      'ภาพรวม',
    [page],
  );
  const attendanceActionDisabled = !status || !status.canRecordAttendance;
  const attendanceActionHint =
    status?.checkInAt && status.checkOutAt
      ? ''
      : status?.shiftStatus === 'day_off'
        ? 'วันนี้เป็นวันหยุดตามตารางกะ'
        : 'ยังไม่สามารถบันทึกเวลาได้ กรุณารอให้ระบบตรวจสอบกะงาน';
  const attendanceActionDisabledLabel =
    status?.checkInAt && status.checkOutAt
      ? 'ลงเวลาวันนี้ครบแล้ว'
      : status?.shiftStatus === 'day_off'
        ? 'วันนี้เป็นวันหยุด'
        : 'ยังไม่สามารถลงเวลาได้';

  useEffect(() => {
    let active = true;
    void restoreAttendanceSession()
      .then((nextSession) => {
        if (!active) return;
        setInitialDataLoading(true);
        setSession(nextSession);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    void Promise.all([
      getAttendanceStatus(),
      getAttendanceHistory(),
      getAttendanceSummary(),
    ])
      .then(([nextStatus, nextHistory, nextSummary]) => {
        if (!active) return;
        setStatus(nextStatus);
        setHistory(nextHistory);
        setSummary(nextSummary);
        setConnectionError(false);
      })
      .catch((error) => {
        if (!active) return;
        if (isInvalidAttendanceSession(error)) {
          setSession(null);
          setStatus(null);
          setHistory([]);
          setSummary(null);
          return;
        }
        setConnectionError(true);
      })
      .finally(() => {
        if (active) setInitialDataLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retryTick, session]);

  useEffect(() => {
    if (!session || !connectionError) return;
    const retry = () => setRetryTick((tick) => tick + 1);
    const interval = window.setInterval(retry, 10_000);
    window.addEventListener('online', retry);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', retry);
    };
  }, [connectionError, session]);

  useEffect(() => {
    const syncPageWithHistory = () =>
      setPage(staffPageFromPath(window.location.pathname));
    window.addEventListener('popstate', syncPageWithHistory);
    return () => window.removeEventListener('popstate', syncPageWithHistory);
  }, []);

  const navigatePage = (nextPage: StaffPage) => {
    const nextPath = staffPagePaths[nextPage];
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setPage(nextPage);
  };

  const startSession = (nextSession: AttendanceSession) => {
    setInitialDataLoading(true);
    setSession(nextSession);
    navigatePage('attendance');
  };
  const startLogin = async (name: string): Promise<'pin' | 'setup-pin'> => {
    setLoading(true);
    setLoginError('');
    try {
      const nextSession = await loginAttendance(name);
      if ('requiresPINSetup' in nextSession) {
        return 'setup-pin';
      }
      if ('requiresPIN' in nextSession) return 'pin';
      if (isAttendanceSession(nextSession)) startSession(nextSession);
      return 'pin';
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'ไม่สามารถเข้าสู่ระบบได้',
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };
  const loginWithPIN = async (name: string, pin: string) => {
    setLoading(true);
    setLoginError('');
    try {
      const nextSession = await loginAttendance(name, pin);
      if (isAttendanceSession(nextSession)) startSession(nextSession);
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'ไม่สามารถเข้าสู่ระบบได้',
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };
  const createPIN = async (name: string, pin: string) => {
    setLoading(true);
    setLoginError('');
    try {
      startSession(await setupAttendancePIN(name, pin));
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'ไม่สามารถตั้ง PIN ได้',
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };
  const logout = () => {
    void logoutAttendance();
    setSession(null);
    setStatus(null);
    setHistory([]);
    setSummary(null);
    setInitialDataLoading(false);
    window.history.replaceState(null, '', staffPagePaths.overview);
    setPage('overview');
  };
  const toggleAttendance = async () => {
    if (!session || !status?.canRecordAttendance) return;
    setLoading(true);
    try {
      const nextStatus = status?.checkedIn ? await checkOut() : await checkIn();
      setStatus((currentStatus) => ({
        ...currentStatus,
        ...nextStatus,
        canRecordAttendance: nextStatus.checkedIn,
      }));
      setHistory(await getAttendanceHistory());
      void getAttendanceSummary()
        .then(setSummary)
        .catch(() => undefined);
      setNotice(
        nextStatus.checkedIn
          ? 'เช็กอินเรียบร้อยแล้ว'
          : 'เช็กเอาต์เรียบร้อยแล้ว',
      );
    } catch (error) {
      if (isInvalidAttendanceSession(error)) {
        logout();
        return;
      }
      // Keep the current UI state when the action cannot be completed.
      // Network implementation details must not be shown to staff.
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) return null;

  return (
    <SbcThemeProvider
      secondary="#805637"
      background="#fbfaf8"
      borderRadius={15}
    >
      {session ? (
        <AttendanceAppLayout
          username={session.user.name}
          branchName={session.user.branchName}
          page={page}
          title={title}
          onPage={navigatePage}
          onLogout={logout}
        >
          <AttendancePageRouter
            page={page}
            username={session.user.name}
            staff={session.user}
            checkedIn={status?.checkedIn ?? false}
            checkInAt={status?.checkInAt ?? null}
            checkOutAt={status?.checkOutAt ?? null}
            attendanceActionDisabled={attendanceActionDisabled}
            attendanceActionHint={attendanceActionHint}
            attendanceActionDisabledLabel={attendanceActionDisabledLabel}
            clock={clock}
            onAttendanceAction={toggleAttendance}
            onLeaveSuccess={async (input) => {
              try {
                await createLeaveRequest(input);
                setNotice('ส่งคำขอลาเรียบร้อยแล้ว');
              } catch {
                // The leave form remains open so the employee can try again.
              }
            }}
            history={history}
            summary={summary}
            isInitialLoading={initialDataLoading}
          />
          {notice ? (
            <Snackbar
              open
              autoHideDuration={4_000}
              onClose={(_event, reason) => {
                if (reason !== 'clickaway') setNotice('');
              }}
              anchorOrigin={{
                vertical: isTabletOrSmaller ? 'top' : 'bottom',
                horizontal: 'center',
              }}
              sx={
                isTabletOrSmaller
                  ? { top: 'calc(72px + env(safe-area-inset-top) + 12px)' }
                  : { mb: 2 }
              }
            >
              <Alert
                severity="success"
                variant="filled"
                sx={{
                  fontFamily: 'Kanit, sans-serif',
                  fontWeight: 500,
                  '@keyframes sbc-success-notice-icon': {
                    '0%': { opacity: 0, transform: 'scale(0.6)' },
                    '65%': { opacity: 1, transform: 'scale(1.18)' },
                    '100%': { opacity: 1, transform: 'scale(1)' },
                  },
                  '& .MuiAlert-icon': {
                    animation: 'sbc-success-notice-icon 420ms ease-out',
                  },
                }}
              >
                {notice}
              </Alert>
            </Snackbar>
          ) : null}
          <AutoRetrySnackbar open={connectionError} />
        </AttendanceAppLayout>
      ) : (
        <AttendanceLoginPage
          onUsername={startLogin}
          onPIN={loginWithPIN}
          onSetupPIN={createPIN}
          onClearError={() => setLoginError('')}
          error={loginError}
          loading={loading}
        />
      )}
    </SbcThemeProvider>
  );
}
