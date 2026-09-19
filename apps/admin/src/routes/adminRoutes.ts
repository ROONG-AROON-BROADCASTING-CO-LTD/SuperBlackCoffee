export const adminPagePaths = {
  ภาพรวม: '/',
  คำสั่งซื้อ: '/orders',
  โปรโมชั่น: '/promotions',
  สินค้าและคลังกลาง: '/central-catalog',
  เมนูและสินค้ากลาง: '/central-catalog/menus',
  วัตถุดิบกลาง: '/central-catalog/ingredients',
  วัตถุดิบของสดกลาง: '/central-catalog/fresh-ingredients',
  อุปกรณ์เครื่องดื่มกลาง: '/central-catalog/drink-equipment',
  อุปกรณ์ไปรษณีย์กลาง: '/central-catalog/postal-equipment',
  รายการรายสาขา: '/central-catalog/branches',
  กระจายข้อมูลกลาง: '/central-catalog/sync',
  ประวัติการทำรายการ: '/audit',
  เอกสารส่วนกลาง: '/documents',
  เมนูและสินค้า: '/products',
  วัตถุดิบ: '/ingredients',
  วัตถุดิบของสด: '/fresh-ingredients',
  สต๊อกอุปกรณ์เครื่องดื่ม: '/stock',
  สต๊อกอุปกรณ์ไปรษณีย์: '/postal-stock',
  'สาขา SBC': '/branches',
  สาขาแฟรนไชส์: '/franchise-branches',
  ตารางพนักงาน: '/employees',
  ลงเวลาพนักงาน: '/attendance',
  คำขอลาพนักงาน: '/leave-requests',
  ตรวจมาตรฐานและบริการ: '/operations',
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
