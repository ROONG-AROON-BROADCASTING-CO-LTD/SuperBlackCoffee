import { useEffect, useState } from 'react';
import { SbcThemeProvider } from '@stackbuild/ui';
import {
  QueryAutoRetrySnackbar,
  setManagementSessionRole,
} from '@stackbuild/management';
import { logout as endSession, restoreSession } from './api/auth';
import { FranchiseLoginPage } from './features/auth/FranchiseLoginPage';
import { FranchiseDashboard } from './features/dashboard/FranchiseDashboard';

setManagementSessionRole('franchise_owner');

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [plan, setPlan] = useState<'S' | 'M' | 'L'>('S');
  const [checkingSession, setCheckingSession] = useState(true);
  const logout = () => {
    void endSession();
    sessionStorage.removeItem('sbc-franchise-active-page');
    sessionStorage.removeItem('sbc-franchise-sidebar-collapsed');
    setLoggedIn(false);
  };
  useEffect(() => {
    window.addEventListener('sbc:session-expired', logout);
    return () => window.removeEventListener('sbc:session-expired', logout);
  }, []);
  useEffect(() => {
    void restoreSession()
      .then((session) => {
        if (session.user.role !== 'franchise_owner') return;
        setPlan(session.user.plan ?? 'S');
        setLoggedIn(true);
      })
      .catch(() => setLoggedIn(false))
      .finally(() => setCheckingSession(false));
  }, []);
  if (checkingSession) return null;
  return (
    <SbcThemeProvider secondary="#8f6040" background="#fbfaf8">
      {loggedIn ? (
        <FranchiseDashboard logout={logout} plan={plan} />
      ) : (
        <FranchiseLoginPage
          onLogin={(nextPlan) => {
            setPlan(nextPlan);
            setLoggedIn(true);
          }}
        />
      )}
      <QueryAutoRetrySnackbar />
    </SbcThemeProvider>
  );
}
