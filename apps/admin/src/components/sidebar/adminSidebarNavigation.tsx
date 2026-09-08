import {
  BoxIcon,
  BoxesIcon,
  ClockIcon,
  LayoutGridIcon,
  MapPinHouseIcon,
  MapPinPlusIcon,
  ReceiptIcon,
  ReceiptTextIcon,
  UsersIcon,
} from '@stackbuild/ui';

export const adminSidebarNavigation = [
  { label: 'ภาพรวม', icon: <LayoutGridIcon />, group: 'ภาพรวม' },
  { label: 'คำสั่งซื้อ', icon: <ReceiptIcon />, group: 'การขายและคำสั่งซื้อ' },
  {
    label: 'เมนูและสินค้า',
    icon: <ReceiptTextIcon />,
    group: 'สินค้าและคลัง',
  },
  { label: 'สต๊อก', icon: <BoxIcon />, group: 'สินค้าและคลัง' },
  { label: 'วัตถุดิบ', icon: <BoxesIcon />, group: 'สินค้าและคลัง' },
  {
    label: 'สาขา SBC',
    icon: <MapPinHouseIcon />,
    group: 'สาขาและแฟรนไชส์',
  },
  {
    label: 'สาขาแฟรนไชส์',
    icon: <MapPinPlusIcon />,
    group: 'สาขาและแฟรนไชส์',
  },
  { label: 'ตารางพนักงาน', icon: <UsersIcon />, group: 'บุคลากร' },
  { label: 'ลงเวลาพนักงาน', icon: <ClockIcon />, group: 'บุคลากร' },
  { label: 'คำขอลาพนักงาน', icon: <ReceiptTextIcon />, group: 'บุคลากร' },
  {
    label: 'ประวัติการทำรายการ',
    icon: <ReceiptTextIcon />,
    group: 'ติดตามและตรวจสอบ',
  },
];
