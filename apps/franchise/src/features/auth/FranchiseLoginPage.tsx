import { LoginScreen } from '@stackbuild/ui';
import { useNavigate } from 'react-router-dom';
import { login } from '../../api/auth';

export function FranchiseLoginPage({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate();
  return (
    <LoginScreen
      headline="Franchise Portal"
      description="เข้าสู่ระบบเพื่อจัดการแฟรนไชส์ของคุณ"
      submitLabel="เข้าสู่ระบบแฟรนไชส์"
      onSubmit={async (username, password) => {
        const session = await login(username, password);
        if (session.user.role !== 'franchise_owner')
          throw new Error('บัญชีนี้ไม่มีสิทธิ์แฟรนไชส์');
        sessionStorage.setItem('sbc-access-token', session.accessToken);
        sessionStorage.setItem('sbc-franchise-session', 'true');
        sessionStorage.setItem('sbc-franchise-plan', session.user.plan ?? 'S');
        navigate('/', { replace: true });
        onLogin();
      }}
    />
  );
}
