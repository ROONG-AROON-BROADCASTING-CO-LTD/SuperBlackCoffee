'use client';

import Box from '@mui/material/Box';
import { websiteSx } from './websiteSx';
import Image from 'next/image';
import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowUpRightIcon,
  BadgeIcon,
  BoxIcon,
  CoffeeIcon,
  EvChargerIcon,
  MapPinHouseIcon,
  UsersIcon,
} from '@stackbuild/ui/icons';
import { trackEvent } from './GoogleAnalytics';
import { useWebsiteLanguage } from './WebsiteLanguageProvider';

const branches = [
  {
    slug: 'ayutthaya',
    name: 'อยุธยา',
    address:
      '15/78 หมู่ที่ 3 ถนนป่ามะพร้าว ตำบลท่าวาสุกรี อำเภอพระนครศรีอยุธยา จังหวัดพระนครศรีอยุธยา 13000',
    phone: '061-884-9960',
    hours: '08:00–20:30 น.',
    map: 'https://maps.app.goo.gl/B2sXw1XnoACsmphA9',
    image: '/branches/ayutthaya-ev-dusk.png',
    status: 'เปิดทุกวัน',
  },
  {
    slug: 'phitsanulok',
    name: 'พิษณุโลก',
    address:
      '654/18 ถนนพระองค์ขาว ซอย 4 ตำบลในเมือง อำเภอเมืองพิษณุโลก จังหวัดพิษณุโลก 65000',
    phone: '080-174-7757',
    hours: '08:00–20:30 น.',
    map: 'https://maps.app.goo.gl/rbCG1HbrHJXHffSk6',
    image: '/branches/phitsanulok-dusk.png',
    status: 'เปิดทุกวัน',
  },
  {
    slug: 'pracha-uthit',
    name: 'ประชาอุทิศ',
    address:
      '68 10 ซ. ประชาอุทิศ 22 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    phone: '081-825-3584',
    hours: '08:00–20:30 น.',
    map: '',
    image: '/branches/pracha-uthit-sunset.png',
    status: 'เปิดทุกวัน',
  },
];

const menus: Record<string, { name: string; detail: string; image: string }[]> =
  {};

const assetMenus: Record<
  string,
  { name: string; detail: string; image: string }[]
