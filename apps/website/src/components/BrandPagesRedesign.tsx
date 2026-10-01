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

const branches = [
  {
    name: 'อยุธยา',
    address:
      '15/78 หมู่ที่ 3 ถนนป่ามะพร้าว ตำบลท่าวาสุกรี อำเภอพระนครศรีอยุธยา จังหวัดพระนครศรีอยุธยา 13000',
    phone: '061-884-9960',
    hours: '08:00–20:30 น.',
    map: 'https://maps.app.goo.gl/B2sXw1XnoACsmphA9',
    image: '/coffee/coffee-storefront.png',
    status: 'เปิดทุกวัน',
  },
  {
    name: 'พิษณุโลก',
    address:
      '654/18 ถนนพระองค์ขาว ซอย 4 ตำบลในเมือง อำเภอเมืองพิษณุโลก จังหวัดพิษณุโลก 65000',
    phone: '080-174-7757',
    hours: '08:00–20:30 น.',
    map: 'https://maps.app.goo.gl/rbCG1HbrHJXHffSk6',
    image: '/hero/superblackcoffee-brand-hero.png?v=20260930',
    status: 'เปิดทุกวัน',
  },
  {
    name: 'รัชดา',
    address: 'กรุงเทพมหานคร',
    phone: '',
    hours: '',
    map: '',
    image: '/coffee/coffee-cup-gallery.png',
    status: 'พบกันเร็ว ๆ นี้',
  },
];

const menus: Record<string, { name: string; price: number; detail: string }[]> =
  {
    กาแฟ: [
      { name: 'Espresso', price: 90, detail: 'เอสเพรสโซ่' },
      { name: 'Americano', price: 100, detail: 'อเมริกาโน่' },
      { name: 'Latte', price: 120, detail: 'ลาเต้' },
      { name: 'Cappuccino', price: 120, detail: 'คาปูชิโน่' },
      { name: 'Flat White', price: 120, detail: 'แฟลตไวท์' },
      { name: 'Mocha', price: 130, detail: 'มอคค่า' },
    ],
    ชาและมัทฉะ: [
      { name: 'Matcha Latte', price: 125, detail: 'มัทฉะลาเต้' },
      { name: 'Thai Tea', price: 95, detail: 'ชาไทย' },
    ],
    เครื่องดื่ม: [
      { name: 'Chocolate', price: 105, detail: 'โกโก้' },
      { name: 'Italian Soda', price: 85, detail: 'อิตาเลียนโซดา' },
    ],
    เบเกอรี่: [
      { name: 'Croissant', price: 85, detail: 'ครัวซองต์' },
      { name: 'Brownie', price: 75, detail: 'บราวนี่' },
    ],
  };

