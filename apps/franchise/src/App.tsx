import { useEffect, useState } from 'react';
import { SbcThemeProvider } from '@stackbuild/ui';
import { QueryAutoRetrySnackbar } from '@stackbuild/management';
import { FranchiseLoginPage } from './features/auth/FranchiseLoginPage';
import { FranchiseDashboard } from './features/dashboard/FranchiseDashboard';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(
    () => sessionStorage.getItem('sbc-franchise-session') === 'true',
  );
  const logout = () => {
    sessionStorage.removeItem('sbc-access-token');
    sessionStorage.removeItem('sbc-franchise-session');
    sessionStorage.removeItem('sbc-franchise-plan');
    sessionStorage.removeItem('sbc-franchise-active-page');
    sessionStorage.removeItem('sbc-franchise-sidebar-collapsed');
    setLoggedIn(false);
  };
  useEffect(() => {
    window.addEventListener('sbc:session-expired', logout);
    return () => window.removeEventListener('sbc:session-expired', logout);
  }, []);
  return (
    <SbcThemeProvider secondary="#8f6040" background="#fbfaf8">
      {loggedIn ? (
        <FranchiseDashboard logout={logout} />
      ) : (
        <FranchiseLoginPage onLogin={() => setLoggedIn(true)} />
      )}
      <QueryAutoRetrySnackbar />
    </SbcThemeProvider>
  );
}
