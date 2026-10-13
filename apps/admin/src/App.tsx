import { useContext, useEffect, useRef, useState } from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import { SbcThemeProvider } from '@stackbuild/ui';
import {
  QueryAutoRetrySnackbar,
  setManagementSessionRole,
  resetManagementRequests,
} from '@stackbuild/management';
import { restoreSession, logout as endSession } from './api/auth';
import { resetAdminRequests } from './api/client';
import { AdminLoginPage } from './features/auth/AdminLoginPage';
import { AdminDashboard } from './features/dashboard/AdminDashboard';

setManagementSessionRole('admin');

export default function App() {
  const queryClient = useContext(QueryClientContext);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const sessionEpoch = useRef(0);
  const logout = () => {
    sessionEpoch.current += 1;
    queryClient?.clear();
    resetAdminRequests();
    resetManagementRequests();
    setLoggedIn(false);
    void endSession().catch(() => undefined);
  };
  useEffect(() => {
    window.addEventListener('sbc:session-expired', logout);
    return () => window.removeEventListener('sbc:session-expired', logout);
  }, []);
  useEffect(() => {
    let active = true;
    const epoch = sessionEpoch.current;
    void restoreSession()
      .then((session) => {
        if (active && epoch === sessionEpoch.current)
          setLoggedIn(session.user.role === 'admin');
      })
      .catch(() => {
        if (active && epoch === sessionEpoch.current) setLoggedIn(false);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);
  if (checkingSession) return null;
  return (
    <SbcThemeProvider
      secondary="#8f6040"
      background="#fbfaf8"
      skeletonAnimation="wave"
      skeletonColor="#eee5df"
    >
      {loggedIn ? (
        <AdminDashboard logout={logout} />
      ) : (
        <AdminLoginPage
          onLogin={() => {
            queryClient?.clear();
            resetAdminRequests();
            resetManagementRequests();
            setLoggedIn(true);
          }}
        />
      )}
      <QueryAutoRetrySnackbar />
    </SbcThemeProvider>
  );
}