const plans = [
  {
    size: 'S',
    name: 'Smart Café',
    area: '20–40 ตร.ม.',
    service: 'Coffee & Beverage',
    cost: '1.2–2.2 ล้านบาท',
    image: '/franchise/superblackcoffee-franchise-s.png',
  },
  {
    size: 'M',
    name: 'Lifestyle Café',
    area: '40–100 ตร.ม.',
    service: 'Coffee, Food & Bakery',
    cost: '2.5–4.5 ล้านบาท',
    image: '/franchise/superblackcoffee-franchise-m.png',
  },
  {
    size: 'L',
    name: 'Lifestyle Hub',
    area: '100 ตร.ม. ขึ้นไป',
    service: 'ครบทุกบริการของเรา',
    cost: '5–10 ล้านบาท+',
    image: '/franchise/superblackcoffee-franchise-l.png',
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
    href: '/menu',
  },
  {
    title: 'EV CHARGING',
    detail: 'สถานีชาร์จรถยนต์ไฟฟ้า มาตรฐาน ปลอดภัย',
    image: '/services/superblackcoffee-service-ev-charging.png',
    href: '/services',
  },
  {
    title: 'BPOST65 EXPRESS',
    detail: 'บริการจัดส่งพัสดุที่สะดวกในทุกเส้นทาง',
    image: '/services/superblackcoffee-service-bpost65-express.png',
    href: '/services',
  },
  {
    title: 'FRANCHISE',
    detail: 'ร่วมเติบโตไปด้วยกัน กับธุรกิจที่มั่นคง',
    image: '/franchise/superblackcoffee-franchise-m.png',
    href: '/franchise',
  },
  {
    title: 'SUPERBLACK CONTROL',
    detail: 'ระบบบริหารจัดการร้านค้าและแฟรนไชส์ครบวงจร',
    image: '/services/superblackcoffee-service-control.png',
    href: '/franchise',
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
  position = 'center',
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
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
        loading={priority ? undefined : 'eager'}
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
  dark = false,
}: {
  title: string;
  text: string;
  image: string;
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

function BranchRow({
  branch,
  index,
}: {
  branch: (typeof branches)[number];
  index: number;
}) {
  return (
    <Box
      component="article"
      sx={[websiteSx['sb-branch-row']]}
      className="sb-branch-row"
    >
      <Box component="span" sx={[websiteSx['sb-index']]} className="sb-index">
        0{index + 1}
      </Box>
      <Photo src={branch.image} alt={`สาขา${branch.name}`} />
      <Box
        component="div"
        sx={[websiteSx['sb-branch-info']]}
        className="sb-branch-info"
      >
        <h3>{branch.name}</h3>
        <p>{branch.address}</p>
        <Box
          component="div"
          sx={[websiteSx['sb-branch-meta']]}
          className="sb-branch-meta"
        >
          <span>{branch.status}</span>
          {branch.hours && <span>{branch.hours}</span>}
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
          aria-label={`เปิดแผนที่สาขา${branch.name}`}
        >
          <span>แผนที่</span>
          <Arrow />
        </Box>
      ) : (
        <Box
          component="span"
          sx={[websiteSx['sb-row-link'], websiteSx['sb-row-link-muted']]}
          className="sb-row-link sb-row-link-muted"
        >
          เร็ว ๆ นี้
        </Box>
      )}
    </Box>
  );
}

