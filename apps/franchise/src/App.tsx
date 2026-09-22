import { useEffect, useRef, useState } from 'react';
import { SbcThemeProvider } from '@stackbuild/ui';
import {
  QueryAutoRetrySnackbar,
  setManagementSessionRole,
} from '@stackbuild/management';
import { logout as endSession, restoreSession } from './api/auth';
import type { FranchiseUser } from './api/auth';
import { FranchiseLoginPage } from './features/auth/FranchiseLoginPage';
import { FranchiseDashboard } from './features/dashboard/FranchiseDashboard';

setManagementSessionRole('franchise_owner');

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<FranchiseUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const sessionEpoch = useRef(0);
  const logout = () => {
    sessionEpoch.current += 1;
    void endSession();
    sessionStorage.removeItem('sbc-franchise-active-page');
    sessionStorage.removeItem('sbc-franchise-sidebar-collapsed');
    setUser(null);
    setLoggedIn(false);
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
        if (!active || epoch !== sessionEpoch.current) return;
        if (session.user.role !== 'franchise_owner') return;
        setUser(session.user);
        setLoggedIn(true);
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
    <SbcThemeProvider secondary="#8f6040" background="#fbfaf8">
      {loggedIn ? (
        <FranchiseDashboard
          logout={logout}
          plan={user?.plan ?? 'S'}
          branchName={user?.branchName ?? 'สาขาแฟรนไชส์'}
          branchCode={user?.branchCode ?? ''}
        />
      ) : (
        <FranchiseLoginPage
          onLogin={(nextUser) => {
            setUser(nextUser);
            setLoggedIn(true);
          }}
        />
      )}
      <QueryAutoRetrySnackbar />
    </SbcThemeProvider>
  );
}
