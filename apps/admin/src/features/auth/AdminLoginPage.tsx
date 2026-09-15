import { ActionSnackbar, type ActionNotice, LoginScreen } from '@stackbuild/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../api';

export function AdminLoginPage({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate();
  const [notice, setNotice] = useState<ActionNotice | null>(null);
  return (
    <>
      <LoginScreen
        headline={
          <>
            Run coffee.
            <br />
            <i style={{ color: '#d5ad8b' }}>Beautifully.</i>
          </>
        }
        description="ทุกแก้วที่ดี เริ่มจากการจัดการที่ดี"
        submitLabel="เข้าสู่ระบบผู้ดูแล"
        onSubmit={async (username, password) => {
          try {
            const session = await login(username, password);
            if (session.user.role !== 'admin')
              throw new Error('บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ');
            navigate('/', { replace: true });
            onLogin();
          } catch (error) {
            setNotice({
              message:
                error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ',
              severity: 'error',
            });
          }
        }}
      />
      <ActionSnackbar
        notice={notice}
        onClose={() => setNotice(null)}
        topOnTablet={false}
      />
    </>
  );
}