export function HomeContent() {
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);
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
            <span className="sb-hero-title-accent">พรีเมียมเหนือระดับ</span>
            <br />
            <span>ในทุกช่วงเวลา</span>
          </h1>
          <p>
            สัมผัสประสบการณ์กาแฟพรีเมียม พลังงานสะอาด
            ในพื้นที่ที่ออกแบบมาเพื่อทุกไลฟ์สไตล์
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
              ค้นหาสาขาใกล้คุณ <Arrow />
            </Box>
            <Box
              component={Link}
              sx={[websiteSx['sb-button'], websiteSx['sb-button-ghost']]}
              className="sb-button sb-button-ghost"
              href="/menu"
            >
              ดูเมนูทั้งหมด <Arrow />
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
                <p>{card.detail}</p>
                <span>
                  ดูรายละเอียด <Arrow />
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
                  <p>{stat.detail}</p>
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
              มากกว่ากาแฟ
              <br />
              <span>คือพลังในทุกวัน</span>
            </h2>
            <p>
              เราเชื่อว่ากาแฟหนึ่งแก้ว สามารถจุดพลังให้วันธรรมดา
              กลายเป็นวันที่พิเศษได้ Super Black Coffee
              จึงคัดสรรเมล็ดกาแฟคุณภาพระดับพรีเมียม สร้างสรรค์รสชาติที่จริงใจ
              สำหรับคนที่มองหามากกว่าความอร่อย แต่คือแรงบันดาลใจในทุกวัน
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
              อ่านเรื่องราวของเรา <Arrow />
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
              กาแฟพรีเมียม
              <br />
              <span>สำหรับทุกโมเมนต์</span>
            </h2>
            <p>
              สัมผัสกาแฟคุณภาพ คัดสรรเมล็ดพันธุ์ระดับพรีเมียม
              รังสรรค์เป็นเมนูหลากหลาย ตอบโจทย์ทุกไลฟ์สไตล์
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
              ดูเมนูทั้งหมด <Arrow />
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
              มากกว่ากาแฟ
              <br />
              <span>เพื่อทุกการเดินทาง</span>
            </h2>
            <p>
              เติมพลังให้ทุกวัน ด้วยกาแฟระดับพรีเมียม พื้นที่ที่รังสรรค์เพื่อคุณ
              และบริการพร้อมออกเดินทางต่อ
            </p>
            <Box component="div" className="sb-services-benefits">
              <Box component="div">
                <CoffeeIcon size={25} />
                <span>
                  กาแฟพรีเมียม
                  <br />
                  รสชาติอันเป็นเอกลักษณ์
                </span>
              </Box>
              <Box component="div">
                <CoffeeIcon size={25} />
                <span>
                  พื้นที่นั่งสบาย
                  <br />
                  ทำงานหรือพักผ่อนได้
                </span>
              </Box>
              <Box component="div">
                <UsersIcon size={25} />
                <span>
                  พบเจอผู้คนดี
                  <br />
                  ทุกช่วงเวลา
                </span>
              </Box>
              <Box component="div">
                <EvChargerIcon size={25} />
                <span>
                  Wi-Fi ฟรี
                  <br />
                  รองรับทุกไลฟ์สไตล์
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
                ชาร์จพลังรถ
                <br />
                <span>พร้อมชาร์จพลังให้ตัวคุณ</span>
              </h3>
              <p>
                บริการ EV Charging กับมาตรการชาร์จพลังไฟฟ้า
                ให้คุณเติมพลังได้ทั้งการเดินทาง
                และยังมีมุมรอพักพร้อมกาแฟแก้วโปรด
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
                ดูบริการ EV Charging <Arrow />
              </Box>
            </Box>
            <Box component="div" className="sb-ev-showcase-points">
              <Box component="div">
                <EvChargerIcon size={25} />
                <span>
                  หัวชาร์จมาตรฐาน
                  <br />
                  รองรับรถหลากหลายรุ่น
                </span>
              </Box>
              <Box component="div">
                <CoffeeIcon size={25} />
                <span>
                  สะดวก ปลอดภัย
                  <br />
                  พร้อมเดินทางต่อ
                </span>
              </Box>
              <Box component="div">
                <CoffeeIcon size={25} />
                <span>
                  เติมพลังระหว่างรอ
                  <br />
                  ด้วยกาแฟคุณภาพ
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
            <h2>ค้นหาสาขาใกล้คุณ</h2>
            <p>หรือเลือกดูสาขาทั้งหมด เพื่อวางแผนการเดินทางในครั้งต่อไป</p>
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
              ค้นหาสาขา <Arrow />
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
              ร่วมเติบโตไปด้วยกัน
              <br />
              <span>กับ Super Black Coffee</span>
            </h2>
            <p>
              โอกาสในการเป็นส่วนหนึ่งของแบรนด์กาแฟที่พร้อมเติบโตไปกับคุณ
              ร่วมสร้างประสบการณ์กาแฟคุณภาพ และไลฟ์สไตล์ที่มากกว่า กับเรา
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
              สำรวจแฟรนไชส์ <Arrow />
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
  return (
    <>
      <InnerHero
        title="เรื่องราวที่เริ่มจากแก้วกาแฟ"
        text="เราอยากสร้างพื้นที่ที่กาแฟดี ผู้คนดี และธุรกิจที่ดีเติบโตไปพร้อมกัน"
        image="/coffee/coffee-cup-gallery.png"
      />
      <Box
        component="section"
        sx={[websiteSx['sb-about-grid'], websiteSx['sb-container']]}
        className="sb-about-grid sb-container"
      >
        <div>
          <Box
            component="span"
            sx={[websiteSx['sb-rule']]}
            className="sb-rule"
          />
          <h2>คุณภาพไม่ใช่ทางเลือก</h2>
        </div>
        <div>
          <p>
            ตั้งแต่การเลือกเมล็ดกาแฟ การฝึกทีมบาริสต้า ไปจนถึงการดูแลทุกสาขา
            เราออกแบบทุกขั้นตอนให้ส่งมอบประสบการณ์ที่เหมือนกันในทุกแก้ว
          </p>
          <p>
            SUPER BLACK COFFEE
            คือแพลตฟอร์มที่พร้อมเติบโตไปกับชุมชนและผู้ประกอบการ
          </p>
        </div>
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-about-photo']]}
        className="sb-about-photo"
      >
        <Photo
          src="/hero/superblackcoffee-brand-hero.png?v=20260930"
          alt="หน้าร้าน Super Black Coffee"
        />
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-bottom-cta'], websiteSx['sb-container']]}
        className="sb-bottom-cta sb-container"
      >
        <h2>พื้นที่ที่พร้อมไปกับทุกการเดินทาง</h2>
        <Box
          component={Link}
          sx={[websiteSx['sb-button'], websiteSx['sb-button-dark']]}
          className="sb-button sb-button-dark"
          href="/branches"
        >
          พบกับสาขาของเรา <Arrow />
        </Box>
      </Box>
    </>
  );
}