> = {
  เมนูปั่น: [
    {
      name: 'สตรอว์เบอร์รี ปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-สตรอวเบอรร-ปน.png',
    },
    {
      name: 'ลิ้นจี่ปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-ลนจปน.png',
    },
    {
      name: 'ชาเขียวปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-ชาเขยวปน.png',
    },
    {
      name: 'โอรีโอ้นมสดปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-โอรโอนมสดปน.png',
    },
    {
      name: 'คาราเมลมะพร้าวนมสดปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-คาราเมลมะพราวนมสดปน.png',
    },
    {
      name: 'มัทฉะมะพร้าวปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-มทฉะมะพราวปน.png',
    },
    {
      name: 'นมสดปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-นมสดปน.png',
    },
    {
      name: 'โกโก้ปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-โกโกปน.png',
    },
    {
      name: 'สตรอว์เบอร์รีนมสดปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-สตรอวเบอรรนมสดปน.png',
    },
    {
      name: 'เสาวรสปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-เสาวรสปน.png',
    },
    {
      name: 'ชาไทยปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-ชาไทยปน.png',
    },
    {
      name: 'โกโก้ปั่นวิปครีม',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-โกโกปนวปครม.png',
    },
    {
      name: 'โอรีโอ้นมสดกาแฟปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-โอรโอนมสดกาแฟปน.png',
    },
    {
      name: 'ส้มนมสด ปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-สมนมสด-ปน.png',
    },
    {
      name: 'มะม่วงปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-มะมวงปน.png',
    },
    {
      name: 'น้ำส้มปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-นำสมปน.png',
    },
    {
      name: 'มะพร้าวนมสดปั่น',
      detail: 'เมนูปั่น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ปน-มะพราวนมสดปน.png',
    },
  ],
  น้ำอัดลม: [
    {
      name: 'สไปร์ท',
      detail: 'เมนูน้ำอัดลม คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/นำอดลม-สไปรท.png',
    },
    {
      name: 'โซดาร็อก',
      detail: 'เมนูน้ำอัดลม คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/นำอดลม-โซดารอก.png',
    },
    {
      name: 'น้ำแดงแฟนต้า',
      detail: 'เมนูน้ำอัดลม คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/นำอดลม-นำแดงแฟนตา.png',
    },
    {
      name: 'โซดา',
      detail: 'เมนูน้ำอัดลม คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/นำอดลม-โซดา.png',
    },
    {
      name: 'น้ำดื่ม',
      detail: 'เมนูน้ำอัดลม คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/นำอดลม-นำดม.png',
    },
    {
      name: 'ชเว็ปมะนาว',
      detail: 'เมนูน้ำอัดลม คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/นำอดลม-ชเวปมะนาว.png',
    },
    {
      name: 'โค้กออริจินอล',
      detail: 'เมนูน้ำอัดลม คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/นำอดลม-โคกออรจนอล.png',
    },
  ],
  ไร่ทองวิมล: [
    {
      name: 'ขนุนนมสดปั่น',
      detail: 'เมนูไร่ทองวิมล คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ไรทองวมล-ขนนนมสดปน.png',
    },
    {
      name: 'ขนุนมะพร้าวปั่นนมสด',
      detail: 'เมนูไร่ทองวิมล คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ไรทองวมล-ขนนมะพราวปนนมสด.png',
    },
    {
      name: 'อโวคาโดมะพร้าวนมสด',
      detail: 'เมนูไร่ทองวิมล คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ไรทองวมล-อโวคาโดมะพราวนมสด.png',
    },
    {
      name: 'กล้วยปั่นนมสด',
      detail: 'เมนูไร่ทองวิมล คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ไรทองวมล-กลวยปนนมสด.png',
    },
    {
      name: 'ช็อกโกแลตกล้วยปั่น',
      detail: 'เมนูไร่ทองวิมล คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ไรทองวมล-ชอกโกแลตกลวยปน.png',
    },
    {
      name: 'อโวคาโดกาแฟนมสด ปั่น',
      detail: 'เมนูไร่ทองวิมล คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ไรทองวมล-อโวคาโดกาแฟนมสด-ปน.png',
    },
    {
      name: 'อโวคาโดน้ำผึ้งนมสด ปั่น',
      detail: 'เมนูไร่ทองวิมล คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ไรทองวมล-อโวคาโดนำผงนมสด-ปน.png',
    },
    {
      name: 'อโวคาโดโยเกิร์ตนมสด ปั่น',
      detail: 'เมนูไร่ทองวิมล คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ไรทองวมล-อโวคาโดโยเกรตนมสด-ปน.png',
    },
    {
      name: 'อโวคาโดนมสด ปั่น',
      detail: 'เมนูไร่ทองวิมล คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ไรทองวมล-อโวคาโดนมสด-ปน.png',
    },
  ],
  กาแฟเย็น: [
    {
      name: 'อเมริกาโน่โฟมมัทฉะ',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-อเมรกาโนโฟมมทฉะ.png',
    },
    {
      name: 'ม็อคค่า',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-มอคคา.png',
    },
    {
      name: 'ลาเต้',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-ลาเต.png',
    },
    {
      name: 'อเมริกาโน่',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-อเมรกาโน.png',
    },
    {
      name: 'วนิลาลาเต้',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-วนลาลาเต.png',
    },
    {
      name: 'ชาไทยกาแฟ',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-ชาไทยกาแฟ.png',
    },
    {
      name: 'อเมริกาโน่มะม่วง',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-อเมรกาโนมะมวง.png',
    },
    {
      name: 'อเมริกาโน่น้ำผึ้ง',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-อเมรกาโนนำผง.png',
    },
    {
      name: 'บลูเบอร์รีลาเต้',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-บลเบอรรลาเต.png',
    },
    {
      name: 'บลูฮาวายลาเต้',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-บลฮาวายลาเต.png',
    },
    {
      name: 'คาปูชิโน่',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-คาปชโน.png',
    },
    {
      name: 'อเมริกาโน่น้ำผึ้งมะนาว',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-อเมรกาโนนำผงมะนาว.png',
    },
    {
      name: 'SUPER BLACK DARL COCO',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-super-black-darl-coco.png',
    },
    {
      name: 'อเมริกาโน่มะพร้าว',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-อเมรกาโนมะพราว.png',
    },
    {
      name: 'อเมริกาโน่ส้ม',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-อเมรกาโนสม.png',
    },
    {
      name: 'แอโร่กาโน่',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-แอโรกาโน.png',
    },
    {
      name: 'ชาเขียวกาแฟ',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-ชาเขยวกาแฟ.png',
    },
    {
      name: 'อเมริกาโน่สตรอว์เบอร์รี',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-อเมรกาโนสตรอวเบอรร.png',
    },
    {
      name: 'อเมริกาโน่ลิ้นจี่',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-อเมรกาโนลนจ.png',
    },
    {
      name: 'เอสเปรสโซ่',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-เอสเปรสโซ.png',
    },
    {
      name: 'ลาเต้มะม่วง',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-ลาเตมะมวง.png',
    },
    {
      name: 'อเมริกาโน่เสาวรส',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-อเมรกาโนเสาวรส.png',
    },
    {
      name: 'สตรอว์เบอร์รีลาเต้',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-สตรอวเบอรรลาเต.png',
    },
    {
      name: 'อเมริกาโน่มัทฉะ',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-อเมรกาโนมทฉะ.png',
    },
    {
      name: 'อเมริกาโน่ยูสุ',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-อเมรกาโนยส.png',
    },
    {
      name: 'คาราเมลมัทคิอาโต้',
      detail: 'เมนูกาแฟเย็น คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-กาแฟเยน-คาราเมลมทคอาโต.png',
    },
  ],
  ร้อน: [
    {
      name: 'ชาไทยร้อน',
      detail: 'เมนูร้อน คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-รอน-ชาไทยรอน.png',
    },
    {
      name: 'ช็อตคั่วกลางพรีเมี่ยม',
      detail: 'เมนูร้อน คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-รอน-ชอตควกลางพรเมยม.png',
    },
    {
      name: 'นมสดคาราเมลร้อน',
      detail: 'เมนูร้อน คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-รอน-นมสดคาราเมลรอน.png',
    },
    {
      name: 'มัทฉะร้อน',
      detail: 'เมนูร้อน คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-รอน-มทฉะรอน.png',
    },
    {
      name: 'ม็อคค่าร้อน',
      detail: 'เมนูร้อน คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-รอน-มอคคารอน.png',
    },
    {
      name: 'ช็อตคั่วเข้ม',
      detail: 'เมนูร้อน คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-รอน-ชอตควเขม.png',
    },
    {
      name: 'ช็อตคั่วกลาง',
      detail: 'เมนูร้อน คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-รอน-ชอตควกลาง.png',
    },
    {
      name: 'เอสเปรสโซ่ร้อน',
      detail: 'เมนูร้อน คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-รอน-เอสเปรสโซรอน.png',
    },
    {
      name: 'ซูเปอร์แบล็คดาร์คร้อน',
      detail: 'เมนูร้อน คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-รอน-ซเปอรแบลคดารครอน.png',
    },
    {
      name: 'ลาเต้ร้อน',
      detail: 'เมนูร้อน คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-รอน-ลาเตรอน.png',
    },
    {
      name: 'ชาเขียวร้อน',
      detail: 'เมนูร้อน คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-รอน-ชาเขยวรอน.png',
    },
    {
      name: 'คาปูชิโน่ร้อน',
      detail: 'เมนูร้อน คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-รอน-คาปชโนรอน.png',
    },
    {
      name: 'นมสดร้อน',
      detail: 'เมนูร้อน คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-รอน-นมสดรอน.png',
    },
    {
      name: 'อเมริกาโน่ร้อน',
      detail: 'เมนูร้อน คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-รอน-อเมรกาโนรอน.png',
    },
    {
      name: 'โกโก้ร้อน',
      detail: 'เมนูร้อน คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-รอน-โกโกรอน.png',
    },
  ],
  อโวคาโด้: [
    {
      name: 'ขนมปังหน้าอโวคาโด้',
      detail: 'เมนูอโวคาโด้ คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/อโวคาโด-ขนมปงหนาอโวคาโด.png',
    },
    {
      name: 'โยเกิร์ตอโวคาโดผลไม้รวม',
      detail: 'เมนูอโวคาโด้ คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/อโวคาโด-โยเกรตอโวคาโดผลไมรวม.png',
    },
    {
      name: 'อโวคาโด้ปั่นโยเกิร์ต',
      detail: 'เมนูอโวคาโด้ คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/อโวคาโด-อโวคาโดปนโยเกรต.png',
    },
    {
      name: 'อโวคาโด้ปั่นนมสด',
      detail: 'เมนูอโวคาโด้ คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/อโวคาโด-อโวคาโดปนนมสด.png',
    },
    {
      name: 'สลัดอะโวคาโดผักรวม',
      detail: 'เมนูอโวคาโด้ คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/อโวคาโด-สลดอะโวคาโดผกรวม.png',
    },
    {
      name: 'พื้นหลัง',
      detail: 'เมนูอโวคาโด้ คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/อโวคาโด-พนหลง.png',
    },
    {
      name: 'อโวคาโด้ปั่นนมสดน้ำผึ้ง',
      detail: 'เมนูอโวคาโด้ คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/อโวคาโด-อโวคาโดปนนมสดนำผง.png',
    },
    {
      name: 'สลัดอะโวคาโด',
      detail: 'เมนูอโวคาโด้ คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/อโวคาโด-สลดอะโวคาโด.png',
    },
    {
      name: 'อโวคาโด้ปั่นนมสดกาแฟดำ',
      detail: 'เมนูอโวคาโด้ คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/อโวคาโด-อโวคาโดปนนมสดกาแฟดำ.png',
    },
    {
      name: '1',
      detail: 'เมนูอโวคาโด้ คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/อโวคาโด-1.png',
    },
  ],
  มะพร้าว: [
    {
      name: 'มัทฉะโฟมมะพร้าว',
      detail: 'เมนูมะพร้าว คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-มะพราว-มทฉะโฟมมะพราว.png',
    },
    {
      name: 'มะพร้าวโฟมชาไทย',
      detail: 'เมนูมะพร้าว คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-มะพราว-มะพราวโฟมชาไทย.png',
    },
    {
      name: 'น้ำมะพร้าวสด',
      detail: 'เมนูมะพร้าว คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-มะพราว-นำมะพราวสด.png',
    },
    {
      name: 'มะพร้าวโฟมกาแฟ',
      detail: 'เมนูมะพร้าว คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-มะพราว-มะพราวโฟมกาแฟ.png',
    },
    {
      name: 'มะพร้าวโฟมชาเขียว',
      detail: 'เมนูมะพร้าว คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-มะพราว-มะพราวโฟมชาเขยว.png',
    },
    {
      name: 'มะพร้าวลูกทองวิมล',
      detail: 'เมนูมะพร้าว คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-มะพราว-มะพราวลกทองวมล.png',
    },
  ],
  ชา: [
    {
      name: 'มัทฉะมะม่วงนมสด',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-มทฉะมะมวงนมสด.png',
    },
    {
      name: 'ชาไทยโกโก้',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาไทยโกโก.png',
    },
    {
      name: 'มัทฉะสตรอว์เบอร์รี',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-มทฉะสตรอวเบอรร.png',
    },
    {
      name: 'ชาเขียวส้ม',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาเขยวสม.png',
    },
    {
      name: 'มัทฉะลาเต้สตรอว์เบอร์รี',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-มทฉะลาเตสตรอวเบอรร.png',
    },
    {
      name: 'ชาเขียวมะม่วงนมสด',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาเขยวมะมวงนมสด.png',
    },
    {
      name: 'นมสดส้มวิปครีม',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-นมสดสมวปครม.png',
    },
    {
      name: 'โกโก้นมสดคาราเมล',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-โกโกนมสดคาราเมล.png',
    },
    {
      name: 'ชาไทย',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาไทย.png',
    },
    {
      name: 'มัทฉะละเต้มะม่วง',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-มทฉะละเตมะมวง.png',
    },
    {
      name: 'ชาเขียวน้ำผึ้งมะนาว',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาเขยวนำผงมะนาว.png',
    },
    {
      name: 'มัทฉะมะพร้าว',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-มทฉะมะพราว.png',
    },
    {
      name: 'มัทฉะลิ้นจี่',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-มทฉะลนจ.png',
    },
    {
      name: 'โกโก้มะม่วงนมสด',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-โกโกมะมวงนมสด.png',
    },
    {
      name: 'นมชมพู',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-นมชมพ.png',
    },
    {
      name: 'ชาไทยมะม่วงนมสด',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาไทยมะมวงนมสด.png',
    },
    {
      name: 'คาราเมลมะพร้าวนมสด',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-คาราเมลมะพราวนมสด.png',
    },
    {
      name: 'ชามะนาว 1',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชามะนาว-1.png',
    },
    {
      name: 'ชาไทยน้ำผึ้งมะนาว',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาไทยนำผงมะนาว.png',
    },
    {
      name: 'รูทเบีย',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-รทเบย.png',
    },
    {
      name: 'ช็อกโกแลตนมสด',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชอกโกแลตนมสด.png',
    },
    {
      name: 'นมสด',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-นมสด.png',
    },
    {
      name: 'มัทฉะเลม่อนน้ำผึ้ง',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-มทฉะเลมอนนำผง.png',
    },
    {
      name: 'นมชมพูโกโก้',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-นมชมพโกโก.png',
    },
    {
      name: 'สตรอว์เบอร์รีมิ้นต์',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-สตรอวเบอรรมนต.jpg',
    },
    {
      name: 'ชาเขียวสตรอว์เบอร์รี',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาเขยวสตรอวเบอรร.png',
    },
    {
      name: 'ช็อกโกแลตมินต์',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชอกโกแลตมนต.png',
    },
    {
      name: 'มัทฉะนมชมพู',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-มทฉะนมชมพ.png',
    },
    {
      name: 'สตรอว์เบอร์รีนมสด',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-สตรอวเบอรรนมสด.png',
    },
    {
      name: 'ชาไทยลิ้นจี่',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาไทยลนจ.png',
    },
    {
      name: 'เพียวมัทฉะ',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-เพยวมทฉะ.png',
    },
    {
      name: 'ชาเขียว',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาเขยว.png',
    },
    {
      name: 'ชาลิ้นจี่',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาลนจ.png',
    },
    {
      name: 'น้ำผึ้งเลม่อน',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-นำผงเลมอน.png',
    },
    {
      name: 'บลูเบอรี่นมสด',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-บลเบอรนมสด.png',
    },
    {
      name: 'โกโก้เย็น',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-โกโกเยน.png',
    },
    {
      name: 'ชาไทยสตรอว์เบอร์รี',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาไทยสตรอวเบอรร.png',
    },
    {
      name: 'ชาไทยส้ม',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาไทยสม.png',
    },
    {
      name: 'มัทฉะเลม่อน',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-มทฉะเลมอน.png',
    },
    {
      name: 'ชาพีช',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาพช.png',
    },
    {
      name: 'มัทฉะส้ม',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-มทฉะสม.png',
    },
    {
      name: 'นมสดคาราเมล',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-นมสดคาราเมล.png',
    },
    {
      name: 'มัทฉะโกโก้',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-มทฉะโกโก.png',
    },
    {
      name: 'มัทฉะลาเต้',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-มทฉะลาเต.png',
    },
    {
      name: 'มะพร้าวนมสด',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-มะพราวนมสด.png',
    },
    {
      name: 'ลิ้นจี่นมสดวิปครีม',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ลนจนมสดวปครม.png',
    },
    {
      name: 'ชาเขียวโกโก้',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาเขยวโกโก.png',
    },
    {
      name: 'ชามะนาว',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชามะนาว.png',
    },
    {
      name: 'ชาเขียวลิ้นจี่',
      detail: 'เมนูชา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-ชา-ชาเขยวลนจ.png',
    },
  ],
  โซดา: [
    {
      name: 'สตรอว์เบอร์รีเลม่อนโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-สตรอวเบอรรเลมอนโซดา.png',
    },
    {
      name: 'มิ้นต์แดงโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-มนตแดงโซดา.png',
    },
    {
      name: 'พีชโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-พชโซดา.png',
    },
    {
      name: 'บลุเบอร์รี่น้ำผึ้งมะนาวโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-บลเบอรรนำผงมะนาวโซดา.png',
    },
    {
      name: 'บลูเบอรีโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-บลเบอรโซดา.png',
    },
    {
      name: 'น้ำส้มน้ำผึ้งโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-นำสมนำผงโซดา.png',
    },
    {
      name: 'น้ำแดงมะนาวโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-นำแดงมะนาวโซดา.png',
    },
    {
      name: 'ลิ้นจี่น้ำผึ้งโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-ลนจนำผงโซดา.png',
    },
    {
      name: 'น้ำแดงน้ำผึ้งเลม่อนโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-นำแดงนำผงเลมอนโซดา.png',
    },
    {
      name: 'พีชเลม่อนโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-พชเลมอนโซดา.png',
    },
    {
      name: 'บลูมิ้นต์โซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-บลมนตโซดา.png',
    },
    {
      name: 'ลิ้นจี่โซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-ลนจโซดา.png',
    },
    {
      name: 'ส้มน้ำผึ้งโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-สมนำผงโซดา.png',
    },
    {
      name: 'สตรอว์เบอร์รีโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-สตรอวเบอรรโซดา.png',
    },
    {
      name: 'แดงโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-แดงโซดา.png',
    },
    {
      name: 'ชาเขียวมะนาวน้ำผึ้งโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-ชาเขยวมะนาวนำผงโซดา.png',
    },
    {
      name: 'ชาเขียวมะนาวโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-ชาเขยวมะนาวโซดา.png',
    },
    {
      name: 'ชาไทยมะนาวโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-ชาไทยมะนาวโซดา.png',
    },
    {
      name: 'แดงมะนาวโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-แดงมะนาวโซดา.png',
    },
    {
      name: 'มะนาวโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-มะนาวโซดา.png',
    },
    {
      name: 'เลม่อนโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-เลมอนโซดา.png',
    },
    {
      name: 'เลม่อนน้ำผึ้งโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-เลมอนนำผงโซดา.png',
    },
    {
      name: 'บลูฮาวายโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-บลฮาวายโซดา.jfif',
    },
    {
      name: 'บลุฮาวายมะนาวโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-บลฮาวายมะนาวโซดา.png',
    },
    {
      name: 'เสาวรสโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-เสาวรสโซดา.png',
    },
    {
      name: 'ส้มโซดา',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-สมโซดา.png',
    },
    {
      name: 'Annotation 2026-09-14 195314',
      detail: 'เมนูโซดา คัดสรรจากวัตถุดิบคุณภาพ',
      image: '/menu/catalog/เมน-โซดา-annotation-2026-09-14-195314.jpg',
    },
  ],
};

const foodMenus: Record<
  string,
  { name: string; detail: string; image: string }[]
