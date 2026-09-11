export const adminPagePaths = {
  ภาพรวม: '/',
  คำสั่งซื้อ: '/orders',
  ประวัติการทำรายการ: '/audit',
  เมนูและสินค้า: '/products',
  วัตถุดิบ: '/ingredients',
  สต๊อกอุปกรณ์เครื่องดื่ม: '/stock',
  สต๊อกอุปกรณ์ไปรษณีย์: '/postal-stock',
  'สาขา SBC': '/branches',
  สาขาแฟรนไชส์: '/franchise-branches',
  ตารางพนักงาน: '/employees',
  ลงเวลาพนักงาน: '/attendance',
  คำขอลาพนักงาน: '/leave-requests',
} as const;

export type AdminPage = keyof typeof adminPagePaths;

export function adminPageFromPath(pathname: string): AdminPage {
  const normalizedPath =
    pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return (
    (Object.entries(adminPagePaths).find(
      ([, path]) => path === normalizedPath,
    )?.[0] as AdminPage | undefined) ?? 'ภาพรวม'
  );
}
