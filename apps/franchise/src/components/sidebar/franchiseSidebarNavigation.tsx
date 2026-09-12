import {
  BoxIcon,
  BoxesIcon,
  ClockIcon,
  LayoutGridIcon,
  ReceiptIcon,
  ReceiptTextIcon,
  UsersIcon,
} from '@stackbuild/ui';

export const franchiseBranch = 'อยุธยา' as const;
export const navigation = [
  { label: 'ภาพรวม', icon: <LayoutGridIcon />, group: 'ภาพรวม' },
  { label: 'คำขอวัตถุดิบ', icon: <ReceiptIcon />, group: 'งานประจำวัน' },
  { label: 'เมนูและสินค้า', icon: <ReceiptTextIcon />, group: 'สินค้าและคลัง' },
  {
    label: 'สต๊อกอุปกรณ์เครื่องดื่ม',
    icon: <BoxIcon />,
    group: 'สินค้าและคลัง',
  },
  {
    label: 'สต๊อกอุปกรณ์ไปรษณีย์',
    icon: <BoxIcon />,
    group: 'สินค้าและคลัง',
  },
  { label: 'วัตถุดิบ', icon: <BoxesIcon />, group: 'สินค้าและคลัง' },
  { label: 'ตารางพนักงาน', icon: <UsersIcon />, group: 'บุคลากร' },
  { label: 'ลงเวลาพนักงาน', icon: <ClockIcon />, group: 'บุคลากร' },
  { label: 'คำขอลาพนักงาน', icon: <ReceiptTextIcon />, group: 'บุคลากร' },
] as const;

export type FranchisePlan = 'S' | 'M' | 'L';

// Size S sells drinks only, so it does not use postal packaging stock.
// Keep this rule here so the sidebar and route guard use one source of truth.
export const pageAvailableForPlan = (plan: FranchisePlan, page: string) =>
  plan !== 'S' || page !== 'สต๊อกอุปกรณ์ไปรษณีย์';

export const navigationForPlan = (plan: FranchisePlan) =>
  navigation.filter((item) => pageAvailableForPlan(plan, item.label));