> = {
  อาหารจานเดียว: [
    {
      name: 'ข้าวหน้าไข่ข้นซีฟู้ด',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-22.jpg',
    },
    {
      name: 'ข้าวไก่กรอบยำแซ่บ',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-23.jpg',
    },
    {
      name: 'ข้าวไก่กรอบยำสมุนไพร',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-25.jpg',
    },
    {
      name: 'ข้าวกะเพราเทมเป้',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-26.jpg',
    },
    {
      name: 'ข้าวไข่เจียวหมูสับ',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-27.jpg',
    },
    {
      name: 'ข้าวไข่ข้นหมูสับ',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-29.jpg',
    },
    {
      name: 'ข้าวไข่ข้นหมูสับพริกสด',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-30.jpg',
    },
    {
      name: 'ข้าวไก่ทอดกระเทียม',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-31.jpg',
    },
    {
      name: 'ข้าวผัดซีฟู้ด',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-32.jpg',
    },
    {
      name: 'ข้าวผัดกะเพราไก่',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-33.jpg',
    },
  ],
  เมนูไข่: [
    {
      name: 'ไข่ข้นต้นหอม',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-24.jpg',
    },
    {
      name: 'ไข่ข้นแฮม',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-54.jpg',
    },
    {
      name: 'ไข่ข้นรวมมิตรทะเล',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-55.jpg',
    },
  ],
  กับข้าว: [
    {
      name: 'ไก่กรอบทอด',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-34.jpg',
    },
    {
      name: 'ทะเลผัดพริกแห้ง',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-35.jpg',
    },
    {
      name: 'กะเพราเทมเป้',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-36.jpg',
    },
    {
      name: 'ไก่ทอดกระเทียมพริกแห้ง',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-42.jpg',
    },
    {
      name: 'กะเพราไก่',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-46.jpg',
    },
    {
      name: 'ยำทะเลพริกสด',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-47.jpg',
    },
    {
      name: 'ไก่ผัดพริกใบกะเพรา',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-48.jpg',
    },
    {
      name: 'ปีกไก่ทอดกระเทียม',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-49.jpg',
    },
    {
      name: 'มาม่าไข่ข้นไก่',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-53.jpg',
    },
  ],
  สลัดและยำ: [
    {
      name: 'ยำทะเลรวม',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-38.jpg',
    },
    {
      name: 'หมูมะนาว',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-40.jpg',
    },
    {
      name: 'สลัดไก่ย่าง',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-41.jpg',
    },
    {
      name: 'สลัดทูน่าอะโวคาโด',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-43.jpg',
    },
    {
      name: 'ยำหมูพริกสด',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-44.jpg',
    },
  ],
  ของว่างและขนม: [
    {
      name: 'แซนด์วิชแฮมชีส',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-37.jpg',
    },
    {
      name: 'วาฟเฟิลแพ็ก',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-39.jpg',
    },
    {
      name: 'เฟรนช์ฟรายส์',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-45.jpg',
    },
    {
      name: 'ป๊อปคอร์น',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-50.jpg',
    },
    {
      name: 'นักเก็ตไก่',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-51.jpg',
    },
    {
      name: 'บานอฟฟี่พาย',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-52.jpg',
    },
  ],
  เครื่องเคียง: [
    {
      name: 'ข้าวสวย',
      detail: 'ชื่อเมนูเบื้องต้นจากภาพ',
      image: '/menu/food/food-28.jpg',
    },
  ],
};

const menuCategoryTranslations: Record<string, string> = {
  เมนูปั่น: 'Blended drinks',
  น้ำอัดลม: 'Soft drinks',
  ไร่ทองวิมล: 'Rai Thong Wimon specials',
  กาแฟเย็น: 'Iced coffee',
  ร้อน: 'Hot drinks',
  อโวคาโด้: 'Avocado',
  มะพร้าว: 'Coconut',
  ชา: 'Tea & matcha',
  โซดา: 'Soda',
  อาหารจานเดียว: 'Rice dishes',
  เมนูไข่: 'Egg dishes',
  กับข้าว: 'A la carte',
  สลัดและยำ: 'Salads & spicy dishes',
  ของว่างและขนม: 'Snacks & desserts',
  เครื่องเคียง: 'Sides',
};

const menuTranslations: Record<string, { name: string; detail: string }[]> = {
  กาแฟ: [
    ['Americano', 'A bright iced black coffee for every moment.'],
    ['Latte', 'Smooth, balanced coffee with velvety milk.'],
    ['Cappuccino', 'Bold espresso finished with soft milk foam.'],
    ['Mocha', 'Coffee and cocoa together for a richer cup.'],
    [
      'Espresso',
      'A concentrated shot for people who love coffee-forward flavour.',
    ],
    ['Vanilla Latte', 'A smooth latte with a gentle vanilla aroma.'],
    [
      'Honey Americano',
      'Bold black coffee balanced by delicate honey sweetness.',
    ],
    [
      'Coconut Americano',
      'Fragrant coconut and black coffee in a refreshing cup.',
    ],
  ].map(([name, detail]) => ({ name, detail })),
  ชาและมัทฉะ: [
    ['Thai Tea', 'A familiar, fragrant Thai tea for any time of day.'],
    [
      'Matcha Latte',
      'Full-bodied matcha blended with milk in perfect balance.',
    ],
    ['Coconut Matcha', 'Refreshing matcha paired with coconut.'],
    ['Pure Matcha', 'A clear matcha flavour for green-tea lovers.'],
    ['Green Tea', 'Fragrant, refreshing green tea that is easy to enjoy.'],
    ['Honey Lemon Green Tea', 'Green tea with a lively sweet-and-tart finish.'],
    ['Matcha Lemon', 'Matcha and lemon for a bright, refreshing flavour.'],
    ['Thai Tea Cocoa', 'Fragrant Thai tea with a different cocoa dimension.'],
  ].map(([name, detail]) => ({ name, detail })),
  เมนูปั่น: [
    ['Blended Cocoa', 'Rich cocoa blended cold for an everyday energy lift.'],
    ['Strawberry Milkshake', 'Fruit and fresh milk in a bright, creamy cup.'],
    [
      'Blended Coconut Matcha',
      'Silky matcha and coconut blended cool and smooth.',
    ],
    ['Blended Coconut Milk', 'Fragrant coconut and fresh milk in every sip.'],
    ['Blended Strawberry', 'A cheerful fruit blend served ice-cold.'],
    ['Blended Lychee', 'Fragrant, sweet lychee blended for an easy day.'],
    ['Blended Thai Tea', 'Smooth, chilled Thai tea in blended form.'],
    ['Oreo Milk Blend', 'Fresh milk and Oreo blended for a richer treat.'],
  ].map(([name, detail]) => ({ name, detail })),
};

const branchTranslations: Record<string, { name: string; address: string }> = {
  อยุธยา: {
    name: 'Ayutthaya',
    address:
      '15/78 Moo 3, Pa Maphrao Road, Tha Wasukri, Phra Nakhon Si Ayutthaya, Ayutthaya 13000',
  },
  พิษณุโลก: {
    name: 'Phitsanulok',
    address:
      '654/18 Phra Ong Khao Road, Soi 4, Nai Mueang, Mueang Phitsanulok, Phitsanulok 65000',
  },
  ประชาอุทิศ: {
    name: 'Pracha Uthit',
    address: '68/10 Pracha Uthit Soi 22, Huai Khwang, Bangkok 10310',
  },
};

const branchProfiles = {
  ayutthaya: {
    staffTotal: 1,
    staff: [
      {
        role: 'บาริสต้า',
        detail: 'ดูแลการเตรียมเครื่องดื่มและบริการลูกค้าประจำสาขา',
        count: '1 คน',
        image: '/coffee/coffee-espresso.png',
      },
    ],
    facilities: [
      [
        'กาแฟและเครื่องดื่ม',
        'เมนูกาแฟ เครื่องดื่ม และของว่างสำหรับทุกช่วงเวลา',
      ],
      ['จุดชาร์จรถ EV', 'พื้นที่ชาร์จรถยนต์ไฟฟ้าในบริเวณสาขา'],
      ['พื้นที่นั่งพัก', 'มุมนั่งพักและทำงานในบรรยากาศสบาย ๆ'],
      ['ที่จอดรถ', 'จุดจอดรถสำหรับลูกค้าที่แวะใช้บริการ'],
    ],
  },
  phitsanulok: {
    staffTotal: 4,
    staff: [
      {
        role: 'เชฟ',
        detail: 'ดูแลการเตรียมอาหารและคุณภาพของเมนูภายในสาขา',
        count: '2 คน',
        image: '/services/service-journey-interior.png',
      },
      {
        role: 'ผู้ช่วยบาริสต้า',
        detail: 'ช่วยเตรียมเครื่องดื่มและดูแลความเรียบร้อยหน้าบาร์',
        count: '1 คน',
        image: '/coffee/coffee-espresso.png',
      },
      {
        role: 'กราฟิก',
        detail: 'ดูแลงานกราฟิกและสื่อประชาสัมพันธ์ของสาขา',
        count: '1 คน',
        image: '/coffee/coffee-storefront.png',
      },
    ],
    facilities: [
      ['กาแฟและเครื่องดื่ม', 'เมนูคัดสรรสำหรับลูกค้าที่แวะพักระหว่างวัน'],
      ['จุดชาร์จรถ EV', 'รองรับการแวะชาร์จรถยนต์ไฟฟ้าอย่างสะดวก'],
      ['พื้นที่นั่งพัก', 'พื้นที่นั่งดื่มกาแฟ ทำงาน หรือพักระหว่างทาง'],
      ['ที่จอดรถ', 'จุดจอดรถใกล้ร้านสำหรับผู้ใช้บริการ'],
    ],
  },
  'pracha-uthit': {
    staffTotal: 0,
    staff: [
      {
        role: 'อื่นๆ',
        detail: 'ยังไม่มีข้อมูลทีมประจำสาขา',
        count: '—',
        image: '/coffee/coffee-storefront.png',
      },
    ],
    facilities: [
      ['กาแฟและเครื่องดื่ม', 'พร้อมเมนูกาแฟและเครื่องดื่มสำหรับทุกไลฟ์สไตล์'],
      ['จุดชาร์จรถ EV', 'จุดชาร์จรถยนต์ไฟฟ้าหลายช่องจอด'],
      ['พื้นที่นั่งพัก', 'มุมพักระหว่างวันสำหรับลูกค้าและผู้เดินทาง'],
      ['ที่จอดรถ', 'พื้นที่จอดรถใกล้จุดบริการและหน้าร้าน'],
    ],
  },
} as const;

const planTranslations: Record<
  string,
  {
    area: string;
    service: string;
    description: string;
    cost: string;
    franchiseFee: string;
    includedServices: string;
  }
> = {
  S: {
    area: '100 sq. wah',
    service: 'A compact coffee shop for an agile business start.',
    description:
      'Made for communities, storefronts, petrol stations, and takeaway points, with quality coffee in an easy-to-manage space.',
    cost: 'THB 1.5–2.5 million',
    franchiseFee: 'THB 300,000',
    includedServices: 'Coffee and beverages with 1 EV charging station',
  },
  M: {
    area: '200 sq. wah',
    service: 'A fuller café with coffee, food, and bakery.',
    description:
      'Made for community malls, offices, and larger petrol stations where guests can sit back and spend more time.',
    cost: 'THB 3.5–5 million',
    franchiseFee: 'THB 500,000',
    includedServices:
      'Coffee, food, bakery, BPOST65 Express, post service, and 2 EV charging stations',
  },
  L: {
    area: '400 sq. wah',
    service: 'A service hub for larger sites and communities.',
    description:
      'Made for main roads, rest stops, and tourist destinations, bringing coffee, food, parcels, EV charging, and activities together.',
    cost: 'THB 7–10 million+',
    franchiseFee: 'THB 700,000',
    includedServices:
      'Coffee, food, bakery, BPOST65 Express, post service, 4 EV charging stations, work space, and mobile café',
  },
};

const plans = [
  {
    size: 'S',
    name: 'Smart Café',
    area: '100 ตร.ว.',
    service: 'ร้านกาแฟขนาดกะทัดรัด สำหรับเริ่มต้นธุรกิจอย่างคล่องตัว',
    description:
      'เหมาะกับชุมชน หน้าอาคาร ปั๊มน้ำมัน และจุดซื้อกลับ เน้นกาแฟและเครื่องดื่มคุณภาพในพื้นที่ที่บริหารจัดการได้ง่าย',
    cost: '1.5–2.5 ล้านบาท',
    franchiseFee: '300,000 บาท',
    includedServices: 'กาแฟและเครื่องดื่ม พร้อม EV Charging 1 สถานี',
    image: '/franchise/franchise-plan-s.png',
    imageEn: '/franchise/franchise-plan-s-en.png',
  },
  {
    size: 'M',
    name: 'Lifestyle Café',
    area: '200 ตร.ว.',
    service: 'คาเฟ่ครบขึ้น พร้อมกาแฟ อาหาร และเบเกอรี่',
    description:
      'เหมาะกับคอมมูนิตี้มอลล์ ออฟฟิศ หรือปั๊มขนาดใหญ่ สำหรับลูกค้าที่ต้องการนั่งพักและใช้เวลาในร้านมากขึ้น',
    cost: '3.5–5 ล้านบาท',
    franchiseFee: '500,000 บาท',
    includedServices:
      'กาแฟ อาหาร เบเกอรี่ BPOST65 Express ไปรษณีย์ และ EV Charging 2 สถานี',
    image: '/franchise/franchise-plan-m.png',
    imageEn: '/franchise/franchise-plan-m-en.png',
  },
  {
    size: 'L',
    name: 'Lifestyle Hub',
    area: '400 ตร.ว.',
    service: 'ศูนย์รวมบริการสำหรับทำเลขนาดใหญ่และชุมชน',
    description:
      'เหมาะกับถนนหลัก จุดพักรถ และแหล่งท่องเที่ยว รวมกาแฟ อาหาร พัสดุ EV Charging และพื้นที่กิจกรรมไว้ในจุดเดียว',
    cost: '7–10 ล้านบาทขึ้นไป',
    franchiseFee: '700,000 บาท',
    includedServices:
      'กาแฟ อาหาร เบเกอรี่ BPOST65 Express ไปรษณีย์ EV Charging 4 สถานี Work Space และ Mobile Café',
    image: '/franchise/franchise-plan-l.png',
    imageEn: '/franchise/franchise-plan-l-en.png',
  },
];

