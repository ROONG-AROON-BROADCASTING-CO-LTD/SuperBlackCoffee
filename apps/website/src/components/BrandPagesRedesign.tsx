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
    name: 'รัชดา',
    address:
      '68 10 ซ. ประชาอุทิศ 22 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    phone: '081-825-3584',
    hours: '08:00–20:30 น.',
    map: '',
    image: '/branches/ratchada-dusk.png',
    status: 'เปิดทุกวัน',
  },
];

const menus: Record<string, { name: string; detail: string; image: string }[]> =
  {
    กาแฟ: [
      {
        name: 'อเมริกาโน่',
        detail: 'กาแฟดำเย็นรสชัด สำหรับทุกจังหวะของวัน',
        image: '/menu/americano.png',
      },
      {
        name: 'ลาเต้',
        detail: 'กาแฟนมเนียนนุ่ม ดื่มง่ายและกลมกล่อม',
        image: '/menu/latte.png',
      },
      {
        name: 'คาปูชิโน่',
        detail: 'เอสเปรสโซ่เข้มข้นกับฟองนมนุ่มละมุน',
        image: '/menu/cappuccino.png',
      },
      {
        name: 'มอคค่า',
        detail: 'กาแฟและโกโก้ในแก้วเดียวสำหรับคนชอบรสเข้ม',
        image: '/menu/mocha.png',
      },
      {
        name: 'เอสเปรสโซ่',
        detail: 'กาแฟช็อตเข้มข้นสำหรับคนที่ชอบรสกาแฟชัดเจน',
        image: '/menu/espresso.png',
      },
      {
        name: 'วนิลาลาเต้',
        detail: 'ลาเต้เนียนนุ่ม เติมกลิ่นวานิลลาหอมละมุน',
        image: '/menu/vanilla-latte.png',
      },
      {
        name: 'อเมริกาโน่น้ำผึ้ง',
        detail: 'กาแฟดำรสชัด ตัดด้วยความหวานละมุนจากน้ำผึ้ง',
        image: '/menu/honey-americano.png',
      },
      {
        name: 'อเมริกาโน่มะพร้าว',
        detail: 'กาแฟดำและมะพร้าวในแก้วที่หอมสดชื่น',
        image: '/menu/coconut-americano.png',
      },
    ],
    ชาและมัทฉะ: [
      {
        name: 'ชาไทย',
        detail: 'ชาไทยหอมละมุน รสชาติคุ้นเคยที่ดื่มได้ทุกเวลา',
        image: '/menu/thai-tea.png',
      },
      {
        name: 'มัทฉะลาเต้',
        detail: 'มัทฉะเข้มข้นผสมนมอย่างพอดี',
        image: '/menu/matcha-latte.png',
      },
      {
        name: 'มัทฉะมะพร้าว',
        detail: 'ความสดชื่นของมัทฉะคู่กับมะพร้าว',
        image: '/menu/coconut-matcha.png',
      },
      {
        name: 'เพียวมัทฉะ',
        detail: 'รสมัทฉะชัดเจนสำหรับคนรักชาเขียว',
        image: '/menu/pure-matcha.png',
      },
      {
        name: 'ชาเขียว',
        detail: 'ชาเขียวหอมสดชื่น ดื่มง่ายในทุกช่วงเวลา',
        image: '/menu/green-tea.png',
      },
      {
        name: 'ชาเขียวน้ำผึ้งมะนาว',
        detail: 'ชาเขียวกับรสเปรี้ยวหวานที่สดชื่นพอดี',
        image: '/menu/green-tea-honey-lemon.png',
      },
      {
        name: 'มัทฉะเลมอน',
        detail: 'มัทฉะและเลมอนสำหรับรสชาติที่สดใส',
        image: '/menu/matcha-lemon.png',
      },
      {
        name: 'ชาไทยโกโก้',
        detail: 'ชาไทยหอมเข้ากับโกโก้ในอีกมุมรสชาติหนึ่ง',
        image: '/menu/thai-tea-cocoa.png',
      },
    ],
    เมนูปั่น: [
      {
        name: 'โกโก้ปั่น',
        detail: 'โกโก้เข้มข้นปั่นเย็น ให้พลังระหว่างวัน',
        image: '/menu/blended-cocoa.png',
      },
      {
        name: 'สตรอว์เบอร์รีนมสดปั่น',
        detail: 'ผลไม้และนมสดในแก้วที่สดใส',
        image: '/menu/strawberry-milkshake.png',
      },
      {
        name: 'มัทฉะมะพร้าวปั่น',
        detail: 'มัทฉะและมะพร้าวปั่นเนียนเย็นสดชื่น',
        image: '/menu/blended-coconut-matcha.png',
      },
      {
        name: 'มะพร้าวนมสดปั่น',
        detail: 'ความหอมหวานของมะพร้าวและนมสด',
        image: '/menu/blended-coconut-milk.png',
      },
      {
        name: 'สตรอว์เบอร์รีปั่น',
        detail: 'ผลไม้รสสดใสในแก้วปั่นเย็นชื่นใจ',
        image: '/menu/strawberry-blended.png',
      },
      {
        name: 'ลิ้นจี่ปั่น',
        detail: 'ลิ้นจี่หอมหวาน ปั่นเย็นสำหรับวันสบาย ๆ',
        image: '/menu/lychee-blended.png',
      },
      {
        name: 'ชาไทยปั่น',
        detail: 'ชาไทยรสละมุนในรูปแบบปั่นเนียนเย็น',
        image: '/menu/thai-tea-blended.png',
      },
      {
        name: 'โอรีโอ้นมสดปั่น',
        detail: 'นมสดปั่นกับโอรีโอ้สำหรับคนชอบรสเข้มข้น',
        image: '/menu/oreo-milk-blended.png',
      },
    ],
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
  รัชดา: {
    name: 'Ratchada',
    address: '68/10 Pracha Uthit Soi 22, Huai Khwang, Bangkok 10310',
  },
};

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
  const [isLoaded, setIsLoaded] = useState(false);

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
        onLoad={() => setIsLoaded(true)}
        style={{ opacity: isLoaded ? 1 : 0, objectPosition: position }}
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
              {text('พรีเมียมเหนือระดับ', 'Premium beyond')}
            </span>
            <br />
            <span>{text('ในทุกช่วงเวลา', 'every moment')}</span>
          </h1>
          <p>
            {text(
              'สัมผัสประสบการณ์กาแฟพรีเมียม พลังงานสะอาด ในพื้นที่ที่ออกแบบมาเพื่อทุกไลฟ์สไตล์',
              'Experience premium coffee, clean energy, and spaces designed for every lifestyle.',
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
                  {text('กาแฟพรีเมียม', 'Premium coffee')}
                  <br />
                  {text('รสชาติอันเป็นเอกลักษณ์', 'Distinctive flavour')}
                </span>
              </Box>
              <Box component="div">
                <CoffeeIcon size={25} />
                <span>
                  {text('พื้นที่นั่งสบาย', 'Comfortable seating')}
                  <br />
                  {text('ทำงานหรือพักผ่อนได้', 'Work or unwind')}
                </span>
              </Box>
              <Box component="div">
                <UsersIcon size={25} />
                <span>
                  {text('พบเจอผู้คนดี', 'Good people')}
                  <br />
                  {text('ทุกช่วงเวลา', 'at every moment')}
                </span>
              </Box>
              <Box component="div">
                <EvChargerIcon size={25} />
                <span>
                  {text('Wi-Fi ฟรี', 'Free Wi-Fi')}
                  <br />
                  {text('รองรับทุกไลฟ์สไตล์', 'for every lifestyle')}
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
              <Box
                component={Link}
                sx={[
                  websiteSx['sb-button'],
                  websiteSx['sb-button-gold'],
                  websiteSx['sb-editorial-cta'],
                ]}
                className="sb-button sb-button-gold sb-editorial-cta"
                href="/services"
              >
                {text('ดูบริการ EV Charging', 'Explore EV charging')} <Arrow />
              </Box>
            </Box>
            <Box component="div" className="sb-ev-showcase-points">
              <Box component="div">
                <EvChargerIcon size={25} />
                <span>
                  {text('หัวชาร์จมาตรฐาน', 'Standard chargers')}
                  <br />
                  {text(
                    'รองรับรถหลากหลายรุ่น',
                    'Compatible with many vehicles',
                  )}
                </span>
              </Box>
              <Box component="div">
                <CoffeeIcon size={25} />
                <span>
                  {text('สะดวก ปลอดภัย', 'Convenient and safe')}
                  <br />
                  {text('พร้อมเดินทางต่อ', 'Ready for the road')}
                </span>
              </Box>
              <Box component="div">
                <CoffeeIcon size={25} />
                <span>
                  {text('เติมพลังระหว่างรอ', 'Recharge while you wait')}
                  <br />
                  {text('ด้วยกาแฟคุณภาพ', 'with quality coffee')}
                </span>
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
            src="/branches/branch-night-exterior.png"
            alt="ร้าน Super Black Coffee"
          />
          <div>
            <h2>{text('ค้นหาสาขาใกล้คุณ', 'Find a branch near you')}</h2>
            <p>
              {text(
                'หรือเลือกดูสาขาทั้งหมด เพื่อวางแผนการเดินทางในครั้งต่อไป',
                'Or browse every branch to plan your next journey.',
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
          'เรื่องราวที่เริ่มจากแก้วกาแฟ',
          'A story that began with a cup of coffee',
        )}
        text={text(
          'เราอยากสร้างพื้นที่ที่กาแฟดี ผู้คนดี และธุรกิจที่ดีเติบโตไปพร้อมกัน',
          'We create a place where good coffee, good people, and good business grow together.',
        )}
        image="/hero/about-story.png"
        eyebrow="ABOUT SUPER BLACK COFFEE"
      />
      <Box
        component="section"
        sx={[websiteSx['sb-about-grid'], websiteSx['sb-container']]}
        className="sb-about-grid sb-container"
      >
        <div>
          <h2>{text('เริ่มจากแก้วที่ดี', 'It starts with a good cup')}</h2>
        </div>
        <div>
          <p>
            {text(
              'Super Black Coffee เริ่มจากความเชื่อเรียบง่ายว่า กาแฟดีหนึ่งแก้วเปลี่ยนช่วงเวลาธรรมดาให้ดีขึ้นได้',
              'Super Black Coffee began with a simple belief: a good cup of coffee can make an ordinary moment better.',
            )}
          </p>
          <p>
            {text(
              'เราจึงสร้างพื้นที่ที่คุณแวะพัก ทำงาน พบปะ และออกเดินทางต่อได้อย่างสบายใจ',
              'So we make a space where you can stop, work, meet, and continue your journey with ease.',
            )}
          </p>
        </div>
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-about-photo'], websiteSx['sb-container']]}
        className="sb-about-photo sb-container"
      >
        <Photo
          src="/about/about-barista-craft.png"
          alt="บาริสต้ากำลังรังสรรค์กาแฟอย่างตั้งใจ"
          position="center"
        />
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-about-principles'], websiteSx['sb-container']]}
        className="sb-about-principles sb-container"
      >
        <Box component="div" className="sb-about-principles-intro">
          <h2>{text('มากกว่าร้านกาแฟ', 'More than a coffee shop')}</h2>
          <p>
            {text(
              'ทุกแก้ว ทุกพื้นที่ และทุกบริการ ถูกออกแบบให้เป็นจุดพักที่ช่วยให้วันของคุณไปต่อได้ดีขึ้น',
              'Every cup, space, and service is designed as a stop that helps your day move forward.',
            )}
          </p>
        </Box>
        <Box component="div" className="sb-about-principles-list">
          <article>
            <span>01</span>
            <h3>{text('คุณภาพในทุกแก้ว', 'Quality in every cup')}</h3>
            <p>
              {text(
                'คัดสรรเมล็ดกาแฟและพัฒนารสชาติอย่างตั้งใจ ให้คุณมั่นใจได้ในทุกครั้งที่แวะมา',
                'We select our beans and develop every flavour with care, so every visit feels dependable.',
              )}
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>
              {text('พื้นที่สำหรับทุกจังหวะ', 'A space for every moment')}
            </h3>
            <p>
              {text(
                'จะทำงาน พักผ่อน หรือเจอคนสำคัญ ที่นี่มีพื้นที่ให้คุณใช้เวลาในแบบของตัวเอง',
                'Work, rest, or meet someone important—this is a place to spend time your way.',
              )}
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>{text('พร้อมไปต่อทุกเส้นทาง', 'Ready for every journey')}</h3>
            <p>
              {text(
                'เติมพลังให้ทั้งคุณและรถ ด้วยบริการ EV Charging และสิ่งอำนวยความสะดวก ที่พร้อมสำหรับการเดินทาง',
                'Recharge both yourself and your car with EV charging and amenities made for the road.',
              )}
            </p>
          </article>
          <article>
            <span>04</span>
            <h3>{text('เติบโตไปด้วยกัน', 'Grow together')}</h3>
            <p>
              {text(
                'เราสร้างโอกาสให้ทีมงาน ชุมชน และผู้ประกอบการ เติบโตไปกับแบรนด์อย่างยั่งยืน',
                'We create opportunities for our team, communities, and entrepreneurs to grow sustainably with the brand.',
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
          src="/about/about-cafe-life.png"
          alt="พื้นที่คาเฟ่สำหรับการทำงานและพักผ่อน"
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
            {text('จากต้นทางถึงทุกการเดินทาง', 'From origin to every journey')}
          </h2>
          <p>
            {text(
              'สิ่งที่เราตั้งใจให้เกิดขึ้นในทุกครั้งที่คุณแวะมา',
              'What we hope to make possible every time you visit.',
            )}
          </p>
        </Box>
        <Box component="ol" className="sb-about-journey-steps">
          <li>
            <span>01</span>
            <div>
              <h3>{text('คัดสรร', 'Select')}</h3>
              <p>{text('เลือกวัตถุดิบที่ดี', 'Choose quality ingredients')}</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>{text('รังสรรค์', 'Craft')}</h3>
              <p>
                {text('ทำทุกแก้วด้วยความตั้งใจ', 'Make every cup with care')}
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>{text('ส่งต่อ', 'Pass it on')}</h3>
              <p>
                {text('เติมพลังให้คุณไปต่อ', 'Give you energy to continue')}
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
        <cite>SUPER BLACK COFFEE</cite>
      </Box>
    </>
  );
}

export function MenuContent() {
  const { text, isEnglish } = useWebsiteLanguage();
  const [active, setActive] = useState('กาแฟ');
  return (
    <>
      <InnerHero
        title={text(
          'เมนูที่ตั้งใจในทุกแก้ว',
          'A menu made with care in every cup',
        )}
        text={text(
          'รสชาติที่ชัดเจน จากวัตถุดิบที่เราเลือกเอง',
          'Clear flavours from ingredients we choose ourselves.',
        )}
        image="/hero/menu-craft.png"
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
          {Object.keys(menus).map((category) => (
            <button
              key={category}
              role="tab"
              aria-selected={active === category}
              className={active === category ? 'active' : ''}
              onClick={() => setActive(category)}
            >
              {text(
                category,
                category === 'กาแฟ'
                  ? 'Coffee'
                  : category === 'ชาและมัทฉะ'
                    ? 'Tea & Matcha'
                    : 'Blended drinks',
              )}
            </button>
          ))}
        </Box>
        <Box
          component="div"
          sx={[websiteSx['sb-menu-layout']]}
          className="sb-menu-layout"
        >
          <div>
            <h2>
              {text(
                active,
                active === 'กาแฟ'
                  ? 'Coffee'
                  : active === 'ชาและมัทฉะ'
                    ? 'Tea & Matcha'
                    : 'Blended drinks',
              )}
            </h2>
            <Box component="p" sx={[websiteSx['sb-lead']]} className="sb-lead">
              {text(
                'เมนูตัวอย่างจาก Super Black Coffee เลือกให้เห็นรสชาติและสไตล์เครื่องดื่มที่เรามี',
                'A selection of Super Black Coffee drinks to show our flavours and style.',
              )}
            </Box>
            <Box
              component="div"
              sx={[websiteSx['sb-menu-grid']]}
              className="sb-menu-grid"
            >
              {menus[active].map((item, index) => {
                const copy = isEnglish ? menuTranslations[active][index] : item;
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
          'ค้นหาสาขาและบริการที่ใกล้คุณที่สุด',
          'Find the nearest branch and services for you.',
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
          'เริ่มต้นแฟรนไชส์ในรูปแบบที่เหมาะกับพื้นที่และเป้าหมายของคุณ',
          'Start a franchise model that fits your site and your goals.',
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
            'เลือกรูปแบบที่เข้ากับทำเลของคุณ พร้อมระบบและประสบการณ์ที่พัฒนาจากการทำร้านกาแฟจริง',
            'Choose a model that fits your location, with systems and experience built from running real coffee shops.',
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
          'ไม่ว่าจะเป็นเรื่องสาขา แฟรนไชส์ หรือความร่วมมือ เรายินดีรับฟัง',
          'Whether it is about a branch, franchise, or partnership, we are ready to listen.',
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
