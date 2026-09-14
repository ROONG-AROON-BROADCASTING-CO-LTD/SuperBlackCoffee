import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
      '@stackbuild/ui': path.resolve(
        dirname,
        '../../packages/ui/src/index.tsx',
      ),
      '@stackbuild/management/pages/attendance': path.resolve(
        dirname,
        '../../packages/management/src/pages/AttendanceManagementPage.tsx',
      ),
      '@stackbuild/management/pages/leave-requests': path.resolve(
        dirname,
        '../../packages/management/src/pages/LeaveRequestsManagementPage.tsx',
      ),
      '@stackbuild/management': path.resolve(
        dirname,
        '../../packages/management/src/index.ts',
      ),
      '@stackbuild/types': path.resolve(
        dirname,
        '../../packages/types/src/index.ts',
      ),
    },
  },
});