const serviceItems = [
  {
    title: 'Coffee & Beverage',
    detail: 'กาแฟคุณภาพและเครื่องดื่มที่ตั้งใจทำในทุกแก้ว',
    image: '/services/superblackcoffee-service-coffee.png',
  },
  {
    title: 'Food & Bakery',
    detail: 'อาหารและเบเกอรี่สำหรับทุกช่วงเวลาของวัน',
    image: '/services/superblackcoffee-service-bakery.png',
  },
  {
    title: 'BPOST65 Express',
    detail: 'บริการที่เติมความสะดวกให้การเดินทางและการใช้ชีวิต',
    image: '/services/superblackcoffee-service-bpost65-express.png',
  },
  {
    title: 'EV Charging',
    detail: 'จุดพักและชาร์จพลังให้พร้อมเดินทางต่อ',
    image: '/services/superblackcoffee-service-ev-charging.png',
  },
  {
    title: 'Mobile Café',
    detail: 'ประสบการณ์กาแฟที่เดินทางไปกับคุณ',
    image: '/services/superblackcoffee-service-control.png',
  },
];

const heroServiceCards = [
  {
    title: 'PREMIUM COFFEE',
    detail: 'กาแฟพรีเมียมคัดสรร เพื่อทุกช่วงเวลาของคุณ',
    image: '/services/superblackcoffee-service-coffee.png',
    href: '/services/premium-coffee',
  },
  {
    title: 'EV CHARGING',
    detail: 'สถานีชาร์จรถยนต์ไฟฟ้า มาตรฐาน ปลอดภัย',
    image: '/services/superblackcoffee-service-ev-charging.png',
    href: '/services/ev-charging',
  },
  {
    title: 'BPOST65 EXPRESS',
    detail: 'บริการจัดส่งพัสดุที่สะดวกในทุกเส้นทาง',
    image: '/services/superblackcoffee-service-bpost65-express.png',
    href: '/services/bpost65-express',
  },
  {
    title: 'FRANCHISE',
    detail: 'ร่วมเติบโตไปด้วยกัน กับธุรกิจที่มั่นคง',
    image: '/franchise/superblackcoffee-franchise-m.png',
    href: '/services/franchise',
  },
  {
    title: 'SUPERBLACK CONTROL',
    detail: 'ระบบบริหารจัดการร้านค้าและแฟรนไชส์ครบวงจร',
    image: '/services/superblackcoffee-service-control.png',
    href: '/services/superblack-control',
  },
];

const heroServiceCardsEn = [
  {
    title: 'PREMIUM COFFEE',
    detail: 'Thoughtfully selected premium coffee for every moment.',
  },
  { title: 'EV CHARGING', detail: 'Safe, reliable EV charging stations.' },
  {
    title: 'BPOST65 EXPRESS',
    detail: 'Convenient parcel delivery for every journey.',
  },
  {
    title: 'FRANCHISE',
    detail: 'Grow with a business built for the long term.',
  },
  {
    title: 'SUPERBLACK CONTROL',
    detail: 'A complete system for stores and franchise operations.',
  },
];

const heroStats = [
  { icon: 'branch', value: '50+', label: 'BRANCHES', detail: 'สาขาทั่วประเทศ' },
  {
    icon: 'coffee',
    value: '1M+',
    label: 'CUPS SERVED',
    detail: 'แก้วที่เราเสิร์ฟ',
  },
  {
    icon: 'customers',
    value: '100K+',
    label: 'HAPPY CUSTOMERS',
    detail: 'ลูกค้าที่พึงพอใจ',
  },
  { icon: 'ev', value: '30+', label: 'EV STATIONS', detail: 'สถานีชาร์จ EV' },
  {
    icon: 'parcel',
    value: '200K+',
    label: 'PARCELS DELIVERED',
    detail: 'พัสดุที่จัดส่ง',
  },
  { icon: 'award', value: 'AWARD', label: 'WINNER', detail: 'รางวัลคุณภาพ' },
] as const;

const heroStatsEn = [
  { label: 'BRANCHES', detail: 'branches nationwide' },
  { label: 'CUPS SERVED', detail: 'cups served' },
  { label: 'HAPPY CUSTOMERS', detail: 'happy customers' },
  { label: 'EV STATIONS', detail: 'EV charging stations' },
  { label: 'PARCELS DELIVERED', detail: 'parcels delivered' },
  { label: 'WINNER', detail: 'quality awards' },
] as const;

type HeroStatIconName = (typeof heroStats)[number]['icon'];

function HeroStatIcon({
  icon,
  animate,
}: {
  icon: HeroStatIconName;
  animate: boolean;
}) {
  switch (icon) {
    case 'branch':
      return <MapPinHouseIcon size={46} animate={animate} />;
    case 'coffee':
      return <CoffeeIcon size={46} animate={animate} />;
    case 'customers':
      return <UsersIcon size={46} animate={animate} />;
    case 'ev':
      return <EvChargerIcon size={46} isAnimating={animate} />;
    case 'parcel':
      return <BoxIcon size={46} animate={animate} />;
    case 'award':
      return <BadgeIcon size={46} animate={animate} />;
  }
}

function Arrow() {
  return (
    <ArrowUpRightIcon
      aria-hidden="true"
      className="sb-animated-arrow"
      size={24}
    />
  );
}

