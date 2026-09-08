export const franchisePagePaths = {
  ภาพรวม: '/',
  คำขอวัตถุดิบ: '/ingredient-requests',
  เมนูและสินค้า: '/products',
  สต๊อก: '/stock',
  วัตถุดิบ: '/ingredients',
  ตารางพนักงาน: '/employees',
  ลงเวลาพนักงาน: '/attendance',
  คำขอลาพนักงาน: '/leave-requests',
} as const;

export type FranchisePage = keyof typeof franchisePagePaths;

export function franchisePageFromPath(pathname: string): FranchisePage {
  const normalizedPath =
    pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return (
    (Object.entries(franchisePagePaths).find(
      ([, path]) => path === normalizedPath,
    )?.[0] as FranchisePage | undefined) ?? 'ภาพรวม'
  );
}
