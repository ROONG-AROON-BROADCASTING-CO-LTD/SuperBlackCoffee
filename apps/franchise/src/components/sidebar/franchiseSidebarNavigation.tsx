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
  { label: 'สต๊อก', icon: <BoxIcon />, group: 'สินค้าและคลัง' },
  { label: 'วัตถุดิบ', icon: <BoxesIcon />, group: 'สินค้าและคลัง' },
  { label: 'ตารางพนักงาน', icon: <UsersIcon />, group: 'บุคลากร' },
  { label: 'ลงเวลาพนักงาน', icon: <ClockIcon />, group: 'บุคลากร' },
] as const;

export type FranchisePlan = 'S' | 'M' | 'L';
export const navigationForPlan = (plan: FranchisePlan) =>
  navigation.filter((item) => plan === 'L' || item.label !== 'สต๊อก');