function Photo({
  src,
  alt,
  className = '',
  priority = false,
  lazy = false,
  position = 'center',
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  lazy?: boolean;
  position?: string;
}) {
  return (
    <Box
      component="div"
      sx={[
        websiteSx['sb-photo'],
        {
          backgroundImage: `url("${src}")`,
          backgroundPosition: position,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        },
        ...(className === 'sb-home-hero-photo'
          ? [websiteSx['sb-home-hero-photo']]
          : []),
      ]}
      className={`sb-photo ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        loading={priority ? undefined : lazy ? 'lazy' : 'eager'}
        unoptimized
        decoding="sync"
        sizes="(max-width: 800px) 100vw, 60vw"
        style={{ objectPosition: position }}
      />
    </Box>
  );
}

function SectionHeading({
  children,
  text,
  link,
  linkText,
}: {
  children: ReactNode;
  text?: string;
  link?: string;
  linkText?: string;
}) {
  return (
    <Box
      component="div"
      sx={[websiteSx['sb-section-heading']]}
      className="sb-section-heading"
    >
      <div>
        <h2>{children}</h2>
        {text && <p>{text}</p>}
      </div>
      {link && (
        <Box
          component={Link}
          sx={[websiteSx['sb-text-link']]}
          className="sb-text-link"
          href={link}
        >
          {linkText}
          <Arrow />
        </Box>
      )}
    </Box>
  );
}

function InnerHero({
  title,
  text,
  image,
  dark = true,
}: {
  title: string;
  text: string;
  image: string;
  eyebrow?: string;
  dark?: boolean;
}) {
  return (
    <Box
      component="section"
      sx={[
        websiteSx['sb-inner-hero'],
        ...(dark ? [websiteSx['sb-inner-hero-dark']] : []),
      ]}
      className={`sb-inner-hero ${dark ? 'sb-inner-hero-dark' : ''}`}
    >
      <Box
        component="div"
        sx={[websiteSx['sb-inner-copy']]}
        className="sb-inner-copy"
      >
        <h1>{title}</h1>
        <p>{text}</p>
      </Box>
      <Photo src={image} alt="Super Black Coffee" priority />
    </Box>
  );
}

function BranchRow({ branch }: { branch: (typeof branches)[number] }) {
  const { text, isEnglish } = useWebsiteLanguage();
  const translated = branchTranslations[branch.name];
  const name = isEnglish ? translated.name : branch.name;
  const address = isEnglish ? translated.address : branch.address;
  return (
    <Box
      component="article"
      sx={[websiteSx['sb-branch-row']]}
      className="sb-branch-row"
    >
      <Photo
        src={branch.image}
        alt={text(`สาขา${branch.name}`, `${name} branch`)}
      />
      <Box
        component="div"
        sx={[websiteSx['sb-branch-info']]}
        className="sb-branch-info"
      >
        <h3>{name}</h3>
        <p>{address}</p>
        <Box
          component="div"
          sx={[websiteSx['sb-branch-meta']]}
          className="sb-branch-meta"
        >
          <span>{text(branch.status, 'Open daily')}</span>
          {branch.hours && (
            <span>{isEnglish ? '08:00–20:30' : branch.hours}</span>
          )}
          {branch.phone && <a href={`tel:${branch.phone}`}>{branch.phone}</a>}
        </Box>
      </Box>
      <Box
        component="div"
        sx={[websiteSx['sb-branch-actions']]}
        className="sb-branch-actions"
      >
        <Box
          component={Link}
          sx={[websiteSx['sb-row-link']]}
          className="sb-row-link"
          href={`/branches/${branch.slug}/menu`}
        >
          <span>{text('เมนู', 'Menu')}</span>
          <Arrow />
        </Box>
        <Box
          component={Link}
          sx={[websiteSx['sb-row-link']]}
          className="sb-row-link"
          href={`/branches/${branch.slug}`}
        >
          <span>{text('รายละเอียด', 'Details')}</span>
          <Arrow />
        </Box>
        {branch.map ? (
          <Box
            component="a"
            sx={[websiteSx['sb-row-link']]}
            className="sb-row-link"
            href={branch.map}
            target="_blank"
            rel="noreferrer"
            aria-label={text(
              `เปิดแผนที่สาขา${branch.name}`,
              `Open map for ${name}`,
            )}
          >
            <span>{text('แผนที่', 'Map')}</span>
            <Arrow />
          </Box>
        ) : (
          <Box
            component="span"
            sx={[websiteSx['sb-row-link'], websiteSx['sb-row-link-muted']]}
            className="sb-row-link sb-row-link-muted"
          >
            {text('เร็ว ๆ นี้', 'Coming soon')}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export function BranchDetailContent({ slug }: { slug: string }) {
  const { text, isEnglish } = useWebsiteLanguage();
  const profile = branchProfiles[slug as keyof typeof branchProfiles];
  const branch = branches.find((item) => item.slug === slug);

  if (!profile || !branch) return null;

  const translation = branchTranslations[branch.name];
  const name = isEnglish ? translation.name : branch.name;
  const facilityIcons = [CoffeeIcon, EvChargerIcon, UsersIcon, MapPinHouseIcon];

  return (
    <Box
      component="section"
      sx={[websiteSx['sb-branch-detail']]}
      className="sb-branch-detail"
    >
      <Box component="div" className="sb-branch-detail-hero">
        <Photo
          src={branch.image}
          alt={text(`สาขา${branch.name}`, `${name} branch`)}
          priority
        />
        <Box component="div">
          <h1>{name}</h1>
          <span>{text(branch.status, 'Open daily')}</span>
          <p>{isEnglish ? translation.address : branch.address}</p>
        </Box>
      </Box>

      <Box component="div" className="sb-branch-detail-section">
        <Box component="div" className="sb-branch-detail-heading">
          <h2>
            {text('ทีมงานทั้งหมด', 'Our branch team')} {profile.staffTotal}{' '}
            {text('คน', 'people')}
          </h2>
        </Box>
        <Box component="div" className="sb-branch-staff-grid">
          {profile.staff.map((member) => (
            <Box
              component="article"
              className="sb-branch-staff-card"
              key={member.role}
            >
              <Photo src={member.image} alt={member.role} />
              <Box component="div">
                <span>{member.count}</span>
                <h3>{member.role}</h3>
                <p>{member.detail}</p>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Box component="div" className="sb-branch-detail-section">
        <Box component="div" className="sb-branch-detail-heading">
          <h2>{text('สิ่งที่มีภายในสาขา', 'What you will find here')}</h2>
        </Box>
        <Box component="div" className="sb-branch-facility-grid">
          {profile.facilities.map(([title, detail], index) => {
            const FacilityIcon = facilityIcons[index] ?? CoffeeIcon;
            return (
              <Box
                component="article"
                className="sb-branch-facility-card"
                key={title}
              >
                <FacilityIcon size={28} />
                <h3>{title}</h3>
                <p>{detail}</p>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

export function HomeContent() {
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);
  const { text } = useWebsiteLanguage();
  return (
    <>
      <Box
        component="section"
        sx={[websiteSx['sb-home-hero']]}
        className="sb-home-hero"
      >
        <Box
          component="video"
          sx={[websiteSx['sb-home-hero-video']]}
          className="sb-home-hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/hero/superblackcoffee-brand-hero.png?v=20260930"
          aria-label="วิดีโอบรรยากาศร้าน Super Black Coffee"
        >
          <source
            src="/hero/superblackcoffee-hero-night.mp4"
            type="video/mp4"
          />
        </Box>
        <Box
          component="div"
          sx={[websiteSx['sb-home-hero-shade']]}
          className="sb-home-hero-shade"
        />
        <Box
          component="div"
          sx={[websiteSx['sb-home-hero-content']]}
          className="sb-home-hero-content"
        >
          <h1>
            <span className="sb-hero-title-accent">
              {text('คัดสรรทุกขั้นตอน', 'Selected at every step')}
            </span>
            <br />
            {text('เพื่อเมล็ดกาแฟที่ดีที่สุด', 'for the finest coffee beans')}
          </h1>
          <p>
            {text(
              'กาแฟออร์แกนิกพรีเมียมจากต้นทางที่เราดูแล เพื่อทุกช่วงเวลาที่คุณอยากให้พิเศษ',
              'Premium organic coffee from an origin we care for, crafted for moments that matter.',
            )}
          </p>
          <Box
            component="div"
            sx={[websiteSx['sb-actions']]}
            className="sb-actions"
          >
            <Box
              component={Link}
              sx={[websiteSx['sb-button'], websiteSx['sb-button-gold']]}
              className="sb-button sb-button-gold"
              href="/branches"
            >
              {text('ค้นหาสาขาใกล้คุณ', 'Find a branch near you')} <Arrow />
            </Box>
            <Box
              component={Link}
              sx={[websiteSx['sb-button'], websiteSx['sb-button-ghost']]}
              className="sb-button sb-button-ghost"
              href="/menu"
            >
              {text('ดูเมนูทั้งหมด', 'View the menu')} <Arrow />
            </Box>
          </Box>
        </Box>
        <Box
          component="nav"
          aria-label="บริการของ Super Black Coffee"
          sx={[websiteSx['sb-hero-services']]}
          className="sb-hero-services"
        >
          {heroServiceCards.map((card) => (
            <Box
              component={Link}
              href={card.href}
              key={card.title}
              sx={[websiteSx['sb-hero-service-card']]}
              className={`sb-hero-service-card ${card.title === 'EV CHARGING' ? 'sb-hero-service-card-ev' : card.title === 'BPOST65 EXPRESS' ? 'sb-hero-service-card-bpost' : ''}`}
            >
              <Photo src={card.image} alt="" />
              <Box component="div" className="sb-hero-service-card-copy">
                <h2>{card.title}</h2>
                <p>
                  {text(
                    card.detail,
                    heroServiceCardsEn.find((item) => item.title === card.title)
                      ?.detail ?? card.detail,
                  )}
                </p>
                <span>
                  {text('ดูรายละเอียด', 'Explore service')} <Arrow />
                </span>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      <Box
        component="section"
        aria-label="สถิติของ Super Black Coffee"
        sx={[websiteSx['sb-hero-stats']]}
        className="sb-hero-stats"
      >
        {heroStats.map((stat) => {
          const isHovered = hoveredStat === stat.label;
          return (
            <Box
              component="article"
              key={stat.label}
              sx={[websiteSx['sb-hero-stat']]}
              className="sb-hero-stat"
              onMouseEnter={() => setHoveredStat(stat.label)}
              onMouseLeave={() => setHoveredStat(null)}
            >
              <Box component="div" className="sb-hero-stat-content">
                <Box component="span" className="sb-stat-icon">
                  <HeroStatIcon icon={stat.icon} animate={isHovered} />
                </Box>
                <Box component="div">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                  <p>
                    {text(
                      stat.detail,
                      heroStatsEn.find((item) => item.label === stat.label)
                        ?.detail ?? stat.detail,
                    )}
                  </p>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
      <Box
        component="div"
        sx={[websiteSx['sb-home-editorial']]}
        className="sb-home-editorial"
      >
        <Box
          component="section"
          sx={[websiteSx['sb-story-strip']]}
          className="sb-story-strip"
        >
          <Box component="div" className="sb-story-copy">
            <h2>
              {text('มากกว่ากาแฟ', 'More than coffee')}
              <br />
              <span>{text('คือพลังในทุกวัน', 'is energy for every day')}</span>
            </h2>
            <p>
              {text(
                'เราเชื่อว่ากาแฟหนึ่งแก้ว สามารถจุดพลังให้วันธรรมดากลายเป็นวันที่พิเศษได้ Super Black Coffee จึงคัดสรรเมล็ดกาแฟคุณภาพระดับพรีเมียม สร้างสรรค์รสชาติที่จริงใจ สำหรับคนที่มองหามากกว่าความอร่อย แต่คือแรงบันดาลใจในทุกวัน',
                'We believe a great coffee can turn an ordinary moment into a meaningful one. Super Black Coffee selects premium beans and creates honest flavours for people seeking more than taste—everyday inspiration.',
              )}
            </p>
            <Box
              component={Link}
              sx={[
                websiteSx['sb-editorial-link'],
                websiteSx['sb-editorial-cta'],
              ]}
              className="sb-editorial-link sb-editorial-cta"
              href="/about"
            >
              {text('อ่านเรื่องราวของเรา', 'Our story')} <Arrow />
            </Box>
          </Box>
          <Photo
            src="/coffee/coffee-story-amber.png"
            alt="กาแฟดำพรีเมียม Super Black Coffee"
          />
        </Box>
        <Box
          component="section"
          sx={[websiteSx['sb-menu-feature']]}
          className="sb-menu-feature"
        >
          <Box
            component="div"
            sx={[websiteSx['sb-menu-feature-copy']]}
            className="sb-menu-feature-copy"
          >
            <h2>
              {text('กาแฟพรีเมียม', 'Premium coffee')}
              <br />
              <span>{text('สำหรับทุกโมเมนต์', 'for every moment')}</span>
            </h2>
            <p>
              {text(
                'สัมผัสกาแฟคุณภาพ คัดสรรเมล็ดพันธุ์ระดับพรีเมียม รังสรรค์เป็นเมนูหลากหลาย ตอบโจทย์ทุกไลฟ์สไตล์',
                'Enjoy quality coffee made from carefully selected premium beans, with a menu for every lifestyle.',
              )}
            </p>
            <Box
              component={Link}
              sx={[
                websiteSx['sb-button'],
                websiteSx['sb-button-gold'],
                websiteSx['sb-editorial-cta'],
              ]}
              className="sb-button sb-button-gold sb-editorial-cta"
              href="/menu"
            >
              {text('ดูเมนูทั้งหมด', 'View the menu')} <Arrow />
            </Box>
          </Box>
          <Box
            component="div"
            sx={[websiteSx['sb-menu-feature-mini']]}
            className="sb-menu-feature-mini"
          >
            <Box component={Link} href="/menu">
              <Photo
                src="/coffee/menu-card-black-latte.png"
                alt="ซิกเนเจอร์แบล็คลาเต้"
              />
              <span>
                SIGNATURE
                <br />
                BLACK LATTE
              </span>
            </Box>
            <Box component={Link} href="/menu">
              <Photo
                src="/coffee/menu-card-black-coffee.png"
                alt="กาแฟคลาสสิก"
              />
              <span>
                CLASSIC
                <br />
                BLACK COFFEE
              </span>
            </Box>
            <Box component={Link} href="/menu">
              <Photo src="/coffee/menu-card-matcha.png" alt="เมนูพรีเมียม" />
              <span>
                PREMIUM
                <br />
                SPECIALTY
              </span>
            </Box>
            <Box component={Link} href="/menu">
              <Photo src="/coffee/menu-card-bakery.png" alt="เบเกอรี่สดใหม่" />
              <span>
                FRESHLY
                <br />
                BAKED
              </span>
            </Box>
          </Box>
        </Box>
        <Box
          component="section"
          sx={[websiteSx['sb-services-preview']]}
          className="sb-services-preview"
        >
          <Photo
            src="/services/service-journey-interior.png"
            alt="บรรยากาศภายในร้าน Super Black Coffee"
            className="sb-services-photo"
          />
          <Box component="div" className="sb-services-intro">
            <h2>
              {text('มากกว่ากาแฟ', 'More than coffee')}
              <br />
              <span>{text('เพื่อทุกการเดินทาง', 'for every journey')}</span>
            </h2>
            <p>
              {text(
                'เติมพลังให้ทุกวัน ด้วยกาแฟระดับพรีเมียม พื้นที่ที่รังสรรค์เพื่อคุณ และบริการพร้อมออกเดินทางต่อ',
                'Power every day with premium coffee, a space made for you, and services ready for the road ahead.',
              )}
            </p>
            <Box component="div" className="sb-services-benefits">
              <Box component="div">
                <CoffeeIcon size={25} />
                <span>
                  <strong>{text('กาแฟพรีเมียม', 'Premium coffee')}</strong>
                  <small>
                    {text('รสชาติอันเป็นเอกลักษณ์', 'Distinctive flavour')}
                  </small>
                </span>
              </Box>
              <Box component="div">
                <CoffeeIcon size={25} />
                <span>
                  <strong>
                    {text('พื้นที่นั่งสบาย', 'Comfortable seating')}
                  </strong>
                  <small>{text('ทำงานหรือพักผ่อนได้', 'Work or unwind')}</small>
                </span>
              </Box>
              <Box component="div">
                <UsersIcon size={25} />
                <span>
                  <strong>{text('พบเจอผู้คนดี', 'Good people')}</strong>
                  <small>{text('ทุกช่วงเวลา', 'at every moment')}</small>
                </span>
              </Box>
              <Box component="div">
                <EvChargerIcon size={25} />
                <span>
                  <strong>{text('Wi-Fi ฟรี', 'Free Wi-Fi')}</strong>
                  <small>
                    {text('รองรับทุกไลฟ์สไตล์', 'for every lifestyle')}
                  </small>
                </span>
              </Box>
            </Box>
          </Box>
          <Box component="div" className="sb-ev-showcase">
            <Photo
              src="/services/service-ev-night.png"
              alt="จุดชาร์จ EV Super Black Coffee"
            />
            <Box component="div" className="sb-ev-showcase-copy">
              <h3>
                {text('ชาร์จพลังรถ', 'Charge your car')}
                <br />
                <span>
                  {text('พร้อมชาร์จพลังให้ตัวคุณ', 'and recharge yourself')}
                </span>
              </h3>
              <p>
                {text(
                  'บริการ EV Charging กับมาตรการชาร์จพลังไฟฟ้า ให้คุณเติมพลังได้ทั้งการเดินทาง และยังมีมุมรอพักพร้อมกาแฟแก้วโปรด',
                  'EV charging designed for an easier journey, with a comfortable waiting space and your favourite coffee.',
                )}
              </p>
              <Box component="div" className="sb-ev-showcase-points">
                <Box component="div">
                  <EvChargerIcon size={25} />
                  <span>
                    <strong>
                      {text('หัวชาร์จมาตรฐาน', 'Standard chargers')}
                    </strong>
                    <small>
                      {text(
                        'รองรับรถหลากหลายรุ่น',
                        'Compatible with many vehicles',
                      )}
                    </small>
                  </span>
                </Box>
                <Box component="div">
                  <CoffeeIcon size={25} />
                  <span>
                    <strong>
                      {text('สะดวก ปลอดภัย', 'Convenient and safe')}
                    </strong>
                    <small>
                      {text('พร้อมเดินทางต่อ', 'Ready for the road')}
                    </small>
                  </span>
                </Box>
                <Box component="div">
                  <CoffeeIcon size={25} />
                  <span>
                    <strong>
                      {text('เติมพลังระหว่างรอ', 'Recharge while you wait')}
                    </strong>
                    <small>
                      {text('ด้วยกาแฟคุณภาพ', 'with quality coffee')}
                    </small>
                  </span>
                </Box>
                <Box component="div">
                  <CoffeeIcon size={25} />
                  <span>
                    <strong>
                      {text('พื้นที่พักผ่อนสบาย', 'Comfortable space')}
                    </strong>
                    <small>{text('ระหว่างรอชาร์จ', 'While you charge')}</small>
                  </span>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
        <Box
          component="section"
          sx={[websiteSx['sb-branch-banner']]}
          className="sb-branch-banner"
        >
          <Photo
            src="/branches/branch-banner-ev-sunset.png"
            alt="ร้าน Super Black Coffee"
          />
          <div>
            <h2>
              {text('ค้นหาสาขาใกล้คุณ', 'Find a branch near you')}
              <br />
              <span>{text('เพื่อทุกการเดินทาง', 'for every journey')}</span>
            </h2>
            <p>
              {text(
                'เลือกดูสาขาและจุดพักที่ใช่ เพื่อวางแผนการเดินทางในครั้งต่อไป พร้อมกาแฟและบริการที่ทำให้ทุกเส้นทางง่ายขึ้น',
                'Browse branches and stops that suit your route, with coffee and services that make every journey easier.',
              )}
            </p>
            <Box
              component={Link}
              sx={[
                websiteSx['sb-button'],
                websiteSx['sb-button-outline-light'],
                websiteSx['sb-editorial-cta'],
              ]}
              className="sb-button sb-button-outline-light sb-editorial-cta"
              href="/branches"
            >
              {text('ค้นหาสาขา', 'Find branches')} <Arrow />
            </Box>
          </div>
        </Box>
        <Box
          component="section"
          sx={[websiteSx['sb-franchise-preview']]}
          className="sb-franchise-preview"
        >
          <div>
            <h2>
              {text('ร่วมเติบโตไปด้วยกัน', 'Grow with us')}
              <br />
              <span>
                {text('กับ Super Black Coffee', 'at Super Black Coffee')}
              </span>
            </h2>
            <p>
              {text(
                'โอกาสในการเป็นส่วนหนึ่งของแบรนด์กาแฟที่พร้อมเติบโตไปกับคุณ ร่วมสร้างประสบการณ์กาแฟคุณภาพ และไลฟ์สไตล์ที่มากกว่า กับเรา',
                'Join a coffee brand ready to grow with you, and build quality coffee experiences with a richer lifestyle offering.',
              )}
            </p>
            <Box
              component={Link}
              sx={[
                websiteSx['sb-button'],
                websiteSx['sb-button-dark'],
                websiteSx['sb-editorial-cta'],
              ]}
              className="sb-button sb-button-dark sb-editorial-cta"
              href="/franchise"
            >
              {text('สำรวจแฟรนไชส์', 'Explore franchise')} <Arrow />
            </Box>
          </div>
          <Photo
            src="/franchise/franchise-coffee-cup.png"
            alt="รูปแบบแฟรนไชส์ Super Black Coffee"
            position="center 30%"
          />
        </Box>
      </Box>
    </>
  );
}

export function AboutContent() {
  const { text } = useWebsiteLanguage();
  return (
    <>
      <InnerHero
        title={text(
          'ไร่กาแฟหัวพัน สปป.ลาว',
          'Our coffee farm in Houaphanh, Laos',
        )}
        text={text(
          'แหล่งปลูกกาแฟคุณภาพที่ยังคงความบริสุทธิ์ของธรรมชาติ และเต็มไปด้วยเอกลักษณ์เฉพาะตัว',
          'A quality coffee origin with the purity of nature and a distinctive character.',
        )}
        image="/about/laos-coffee-farm-dawn.png"
        eyebrow="ABOUT SUPER BLACK COFFEE"
      />
      <Box
        component="section"
        sx={[websiteSx['sb-about-grid'], websiteSx['sb-container']]}
        className="sb-about-grid sb-container"
      >
        <div>
          <h2>
            {text(
              'รู้จักกับแหล่งปลูกเมล็ดกาแฟของเรา',
              'Get to know our coffee-growing origin',
            )}
          </h2>
        </div>
        <div>
          <p>
            {text(
              'หัวพัน สปป.ลาว คือหนึ่งในขุมทรัพย์แห่งกาแฟของเอเชียตะวันออกเฉียงใต้ ที่ยังคงความบริสุทธิ์ของธรรมชาติ และเต็มไปด้วยเอกลักษณ์เฉพาะตัว',
              'Houaphanh, Laos is one of Southeast Asia’s coffee treasures, retaining the purity of nature and a distinctive character.',
            )}
          </p>
          <p>
            {text(
              'ไร่ของเราอยู่สูงกว่า 1,200 เมตรจากระดับน้ำทะเล อากาศเย็นตลอดปี ช่วยให้เมล็ดกาแฟเติบโตช้าและสะสมรสชาติได้อย่างเข้มข้น',
              'Our farm sits more than 1,200 metres above sea level. Its year-round cool climate lets coffee cherries mature slowly and build rich flavour.',
            )}
          </p>
          <p>
            {text(
              'เราปลูกแบบออร์แกนิกด้วยแนวทางเกษตรอินทรีย์ และดึงเอกลักษณ์ของเมล็ดกาแฟหัวพันออกมาให้ดีที่สุดในทุกแก้วของ Super Black Coffee',
              'We use organic growing practices and bring the distinctive character of Houaphanh coffee beans into every Super Black Coffee cup.',
            )}
          </p>
        </div>
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-about-origin'], websiteSx['sb-container']]}
        className="sb-about-origin sb-container"
      >
        <Box component="div" className="sb-about-origin-copy">
          <h2>
            {text(
              'พิกัดไร่กาแฟที่หัวพัน สปป.ลาว',
              'Coffee farm location in Houaphanh, Laos',
            )}
          </h2>
          <p>
            {text(
              'พิกัด 20°14\'44.2\"N 104°27\'09.0\"E คือพื้นที่ปลูกที่โอบล้อมด้วยธรรมชาติ และเป็นต้นทางของเมล็ดกาแฟที่เราดูแลอย่างตั้งใจ',
              'At 20°14\'44.2\"N 104°27\'09.0\"E, our growing area is surrounded by nature and is the carefully tended origin of our coffee beans.',
            )}
          </p>
        </Box>
        <Box
          component="div"
          className="sb-about-origin-map"
          role="img"
          aria-label={text(
            'แผนที่พิกัดไร่กาแฟ Super Black Coffee ที่หัวพัน สปป.ลาว',
            'Location map of the Super Black Coffee farm in Houaphanh, Laos',
          )}
        >
          <Box
            component="img"
            src="/about/houaphan-coffee-farm-location.png"
            alt=""
            aria-hidden="true"
            className="sb-about-origin-map-image"
          />
        </Box>
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-about-principles'], websiteSx['sb-container']]}
        className="sb-about-principles sb-container"
      >
        <Box component="div" className="sb-about-principles-intro">
          <h2>
            {text('ทำไมต้องกาแฟจากหัวพัน?', 'Why coffee from Houaphanh?')}
          </h2>
          <p>
            {text(
              'ทุกปัจจัยของแหล่งปลูก ส่งผลให้กาแฟหัวพันมีรสชาติและกลิ่นที่เป็นเอกลักษณ์',
              'Every quality of this growing region shapes the distinctive taste and aroma of Houaphanh coffee.',
            )}
          </p>
        </Box>
        <Box component="div" className="sb-about-principles-list">
          <article>
            <span>01</span>
            <Box
              component="img"
              src="/about/organic-soil-life.png"
              alt={text(
                'การดูแลดินในไร่กาแฟ',
                'Caring for living soil on the coffee farm',
              )}
              className="sb-about-principle-image"
            />
            <h3>
              {text('พื้นที่สูงกว่า 1,200 เมตร', 'Over 1,200 metres high')}
            </h3>
            <p>
              {text(
                'อากาศเย็นตลอดปี ช่วยให้เมล็ดเติบโตช้าและสะสมรสชาติเข้มข้น',
                'A cool climate helps the beans mature slowly and develop rich flavour.',
              )}
            </p>
          </article>
          <article>
            <span>02</span>
            <Box
              component="img"
              src="/about/organic-coffee-growing.png"
              alt={text(
                'ต้นกาแฟที่เติบโตในไร่ สปป.ลาว',
                'Coffee trees growing on a Laos farm',
              )}
              className="sb-about-principle-image"
            />
            <h3>
              {text('ดินภูเขาไฟอุดมสมบูรณ์', 'Nutrient-rich volcanic soil')}
            </h3>
            <p>
              {text(
                'แร่ธาตุจากธรรมชาติช่วยให้เมล็ดมีกลิ่นหอมพิเศษและบอดี้แน่น',
                'Natural minerals create a distinctive aroma and a full body.',
              )}
            </p>
          </article>
          <article>
            <span>03</span>
            <Box
              component="img"
              src="/about/selective-coffee-harvest.png"
              alt={text(
                'การเก็บเกี่ยวผลกาแฟอย่างคัดสรร',
                'Selective coffee cherry harvesting',
              )}
              className="sb-about-principle-image"
            />
            <h3>
              {text('กระบวนการปลูกแบบออร์แกนิก', 'Organic growing practices')}
            </h3>
            <p>
              {text(
                'ปลอดสารเคมี ด้วยแนวทางเกษตรอินทรีย์เพื่อรสชาติที่สะอาดบริสุทธิ์',
                'Chemical-free, organic practices help preserve a clean and pure taste.',
              )}
            </p>
          </article>
          <article>
            <span>04</span>
            <Box
              component="img"
              src="/about/coffee-journey-transparent.png"
              alt={text(
                'เส้นทางกาแฟจากต้นทางสู่สาขา',
                'Coffee journey from origin to branches',
              )}
              className="sb-about-principle-image"
            />
            <h3>
              {text('เอกลักษณ์ของรสชาติ', 'A distinctive flavour profile')}
            </h3>
            <p>
              {text(
                'สัมผัสโน้ตของช็อกโกแลต ถั่ว และผลไม้เบอร์รี ที่เปรี้ยวอมหวานอย่างลงตัว',
                'Taste notes of chocolate, nuts, and berries with a balanced sweet acidity.',
              )}
            </p>
          </article>
        </Box>
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-about-photo'], websiteSx['sb-container']]}
        className="sb-about-photo sb-container"
      >
        <Photo
          src="/about/organic-coffee-harvest.png"
          alt="การเก็บเกี่ยวผลกาแฟแบบออร์แกนิกในไร่ที่ สปป.ลาว"
          position="center"
        />
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-about-photo'], websiteSx['sb-container']]}
        className="sb-about-photo sb-container"
      >
        <Photo
          src="/about/soil-to-cup-journey.png"
          alt="เส้นทางกาแฟจากดินสู่ถ้วย ตั้งแต่การปลูกจนถึงการเก็บเกี่ยว"
          position="center"
        />
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-about-journey'], websiteSx['sb-container']]}
        className="sb-about-journey sb-container"
      >
        <Box component="div" className="sb-about-journey-heading">
          <h2>
            {text(
              'จาก สปป.ลาว สู่สาขาที่เติบโตไปด้วยกัน',
              'From Laos to branches growing together',
            )}
          </h2>
          <p>
            {text(
              'เส้นทางของเราค่อย ๆ เติบโตจากสาขาอยุธยา ไปพิษณุโลก และต่อมาที่ประชาอุทิศ',
              'Our journey has grown from Ayutthaya to Phitsanulok, and now to Pracha Uthit.',
            )}
          </p>
        </Box>
        <Box component="ol" className="sb-about-journey-steps">
          <li>
            <span>01</span>
            <div>
              <h3>{text('อยุธยา', 'Ayutthaya')}</h3>
              <p>
                {text(
                  'สาขาแรกที่เราเริ่มต้นทำให้เรื่องราวของกาแฟมีพื้นที่พบผู้คน',
                  'The first branch where our coffee story met its community.',
                )}
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>{text('พิษณุโลก', 'Phitsanulok')}</h3>
              <p>
                {text(
                  'ก้าวต่อไปของการเติบโตและการดูแลประสบการณ์ในแต่ละสาขา',
                  'The next step in growing and caring for each branch experience.',
                )}
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>{text('ประชาอุทิศ', 'Pracha Uthit')}</h3>
              <p>
                {text(
                  'จุดเริ่มต้นใหม่ที่กำลังเติบโตได้ดีในเมือง',
                  'A new beginning that is growing well in the city.',
                )}
              </p>
            </div>
          </li>
        </Box>
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-about-photo'], websiteSx['sb-container']]}
        className="sb-about-photo sb-container"
      >
        <Photo
          src="/about/about-growing-together.png"
          alt="ทีมงานและผู้ประกอบการกำลังร่วมวางแผนธุรกิจ"
          position="center"
        />
      </Box>
      <Box
        component="blockquote"
        sx={[websiteSx['sb-about-quote'], websiteSx['sb-container']]}
        className="sb-about-quote sb-container"
      >
        <p>
          {text(
            'เราไม่ได้ทำเพียงกาแฟ แต่สร้างจุดพักที่ทำให้ทุกวันไปต่อได้ดีขึ้น',
            'We do not only make coffee; we create a place that helps every day move forward.',
          )}
        </p>
      </Box>
    </>
  );
}

export function MenuContent({ branchSlug }: { branchSlug?: string }) {
  const { text, isEnglish } = useWebsiteLanguage();
  const [active, setActive] = useState('กาแฟเย็น');
  const menuCatalog = { ...menus, ...assetMenus, ...foodMenus };
  const branch = branchSlug
    ? branches.find((item) => item.slug === branchSlug)
    : undefined;
  const translatedBranch = branch ? branchTranslations[branch.name] : undefined;
  const branchName = branch
    ? isEnglish
      ? translatedBranch?.name
      : branch.name
    : undefined;
  return (
    <>
      <InnerHero
        title={
          branchName
            ? text(`เมนูสาขา${branchName}`, `${branchName} menu`)
            : text(
                'เมนูที่ตั้งใจในทุกคำ ทุกแก้ว',
                'A menu made with care in every bite and sip',
              )
        }
        text={
          branchName
            ? text(
                `เลือกดูเมนูเครื่องดื่มและอาหารของ Super Black Coffee สาขา${branchName} ที่คัดสรรไว้สำหรับทุกช่วงเวลาของวัน`,
                `Explore drinks and food available at Super Black Coffee ${branchName}, selected for every moment of the day.`,
              )
            : text(
                'สำรวจเครื่องดื่มและอาหารที่คัดสรรจากวัตถุดิบคุณภาพ และรังสรรค์ขึ้นเพื่อให้เข้ากับทุกจังหวะของวัน ตั้งแต่กาแฟแก้วแรกจนถึงมื้อที่อยากพักอย่างมีรสนิยม',
                'Explore a considered selection of drinks and food made with quality ingredients and crafted for every rhythm of the day—from your first coffee to a well-deserved meal.',
              )
        }
        image={branch?.image ?? '/hero/menu-craft.png'}
        eyebrow="OUR MENU"
        dark
      />
      <Box
        component="section"
        sx={[websiteSx['sb-menu-page'], websiteSx['sb-container']]}
        className="sb-menu-page sb-container"
      >
        <Box
          component="div"
          sx={[websiteSx['sb-tabs']]}
          className="sb-tabs"
          role="tablist"
          aria-label={text('ประเภทเมนู', 'Menu categories')}
        >
          {Object.keys(menuCatalog).map((category) => (
            <button
              key={category}
              role="tab"
              aria-selected={active === category}
              className={active === category ? 'active' : ''}
              onClick={() => setActive(category)}
            >
              {text(category, menuCategoryTranslations[category] ?? category)}
            </button>
          ))}
        </Box>
        <Box
          component="div"
          sx={[websiteSx['sb-menu-layout']]}
          className="sb-menu-layout"
        >
          <div>
            <h2>{text(active, menuCategoryTranslations[active] ?? active)}</h2>
            <Box component="p" sx={[websiteSx['sb-lead']]} className="sb-lead">
              {text(
                'รายการเมนูจาก Super Black Coffee เลือกดูเครื่องดื่ม อาหาร และของว่างที่เรามีได้ตามหมวดหมู่',
                'Browse Super Black Coffee drinks, food, and snacks by category.',
              )}
            </Box>
            <Box
              component="div"
              sx={[websiteSx['sb-menu-grid']]}
              className="sb-menu-grid"
            >
              {menuCatalog[active].map((item, index) => {
                const copy = isEnglish
                  ? (menuTranslations[active]?.[index] ?? item)
                  : item;
                return (
                  <Box
                    component="article"
                    sx={[websiteSx['sb-menu-card']]}
                    className="sb-menu-card"
                    key={item.name}
                  >
                    <Photo
                      src={item.image}
                      alt={copy.name}
                      priority={index === 0}
                      lazy={index > 0}
                    />
                    <div>
                      <h3>{copy.name}</h3>
                      <p>{copy.detail}</p>
                    </div>
                  </Box>
                );
              })}
            </Box>
          </div>
        </Box>
      </Box>
    </>
  );
}

export function BranchesContent() {
  const { text } = useWebsiteLanguage();
  const [query, setQuery] = useState('');
  const filtered = branches.filter((branch) =>
    `${branch.name} ${branch.address}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <InnerHero
        title={text('พบกับเราได้ทุกวัน', 'Find us every day')}
        text={text(
          'ค้นพบสาขาและจุดพักที่ออกแบบมาให้เข้ากับเส้นทางของคุณ พร้อมกาแฟ บริการ และบรรยากาศที่ทำให้ทุกการเดินทางรู้สึกง่ายขึ้น',
          'Discover a branch and a place to pause along your route, with coffee, thoughtful services, and an atmosphere designed to make every journey feel easier.',
        )}
        image="/hero/branches-welcome.png"
        eyebrow="OUR BRANCHES"
        dark
      />
      <Box
        component="section"
        sx={[websiteSx['sb-branches-page'], websiteSx['sb-container']]}
        className="sb-branches-page sb-container"
      >
        <Box
          component="div"
          sx={[websiteSx['sb-section-heading']]}
          className="sb-section-heading"
        >
          <div>
            <h2>{text('สาขาของเรา', 'Our branches')}</h2>
            <p>
              {text(
                'เลือกจุดพักที่ใช่บนเส้นทางของคุณ',
                'Choose the right stop along your journey.',
              )}
            </p>
          </div>
          <Box
            component="label"
            sx={[websiteSx['sb-search']]}
            className="sb-search"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 5 5" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={text(
                'ค้นหาชื่อสาขาหรือจังหวัด',
                'Search by branch or province',
              )}
              aria-label={text('ค้นหาสาขา', 'Search branches')}
            />
          </Box>
        </Box>
        <Box
          component="div"
          sx={[websiteSx['sb-branch-list']]}
          className="sb-branch-list"
        >
          {filtered.map((branch) => (
            <BranchRow key={branch.name} branch={branch} />
          ))}
          {filtered.length === 0 && (
            <Box
              component="p"
              sx={[websiteSx['sb-empty']]}
              className="sb-empty"
            >
              {text(
                'ไม่พบสาขาที่ค้นหา ลองใช้ชื่อจังหวัดหรือชื่อสาขาอื่น',
                'No branches found. Try another branch or province name.',
              )}
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
}

type LeadForm = {
  name: string;
  phone: string;
  email: string;
  province: string;
  plan: string;
  message: string;
};
const emptyLead: LeadForm = {
  name: '',
  phone: '',
  email: '',
  province: '',
  plan: '',
  message: '',
};

export function FranchiseContent() {
  const { text, isEnglish } = useWebsiteLanguage();
  const [form, setForm] = useState<LeadForm>(emptyLead);
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>(
    'idle',
  );
  const selectPlan = (plan: LeadForm['plan']) => {
    setForm((current) => ({ ...current, plan }));
    setState('idle');
    document
      .getElementById('apply')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState('sending');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'}/website/leads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, topic: 'franchise' }),
        },
      );
      if (!response.ok) throw new Error('Submission failed');
      trackEvent('generate_lead', { form_name: 'franchise' });
      setForm(emptyLead);
      setState('success');
    } catch {
      setState('error');
    }
  };
  return (
    <>
      <InnerHero
        title={text(
          'ธุรกิจที่เติบโตไปด้วยกัน',
          'A business that grows with you',
        )}
        text={text(
          'เริ่มต้นธุรกิจกับแบรนด์กาแฟที่มีรากฐานจากการลงมือทำจริง เลือกรูปแบบที่เหมาะกับพื้นที่ วิสัยทัศน์ และเป้าหมายการเติบโตของคุณ',
          'Build your business with a coffee brand grounded in real operating experience. Choose a model shaped around your site, vision, and ambitions for growth.',
        )}
        image="/hero/franchise-business.png"
        eyebrow="FRANCHISE OPPORTUNITY"
        dark
      />
      <Box
        component="section"
        sx={[websiteSx['sb-franchise-intro'], websiteSx['sb-container']]}
        className="sb-franchise-intro sb-container"
      >
        <h2>{text('เติบโตไปด้วยกัน', 'Grow together')}</h2>
        <p>
          {text(
            'เติบโตไปพร้อมกับแบรนด์กาแฟที่เข้าใจการทำธุรกิจจริง ตั้งแต่การคัดเลือกทำเล การออกแบบประสบการณ์หน้าร้าน ไปจนถึงระบบสนับสนุนที่ช่วยให้ทีมของคุณทำงานได้อย่างมั่นใจ เลือกรูปแบบที่เหมาะกับพื้นที่ วิสัยทัศน์ และเป้าหมายของคุณ แล้วเปลี่ยนทุกโอกาสให้กลายเป็นการเติบโตที่ยั่งยืน',
            'Grow with a coffee brand built on real operating experience. From site selection and thoughtful store design to practical systems and ongoing support, we help your team move with confidence. Choose a format aligned with your location, vision, and ambition—and turn every opportunity into sustainable, long-term growth.',
          )}
        </p>
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-plans'], websiteSx['sb-container']]}
        className="sb-plans sb-container"
      >
        <SectionHeading
          text={text(
            'รูปแบบการลงทุนสำหรับพื้นที่และเป้าหมายที่แตกต่าง',
            'Investment models for different spaces and business goals.',
          )}
        >
          {text('เลือกรูปแบบแฟรนไชส์', 'Choose your franchise model')}
        </SectionHeading>
        <Box
          component="div"
          sx={[websiteSx['sb-plan-grid']]}
          className="sb-plan-grid"
        >
          {plans.map((plan) => {
            const copy = isEnglish ? planTranslations[plan.size] : plan;
            return (
              <Box
                component="article"
                sx={[websiteSx['sb-plan']]}
                className="sb-plan"
                key={plan.size}
              >
                <Photo
                  src={isEnglish ? plan.imageEn : plan.image}
                  alt={text(`${plan.name} แฟรนไชส์`, `${plan.name} franchise`)}
                  className="sb-plan-photo"
                  lazy
                />
                <Box
                  component="div"
                  sx={[websiteSx['sb-plan-top']]}
                  className="sb-plan-top"
                >
                  <span>{plan.size}</span>
                  <div>
                    <h3>{plan.name}</h3>
                    <p>{copy.service}</p>
                  </div>
                </Box>
                <Box component="div" className="sb-plan-description">
                  <span>{text('เหมาะสำหรับ', 'Best for')}</span>
                  <p>{copy.description}</p>
                </Box>
                <Box component="div" className="sb-plan-services">
                  <span>{text('บริการหลัก', 'Core services')}</span>
                  <p>{copy.includedServices}</p>
                </Box>
                <Box
                  component="div"
                  sx={[websiteSx['sb-plan-facts']]}
                  className="sb-plan-facts"
                >
                  <div>
                    <span>{text('พื้นที่แนะนำ', 'Recommended space')}</span>
                    <strong>{copy.area}</strong>
                  </div>
                  <div>
                    <span>
                      {text('งบลงทุนโดยประมาณ', 'Estimated investment')}
                    </span>
                    <strong>{copy.cost}</strong>
                  </div>
                  <div>
                    <span>
                      {text('ค่าแฟรนไชส์เริ่มต้น', 'Starting franchise fee')}
                    </span>
                    <strong>{copy.franchiseFee}</strong>
                  </div>
                </Box>
                <Box
                  component="button"
                  type="button"
                  sx={[
                    websiteSx['sb-button'],
                    websiteSx['sb-button-gold'],
                    websiteSx['sb-plan-cta'],
                  ]}
                  className="sb-button sb-button-gold sb-plan-cta"
                  onClick={() => selectPlan(plan.size)}
                >
                  {text('ติดต่อทีมแฟรนไชส์', 'Contact franchise team')}{' '}
                  <Arrow />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-apply']]}
        id="apply"
        className="sb-apply"
      >
        <Box
          component="div"
          sx={[websiteSx['sb-container'], websiteSx['sb-apply-layout']]}
          className="sb-container sb-apply-layout"
        >
          <div>
            <h2>
              {text('เริ่มต้นเพียง', 'Start in just')}
              <br />
              {text('5 ขั้นตอน', '5 steps')}
            </h2>
            <p>
              {text(
                'กรอกข้อมูล · นัดพูดคุย · ประเมินทำเล · สรุปสัญญา · เตรียมเปิดร้าน',
                'Submit your details · meet the team · assess the site · finalise the agreement · prepare to open',
              )}
            </p>
          </div>
          <Box
            component="form"
            sx={[websiteSx['sb-form']]}
            onSubmit={submit}
            className="sb-form"
          >
            <h3>
              {text('พูดคุยกับทีมแฟรนไชส์', 'Talk to our franchise team')}
            </h3>
            <Box
              component="div"
              sx={[websiteSx['sb-form-grid']]}
              className="sb-form-grid"
            >
              <label>
                {text('ชื่อ', 'Name')} <span>*</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                {text('เบอร์โทรศัพท์', 'Phone')} <span>*</span>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <label>
                {text('อีเมล', 'Email')}
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                {text('จังหวัด / ทำเลที่สนใจ', 'Province / preferred location')}
                <input
                  value={form.province}
                  onChange={(e) =>
                    setForm({ ...form, province: e.target.value })
                  }
                />
              </label>
              <label>
                {text('รูปแบบที่สนใจ', 'Model of interest')}
                <select
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value })}
                >
                  <option value="">
                    {text('ยังไม่แน่ใจ', 'Not sure yet')}
                  </option>
                  <option value="S">Smart Café</option>
                  <option value="M">Lifestyle Café</option>
                  <option value="L">Lifestyle Hub</option>
                </select>
              </label>
              <Box
                component="label"
                sx={[websiteSx['sb-form-wide']]}
                className="sb-form-wide"
              >
                {text('ข้อความเพิ่มเติม', 'Additional details')}
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                />
              </Box>
            </Box>
            <Box
              component="button"
              sx={[
                websiteSx['sb-button'],
                websiteSx['sb-button-gold'],
                websiteSx['sb-form-submit'],
              ]}
              className="sb-button sb-button-gold sb-form-submit"
              disabled={state === 'sending'}
            >
              {state === 'sending'
                ? text('กำลังส่ง...', 'Sending...')
                : text(
                    'ส่งข้อมูลให้ทีมแฟรนไชส์',
                    'Send to franchise team',
                  )}{' '}
              <Arrow />
            </Box>
            {state === 'success' && (
              <Box
                component="p"
                sx={[websiteSx['sb-form-message']]}
                role="status"
                className="sb-form-message"
              >
                {text(
                  'ส่งข้อมูลถึงทีมงานแล้ว เราจะติดต่อกลับโดยเร็วที่สุด',
                  'Your details have been sent. Our team will be in touch soon.',
                )}
              </Box>
            )}
            {state === 'error' && (
              <Box
                component="p"
                sx={[websiteSx['sb-form-message']]}
                role="alert"
                className="sb-form-message"
              >
                {text(
                  'ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
                  'Your details could not be sent. Please try again.',
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </>
  );
}

export function ServicesContent() {
  const { text } = useWebsiteLanguage();
  return (
    <>
      <InnerHero
        title={text(
          'มากกว่ากาแฟในทุกพื้นที่',
          'More than coffee in every space',
        )}
        text={text(
          'บริการที่ออกแบบให้ทุกทำเลมีศักยภาพมากขึ้น',
          'Services designed to make every location more capable.',
        )}
        image="/services/superblackcoffee-service-ev-charging.png"
        eyebrow="OUR SERVICES"
        dark
      />
      <Box
        component="section"
        sx={[websiteSx['sb-services-page'], websiteSx['sb-container']]}
        className="sb-services-page sb-container"
      >
        <SectionHeading
          text={text(
            'เติมเต็มการใช้ชีวิตและการเดินทาง ในแบบ Super Black Coffee',
            'Supporting everyday life and every journey, the Super Black Coffee way.',
          )}
        >
          {text('บริการของเรา', 'Our services')}
        </SectionHeading>
        {serviceItems.map((item, index) => (
          <Box
            component="article"
            sx={[websiteSx['sb-service-row']]}
            className="sb-service-row"
            key={item.title}
          >
            <Box
              component="span"
              sx={[websiteSx['sb-index']]}
              className="sb-index"
            >
              0{index + 1}
            </Box>
            <Photo src={item.image} alt={item.title} />
            <div>
              <h3>{item.title}</h3>
              <p>
                {text(
                  item.detail,
                  [
                    'Quality coffee and drinks, made with care in every cup.',
                    'Food and bakery for every time of day.',
                    'A service that brings extra ease to life and travel.',
                    'A place to pause, charge, and get ready for the road.',
                    'A coffee experience that travels with you.',
                  ][index],
                )}
              </p>
            </div>
          </Box>
        ))}
      </Box>
    </>
  );
}

export function NewsContent() {
  const { text, isEnglish } = useWebsiteLanguage();
  const posts = [
    'รวมโมเมนต์ดี ๆ กับชุมชนคนรักกาแฟ',
    'เปิดตัวเมนูใหม่ เอสเพรสโซ่ซิกเนเจอร์',
    'ส่งต่ออนาคตที่ดีให้กับชุมชนกาแฟไทย',
  ];
  const englishPosts = [
    'Good moments with our community of coffee lovers',
    'Introducing our new signature espresso menu',
    'A better future for Thailand’s coffee communities',
  ];
  return (
    <>
      <InnerHero
        title={text(
          'เรื่องราวจาก SUPER BLACK COFFEE',
          'Stories from SUPER BLACK COFFEE',
        )}
        text={text(
          'ข่าวสาร โปรโมชัน และเรื่องราวที่เราอยากแบ่งปัน',
          'News, promotions, and stories we want to share.',
        )}
        image="/coffee/coffee-cup-gallery.png"
        eyebrow="NEWS & STORIES"
        dark
      />
      <Box
        component="section"
        sx={[websiteSx['sb-news'], websiteSx['sb-container']]}
        className="sb-news sb-container"
      >
        <SectionHeading>
          {text('เรื่องราวล่าสุด', 'Latest stories')}
        </SectionHeading>
        {posts.map((title, index) => (
          <Box
            component="article"
            sx={[websiteSx['sb-news-row']]}
            key={title}
            className="sb-news-row"
          >
            <Box
              component="span"
              sx={[websiteSx['sb-index']]}
              className="sb-index"
            >
              0{index + 1}
            </Box>
            <h3>{isEnglish ? englishPosts[index] : title}</h3>
            <p>
              {text(
                'ติดตามเรื่องราวและกิจกรรมล่าสุดจาก SUPER BLACK COFFEE',
                'Follow the latest stories and activities from SUPER BLACK COFFEE.',
              )}
            </p>
          </Box>
        ))}
      </Box>
    </>
  );
}

export function ContactContent() {
  const { text } = useWebsiteLanguage();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    topic: '',
    message: '',
  });
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>(
    'idle',
  );
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState('sending');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'}/website/leads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      );
      if (!response.ok) throw new Error('Submission failed');
      trackEvent('generate_lead', { form_name: 'contact' });
      setForm({ name: '', phone: '', email: '', topic: '', message: '' });
      setState('success');
    } catch {
      setState('error');
    }
  };
  return (
    <>
      <InnerHero
        title={text('เริ่มต้นบทสนทนากับเรา', 'Start a conversation with us')}
        text={text(
          'ไม่ว่าจะเป็นคำถามเกี่ยวกับสาขา โอกาสแฟรนไชส์ หรือความร่วมมือใหม่ ๆ ทีมงานของเราพร้อมรับฟังและช่วยคุณก้าวไปสู่บทสนทนาที่ชัดเจนยิ่งขึ้น',
          'Whether you are exploring a branch, a franchise opportunity, or a new partnership, our team is ready to listen and help turn your first conversation into a clear next step.',
        )}
        image="/hero/contact-conversation.png"
        eyebrow="CONTACT SUPER BLACK COFFEE"
        dark
      />
      <Box
        component="section"
        sx={[websiteSx['sb-contact'], websiteSx['sb-container']]}
        className="sb-contact sb-container"
      >
        <Box
          component="div"
          sx={[websiteSx['sb-contact-info']]}
          className="sb-contact-info"
        >
          <h2>{text('ติดต่อเรา', 'Contact us')}</h2>
          <p>
            {text(
              'ทีมงานพร้อมรับฟังทุกคำถามและความสนใจของคุณ',
              'Our team is ready for your questions and ideas.',
            )}
          </p>
          <dl>
            <div>
              <dt>LINE</dt>
              <dd>
                <a
                  href="https://line.me/R/ti/p/@178lhzgu"
                  target="_blank"
                  rel="noreferrer"
                >
                  @178lhzgu
                </a>
              </dd>
            </div>
            <div>
              <dt>{text('โทรศัพท์', 'Phone')}</dt>
              <dd>
                <a href="tel:+6629707552">02-970-7552</a>
              </dd>
            </div>
            <div>
              <dt>{text('อีเมล', 'Email')}</dt>
              <dd>
                <a href="mailto:all.superblackcoffee@gmail.com">
                  all.superblackcoffee@gmail.com
                </a>
              </dd>
            </div>
          </dl>
        </Box>
        <Box
          component="form"
          sx={[websiteSx['sb-form'], websiteSx['sb-contact-form']]}
          onSubmit={submit}
          className="sb-form sb-contact-form"
        >
          <h3>{text('ส่งข้อความถึงเรา', 'Send us a message')}</h3>
          <Box
            component="div"
            sx={[websiteSx['sb-form-grid']]}
            className="sb-form-grid"
          >
            <label>
              {text('ชื่อ', 'Name')} <span>*</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              {text('เบอร์โทรศัพท์', 'Phone')} <span>*</span>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label>
              {text('อีเมล', 'Email')} <span>*</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              {text('สนใจเรื่อง', 'Topic')}
              <select
                required
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              >
                <option value="">
                  {text('เลือกหัวข้อ', 'Select a topic')}
                </option>
                <option value="franchise">
                  {text('แฟรนไชส์', 'Franchise')}
                </option>
                <option value="branch">
                  {text('สาขาและบริการ', 'Branches and services')}
                </option>
                <option value="other">{text('เรื่องอื่น ๆ', 'Other')}</option>
              </select>
            </label>
            <Box
              component="label"
              sx={[websiteSx['sb-form-wide']]}
              className="sb-form-wide"
            >
              {text('ข้อความ', 'Message')} <span>*</span>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </Box>
          </Box>
          <Box
            component="button"
            sx={[
              websiteSx['sb-button'],
              websiteSx['sb-button-gold'],
              websiteSx['sb-form-submit'],
            ]}
            disabled={state === 'sending'}
            className="sb-button sb-button-gold sb-form-submit"
          >
            {state === 'sending'
              ? text('กำลังส่ง...', 'Sending...')
              : text('ส่งข้อความ', 'Send message')}{' '}
            <Arrow />
          </Box>
          {state === 'success' && (
            <Box
              component="p"
              sx={[websiteSx['sb-form-message']]}
              role="status"
              className="sb-form-message"
            >
              {text(
                'ส่งข้อความแล้ว ทีมงานจะติดต่อกลับโดยเร็วที่สุด',
                'Your message has been sent. Our team will be in touch soon.',
              )}
            </Box>
          )}
          {state === 'error' && (
            <Box
              component="p"
              sx={[websiteSx['sb-form-message']]}
              role="alert"
              className="sb-form-message"
            >
              {text(
                'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
                'Your message could not be sent. Please try again.',
              )}
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
}
