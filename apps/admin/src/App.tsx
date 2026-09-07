import { useEffect, useState } from 'react';
import { SbcThemeProvider } from '@stackbuild/ui';
import { QueryAutoRetrySnackbar } from '@stackbuild/management';
import { restoreSession, logout as endSession } from './api/auth';
import { AdminLoginPage } from './features/auth/AdminLoginPage';
import { AdminDashboard } from './features/dashboard/AdminDashboard';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const logout = () => {
    setLoggedIn(false);
    void endSession();
  };
  useEffect(() => {
    window.addEventListener('sbc:session-expired', logout);
    return () => window.removeEventListener('sbc:session-expired', logout);
  }, []);
  useEffect(() => {
    void restoreSession()
      .then((session) => setLoggedIn(session.user.role === 'admin'))
      .catch(() => setLoggedIn(false))
      .finally(() => setCheckingSession(false));
  }, []);
  if (checkingSession) return null;
  return (
    <SbcThemeProvider secondary="#8f6040" background="#fbfaf8">
      {loggedIn ? (
        <AdminDashboard logout={logout} />
      ) : (
        <AdminLoginPage onLogin={() => setLoggedIn(true)} />
      )}
      <QueryAutoRetrySnackbar />
    </SbcThemeProvider>
  );
}
