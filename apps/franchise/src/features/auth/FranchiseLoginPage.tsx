import { LoginScreen } from '@stackbuild/ui';
import { useNavigate } from 'react-router-dom';
import { login } from '../../api/auth';

export function FranchiseLoginPage({
  onLogin,
}: {
  onLogin: (plan: 'S' | 'M' | 'L') => void;
}) {
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
        navigate('/', { replace: true });
        onLogin(session.user.plan ?? 'S');
      }}
    />
  );
}
