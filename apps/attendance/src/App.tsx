import { useMemo, useState } from 'react';
import { Alert } from '@mui/material';
import { SbcThemeProvider } from '@stackbuild/ui';
import { attendanceNavigation } from './components/AttendanceNavigation';
import { AttendanceLoginPage } from './features/auth/AttendanceLoginPage';
import { useAttendanceClock } from './hooks/useAttendanceClock';
import { AttendanceAppLayout } from './layouts/AttendanceAppLayout';
import { AttendancePageRouter } from './routes/AttendancePageRouter';
import type { StaffPage } from './types/attendance';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(
    () => sessionStorage.getItem('sbc-staff-session') === 'true',
  );
  const [username, setUsername] = useState(
    () => sessionStorage.getItem('sbc-staff-username') ?? '',
  );
  const [page, setPage] = useState<StaffPage>('overview');
  const [checkedIn, setCheckedIn] = useState(false);
  const [notice, setNotice] = useState('');
  const clock = useAttendanceClock();
  const title = useMemo(
    () =>
      attendanceNavigation.find((item) => item.page === page)?.label ??
      'ภาพรวม',
    [page],
  );

  const login = (name: string) => {
    sessionStorage.setItem('sbc-staff-username', name);
    sessionStorage.setItem('sbc-staff-session', 'true');
    setUsername(name);
    setLoggedIn(true);
  };
  const logout = () => {
    sessionStorage.removeItem('sbc-staff-username');
    sessionStorage.removeItem('sbc-staff-session');
    setUsername('');
    setLoggedIn(false);
  };
  const toggleAttendance = () => {
    setCheckedIn((value) => !value);
    setNotice(checkedIn ? 'เช็กเอาต์เรียบร้อยแล้ว' : 'เช็กอินเรียบร้อยแล้ว');
  };

  return (
    <SbcThemeProvider secondary="#805637" background="#fbfaf8">
      {loggedIn ? (
        <AttendanceAppLayout
          username={username}
          page={page}
          title={title}
          onPage={setPage}
          onLogout={logout}
        >
          <AttendancePageRouter
            page={page}
            username={username}
            checkedIn={checkedIn}
            clock={clock}
            onAttendanceAction={toggleAttendance}
            onLeaveSuccess={() => setNotice('ส่งคำขอลาเรียบร้อยแล้ว')}
            onPage={setPage}
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
        </AttendanceAppLayout>
      ) : (
        <AttendanceLoginPage onLogin={login} />
      )}
    </SbcThemeProvider>
  );
}
