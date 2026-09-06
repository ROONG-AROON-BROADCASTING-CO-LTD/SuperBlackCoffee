import { useEffect, useMemo, useState } from 'react';
import { Alert } from '@mui/material';
import { SbcThemeProvider } from '@stackbuild/ui';
import { attendanceNavigation } from './components/AttendanceNavigation';
import {
  checkIn,
  checkOut,
  createLeaveRequest,
  getAttendanceHistory,
  getAttendanceStatus,
  loginAttendance,
  setupAttendancePIN,
  type AttendanceHistoryItem,
  type AttendanceSession,
  type AttendanceStatus,
} from './api/attendance';
import { AttendanceLoginPage } from './features/auth/AttendanceLoginPage';
import { AutoRetrySnackbar } from './components/AutoRetrySnackbar';
import { useAttendanceClock } from './hooks/useAttendanceClock';
import { AttendanceAppLayout } from './layouts/AttendanceAppLayout';
import { AttendancePageRouter } from './routes/AttendancePageRouter';
import type { StaffPage } from './types/attendance';

function isAttendanceSession(
  value: Awaited<ReturnType<typeof loginAttendance>>,
): value is AttendanceSession {
  return !('requiresPIN' in value) && !('requiresPINSetup' in value);
}

export default function App() {
  const [session, setSession] = useState<AttendanceSession | null>(() => {
    const value = sessionStorage.getItem('sbc-staff-session');
    if (!value) return null;
    try {
      const parsed = JSON.parse(value) as Partial<AttendanceSession>;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !parsed.user ||
        typeof parsed.user.name !== 'string'
      ) {
        sessionStorage.removeItem('sbc-staff-session');
        return null;
      }
      return parsed as AttendanceSession;
    } catch {
      sessionStorage.removeItem('sbc-staff-session');
      return null;
    }
  });
  const [page, setPage] = useState<StaffPage>('overview');
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [history, setHistory] = useState<AttendanceHistoryItem[]>([]);
  const [notice, setNotice] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const clock = useAttendanceClock();
  const title = useMemo(
    () =>
      attendanceNavigation.find((item) => item.page === page)?.label ??
      'ภาพรวม',
    [page],
  );

  useEffect(() => {
    if (!session) return;
    let active = true;
    void Promise.all([
      getAttendanceStatus(session.accessToken),
      getAttendanceHistory(session.accessToken),
    ])
      .then(([nextStatus, nextHistory]) => {
        if (!active) return;
        setStatus(nextStatus);
        setHistory(nextHistory);
        setConnectionError(false);
      })
      .catch(() => {
        if (active) setConnectionError(true);
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

  const persistSession = (nextSession: AttendanceSession) => {
    sessionStorage.setItem('sbc-staff-session', JSON.stringify(nextSession));
    setSession(nextSession);
    setPage('attendance');
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
      if (isAttendanceSession(nextSession)) persistSession(nextSession);
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
      if (isAttendanceSession(nextSession)) persistSession(nextSession);
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
      persistSession(await setupAttendancePIN(name, pin));
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
    sessionStorage.removeItem('sbc-staff-session');
    setSession(null);
    setStatus(null);
    setHistory([]);
  };
  const toggleAttendance = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const nextStatus = status?.checkedIn
        ? await checkOut(session.accessToken)
        : await checkIn(session.accessToken);
      setStatus(nextStatus);
      setHistory(await getAttendanceHistory(session.accessToken));
      setNotice(
        nextStatus.checkedIn
          ? 'เช็กอินเรียบร้อยแล้ว'
          : 'เช็กเอาต์เรียบร้อยแล้ว',
      );
    } catch {
      // Keep the current UI state when the action cannot be completed.
      // Network implementation details must not be shown to staff.
    } finally {
      setLoading(false);
    }
  };

  return (
    <SbcThemeProvider secondary="#805637" background="#fbfaf8">
      {session ? (
        <AttendanceAppLayout
          username={session.user.name}
          branchName={session.user.branchName}
          page={page}
          title={title}
          onPage={setPage}
          onLogout={logout}
        >
          <AttendancePageRouter
            page={page}
            username={session.user.name}
            staff={session.user}
            checkedIn={status?.checkedIn ?? false}
            checkInAt={status?.checkInAt ?? null}
            clock={clock}
            onAttendanceAction={toggleAttendance}
            onLeaveSuccess={async (input) => {
              try {
                await createLeaveRequest(session.accessToken, input);
                setNotice('ส่งคำขอลาเรียบร้อยแล้ว');
              } catch {
                // The leave form remains open so the employee can try again.
              }
            }}
            onPage={setPage}
            history={history}
          />
          {notice ? (
            <Alert
              severity="success"
              onClose={() => setNotice('')}
              sx={{ mt: 2 }}
            >
              {notice}
            </Alert>
          ) : null}
          <AutoRetrySnackbar open={connectionError} />
        </AttendanceAppLayout>
      ) : (
        <AttendanceLoginPage
          onUsername={startLogin}
          onPIN={loginWithPIN}
          onSetupPIN={createPIN}
          error={loginError}
          loading={loading}
        />
      )}
    </SbcThemeProvider>
  );
}