export function MenuContent() {
  const [active, setActive] = useState('กาแฟ');
  return (
    <>
      <InnerHero
        title="เมนูที่ตั้งใจในทุกแก้ว"
        text="รสชาติที่ชัดเจน จากวัตถุดิบที่เราเลือกเอง"
        image="/services/superblackcoffee-service-coffee.png"
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
          aria-label="ประเภทเมนู"
        >
          {Object.keys(menus).map((category) => (
            <button
              key={category}
              role="tab"
              aria-selected={active === category}
              className={active === category ? 'active' : ''}
              onClick={() => setActive(category)}
            >
              {category}
            </button>
          ))}
        </Box>
        <Box
          component="div"
          sx={[websiteSx['sb-menu-layout']]}
          className="sb-menu-layout"
        >
          <div>
            <h2>{active}</h2>
            <Box component="p" sx={[websiteSx['sb-lead']]} className="sb-lead">
              เลือกช่วงเวลาที่ใช่ แล้วให้เราทำแก้วที่เหมาะกับคุณ
            </Box>
            <Box
              component="div"
              sx={[websiteSx['sb-menu-list']]}
              className="sb-menu-list"
            >
              {menus[active].map((item) => (
                <Box
                  component="div"
                  sx={[websiteSx['sb-menu-item']]}
                  className="sb-menu-item"
                  key={item.name}
                >
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.detail}</p>
                  </div>
                  <strong>฿{item.price}</strong>
                </Box>
              ))}
            </Box>
          </div>
          <Photo
            src={
              active === 'เบเกอรี่'
                ? '/services/superblackcoffee-service-bakery.png'
                : active === 'ชาและมัทฉะ'
                  ? '/coffee/coffee-drinks.png'
                  : '/coffee/coffee-espresso.png'
            }
            alt={`เมนู${active}`}
          />
        </Box>
      </Box>
    </>
  );
}

