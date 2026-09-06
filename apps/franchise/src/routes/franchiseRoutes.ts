export const franchisePagePaths = {
  ภาพรวม: '/',
  คำขอวัตถุดิบ: '/ingredient-requests',
  เมนูและสินค้า: '/products',
  สต๊อก: '/stock',
  วัตถุดิบ: '/ingredients',
  ตารางพนักงาน: '/employees',
  ลงเวลาพนักงาน: '/attendance',
} as const;

export type FranchisePage = keyof typeof franchisePagePaths;

export function franchisePageFromPath(pathname: string): FranchisePage {
  return (
    (Object.entries(franchisePagePaths).find(
      ([, path]) => path === pathname,
    )?.[0] as FranchisePage | undefined) ?? 'ภาพรวม'
  );
}
