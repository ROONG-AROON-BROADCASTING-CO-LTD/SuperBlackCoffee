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
      '@stackbuild/management/pages/employees': path.resolve(
        dirname,
        '../../packages/management/src/pages/EmployeesManagementPage.tsx',
      ),
      '@stackbuild/management/pages/ingredients': path.resolve(
        dirname,
        '../../packages/management/src/pages/IngredientsManagementPage.tsx',
      ),
      '@stackbuild/management/pages/products': path.resolve(
        dirname,
        '../../packages/management/src/pages/ProductsManagementPage.tsx',
      ),
      '@stackbuild/management/pages/stock': path.resolve(
        dirname,
        '../../packages/management/src/pages/StockManagementPage.tsx',
      ),
      '@stackbuild/management/pages/attendance': path.resolve(
        dirname,
        '../../packages/management/src/pages/AttendanceManagementPage.tsx',
      ),
      '@stackbuild/management/skeletons/employees': path.resolve(
        dirname,
        '../../packages/management/src/components/skeletons/EmployeesSkeleton.tsx',
      ),
      '@stackbuild/management/skeletons/ingredients': path.resolve(
        dirname,
        '../../packages/management/src/components/skeletons/IngredientsSkeleton.tsx',
      ),
      '@stackbuild/management/skeletons/products': path.resolve(
        dirname,
        '../../packages/management/src/components/skeletons/ProductsSkeleton.tsx',
      ),
      '@stackbuild/management/skeletons/stock': path.resolve(
        dirname,
        '../../packages/management/src/components/skeletons/StockSkeleton.tsx',
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
