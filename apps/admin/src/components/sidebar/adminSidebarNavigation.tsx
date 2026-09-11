import {
  BoxIcon,
  BoxesIcon,
  ClockIcon,
  FilePenLineIcon,
  HistoryIcon,
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
    id: 'sbc-products',
    label: 'เมนูและสินค้า',
    icon: <ReceiptTextIcon />,
    group: 'สินค้าและคลังสาขา SBC',
  },
  {
    id: 'sbc-drink-stock',
    label: 'สต๊อกอุปกรณ์เครื่องดื่ม',
    icon: <BoxIcon />,
    group: 'สินค้าและคลังสาขา SBC',
  },
  {
    id: 'sbc-postal-stock',
    label: 'สต๊อกอุปกรณ์ไปรษณีย์',
    icon: <BoxIcon />,
    group: 'สินค้าและคลังสาขา SBC',
  },
  {
    id: 'sbc-ingredients',
    label: 'วัตถุดิบ',
    icon: <BoxesIcon />,
    group: 'สินค้าและคลังสาขา SBC',
  },
  {
    id: 'franchise-products',
    label: 'เมนูและสินค้า',
    icon: <ReceiptTextIcon />,
    group: 'สินค้าและคลังแฟรนไชส์',
  },
  {
    id: 'franchise-drink-stock',
    label: 'สต๊อกอุปกรณ์เครื่องดื่ม',
    icon: <BoxIcon />,
    group: 'สินค้าและคลังแฟรนไชส์',
  },
  {
    id: 'franchise-postal-stock',
    label: 'สต๊อกอุปกรณ์ไปรษณีย์',
    icon: <BoxIcon />,
    group: 'สินค้าและคลังแฟรนไชส์',
  },
  {
    id: 'franchise-ingredients',
    label: 'วัตถุดิบ',
    icon: <BoxesIcon />,
    group: 'สินค้าและคลังแฟรนไชส์',
  },
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
  { label: 'คำขอลาพนักงาน', icon: <FilePenLineIcon />, group: 'บุคลากร' },
  {
    label: 'ประวัติการทำรายการ',
    icon: <HistoryIcon />,
    group: 'ติดตามและตรวจสอบ',
  },
];