export function BranchesContent() {
  const [query, setQuery] = useState('');
  const filtered = branches.filter((branch) =>
    `${branch.name} ${branch.address}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <InnerHero
        title="พบกับเราได้ทุกวัน"
        text="ค้นหาสาขาและบริการที่ใกล้คุณที่สุด"
        image="/hero/superblackcoffee-brand-hero.png?v=20260930"
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
            <h2>สาขาของเรา</h2>
            <p>เลือกจุดพักที่ใช่บนเส้นทางของคุณ</p>
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
              placeholder="ค้นหาชื่อสาขาหรือจังหวัด"
              aria-label="ค้นหาสาขา"
            />
          </Box>
        </Box>
        <Box
          component="div"
          sx={[websiteSx['sb-branch-list']]}
          className="sb-branch-list"
        >
          {filtered.map((branch, index) => (
            <BranchRow key={branch.name} branch={branch} index={index} />
          ))}
          {filtered.length === 0 && (
            <Box
              component="p"
              sx={[websiteSx['sb-empty']]}
              className="sb-empty"
            >
              ไม่พบสาขาที่ค้นหา ลองใช้ชื่อจังหวัดหรือชื่อสาขาอื่น
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
  const [form, setForm] = useState<LeadForm>(emptyLead);
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
        title="ธุรกิจที่เติบโตไปด้วยกัน"
        text="เริ่มต้นแฟรนไชส์ในรูปแบบที่เหมาะกับพื้นที่และเป้าหมายของคุณ"
        image="/franchise/superblackcoffee-franchise-m.png"
        dark
      />
      <Box
        component="section"
        sx={[websiteSx['sb-franchise-intro'], websiteSx['sb-container']]}
        className="sb-franchise-intro sb-container"
      >
        <h2>เติบโตไปด้วยกัน</h2>
        <p>
          เลือกรูปแบบที่เข้ากับทำเลของคุณ
          พร้อมระบบและประสบการณ์ที่พัฒนาจากการทำร้านกาแฟจริง
        </p>
        <Photo
          src="/coffee/coffee-storefront.png"
          alt="ร้าน Super Black Coffee"
        />
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-plans'], websiteSx['sb-container']]}
        className="sb-plans sb-container"
      >
        <SectionHeading text="รูปแบบการลงทุนสำหรับพื้นที่และเป้าหมายที่แตกต่าง">
          เลือกรูปแบบแฟรนไชส์
        </SectionHeading>
        <Box
          component="div"
          sx={[websiteSx['sb-plan-grid']]}
          className="sb-plan-grid"
        >
          {plans.map((plan) => (
            <Box
              component="article"
              sx={[websiteSx['sb-plan']]}
              className="sb-plan"
              key={plan.size}
            >
              <Box
                component="div"
                sx={[websiteSx['sb-plan-top']]}
                className="sb-plan-top"
              >
                <span>{plan.size}</span>
                <div>
                  <h3>{plan.name}</h3>
                  <p>{plan.service}</p>
                </div>
              </Box>
              <Box
                component="div"
                sx={[websiteSx['sb-plan-facts']]}
                className="sb-plan-facts"
              >
                <div>
                  <span>พื้นที่แนะนำ</span>
                  <strong>{plan.area}</strong>
                </div>
                <div>
                  <span>งบลงทุนโดยประมาณ</span>
                  <strong>{plan.cost}</strong>
                </div>
              </Box>
              <Box
                component={Link}
                sx={[websiteSx['sb-text-link']]}
                href="#apply"
                className="sb-text-link"
              >
                ติดต่อทีมแฟรนไชส์ <Arrow />
              </Box>
            </Box>
          ))}
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
            <Box
              component="span"
              sx={[websiteSx['sb-rule']]}
              className="sb-rule"
            />
            <h2>
              เริ่มต้นเพียง
              <br />5 ขั้นตอน
            </h2>
            <p>
              กรอกข้อมูล · นัดพูดคุย · ประเมินทำเล · สรุปสัญญา · เตรียมเปิดร้าน
            </p>
          </div>
          <Box
            component="form"
            sx={[websiteSx['sb-form']]}
            onSubmit={submit}
            className="sb-form"
          >
            <h3>พูดคุยกับทีมแฟรนไชส์</h3>
            <Box
              component="div"
              sx={[websiteSx['sb-form-grid']]}
              className="sb-form-grid"
            >
              <label>
                ชื่อ <span>*</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                เบอร์โทรศัพท์ <span>*</span>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <label>
                อีเมล
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                จังหวัด / ทำเลที่สนใจ
                <input
                  value={form.province}
                  onChange={(e) =>
                    setForm({ ...form, province: e.target.value })
                  }
                />
              </label>
              <label>
                รูปแบบที่สนใจ
                <select
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value })}
                >
                  <option value="">ยังไม่แน่ใจ</option>
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
                ข้อความเพิ่มเติม
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
              sx={[websiteSx['sb-button'], websiteSx['sb-button-gold']]}
              className="sb-button sb-button-gold"
              disabled={state === 'sending'}
            >
              {state === 'sending' ? 'กำลังส่ง...' : 'ส่งข้อมูลให้ทีมแฟรนไชส์'}{' '}
              <Arrow />
            </Box>
            {state === 'success' && (
              <Box
                component="p"
                sx={[websiteSx['sb-form-message']]}
                role="status"
                className="sb-form-message"
              >
                ส่งข้อมูลถึงทีมงานแล้ว เราจะติดต่อกลับโดยเร็วที่สุด
              </Box>
            )}
            {state === 'error' && (
              <Box
                component="p"
                sx={[websiteSx['sb-form-message']]}
                role="alert"
                className="sb-form-message"
              >
                ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </>
  );
}

export function ServicesContent() {
  return (
    <>
      <InnerHero
        title="มากกว่ากาแฟในทุกพื้นที่"
        text="บริการที่ออกแบบให้ทุกทำเลมีศักยภาพมากขึ้น"
        image="/services/superblackcoffee-service-ev-charging.png"
        dark
      />
      <Box
        component="section"
        sx={[websiteSx['sb-services-page'], websiteSx['sb-container']]}
        className="sb-services-page sb-container"
      >
        <SectionHeading text="เติมเต็มการใช้ชีวิตและการเดินทาง ในแบบ Super Black Coffee">
          บริการของเรา
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
              <p>{item.detail}</p>
            </div>
          </Box>
        ))}
      </Box>
    </>
  );
}

export function NewsContent() {
  const posts = [
    'รวมโมเมนต์ดี ๆ กับชุมชนคนรักกาแฟ',
    'เปิดตัวเมนูใหม่ เอสเพรสโซ่ซิกเนเจอร์',
    'ส่งต่ออนาคตที่ดีให้กับชุมชนกาแฟไทย',
  ];
  return (
    <>
      <InnerHero
        title="เรื่องราวจาก SUPER BLACK COFFEE"
        text="ข่าวสาร โปรโมชัน และเรื่องราวที่เราอยากแบ่งปัน"
        image="/coffee/coffee-cup-gallery.png"
        dark
      />
      <Box
        component="section"
        sx={[websiteSx['sb-news'], websiteSx['sb-container']]}
        className="sb-news sb-container"
      >
        <SectionHeading>เรื่องราวล่าสุด</SectionHeading>
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
            <h3>{title}</h3>
            <p>ติดตามเรื่องราวและกิจกรรมล่าสุดจาก SUPER BLACK COFFEE</p>
          </Box>
        ))}
      </Box>
    </>
  );
}

export function ContactContent() {
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
        title="เริ่มต้นบทสนทนากับเรา"
        text="ไม่ว่าจะเป็นเรื่องสาขา แฟรนไชส์ หรือความร่วมมือ เรายินดีรับฟัง"
        image="/coffee/coffee-storefront.png"
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
          <Box
            component="span"
            sx={[websiteSx['sb-rule']]}
            className="sb-rule"
          />
          <h2>ติดต่อเรา</h2>
          <p>ทีมงานพร้อมรับฟังทุกคำถามและความสนใจของคุณ</p>
          <dl>
            <div>
              <dt>LINE</dt>
              <dd>@superblackcoffee</dd>
            </div>
            <div>
              <dt>โทรศัพท์</dt>
              <dd>
                <a href="tel:+6629707552">02-970-7552</a>
              </dd>
            </div>
            <div>
              <dt>อีเมล</dt>
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
          <h3>ส่งข้อความถึงเรา</h3>
          <Box
            component="div"
            sx={[websiteSx['sb-form-grid']]}
            className="sb-form-grid"
          >
            <label>
              ชื่อ <span>*</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              เบอร์โทรศัพท์ <span>*</span>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label>
              อีเมล <span>*</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              สนใจเรื่อง
              <select
                required
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              >
                <option value="">เลือกหัวข้อ</option>
                <option value="franchise">แฟรนไชส์</option>
                <option value="branch">สาขาและบริการ</option>
                <option value="other">เรื่องอื่น ๆ</option>
              </select>
            </label>
            <Box
              component="label"
              sx={[websiteSx['sb-form-wide']]}
              className="sb-form-wide"
            >
              ข้อความ <span>*</span>
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
            sx={[websiteSx['sb-button'], websiteSx['sb-button-dark']]}
            disabled={state === 'sending'}
            className="sb-button sb-button-dark"
          >
            {state === 'sending' ? 'กำลังส่ง...' : 'ส่งข้อความ'} <Arrow />
          </Box>
          {state === 'success' && (
            <Box
              component="p"
              sx={[websiteSx['sb-form-message']]}
              role="status"
              className="sb-form-message"
            >
              ส่งข้อความแล้ว ทีมงานจะติดต่อกลับโดยเร็วที่สุด
            </Box>
          )}
          {state === 'error' && (
            <Box
              component="p"
              sx={[websiteSx['sb-form-message']]}
              role="alert"
              className="sb-form-message"
            >
              ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
}
