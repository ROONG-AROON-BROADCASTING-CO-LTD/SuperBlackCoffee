'use client';

import Box from '@mui/material/Box';
import { websiteSx } from './websiteSx';
import Image from 'next/image';
import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';
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

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  );
}

function Photo({
  src,
  alt,
  className = '',
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <Box
      component="div"
      sx={[
        websiteSx['sb-photo'],
        {
          backgroundImage: `url("${src}")`,
          backgroundPosition: 'center',
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
        style={{ opacity: isLoaded ? 1 : 0 }}
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
  return (
    <>
      <Box
        component="section"
        sx={[websiteSx['sb-home-hero']]}
        className="sb-home-hero"
      >
        <Photo
          src="/hero/superblackcoffee-brand-hero.png?v=20260930"
          alt="ร้าน Super Black Coffee และจุดชาร์จ EV"
          className="sb-home-hero-photo"
          priority
        />
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
            กาแฟไทย
            <br />
            พลังสะอาด
            <br />
            เพื่อทุกการเดินทาง
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
          component="span"
          sx={[websiteSx['sb-hero-side-note']]}
          className="sb-hero-side-note"
        >
          SUPER BLACK COFFEE · EVERY JOURNEY
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
              className="sb-hero-service-card"
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
        sx={[websiteSx['sb-story-strip'], websiteSx['sb-container']]}
        className="sb-story-strip sb-container"
      >
        <Box
          component="div"
          sx={[websiteSx['sb-story-title']]}
          className="sb-story-title"
        >
          <Box
            component="span"
            sx={[websiteSx['sb-rule']]}
            className="sb-rule"
          />
          <h2>
            แรงบันดาลใจจากกาแฟไทย
            <br />
            สู่พื้นที่เพื่อทุกการเดินทาง
          </h2>
        </Box>
        <p>
          Super Black Coffee คือพื้นที่ที่กาแฟคุณภาพ พลังงานสะอาด และการเดินทาง
          มาบรรจบกัน เราเชื่อในศักยภาพของกาแฟไทย และเชื่อว่าการเดินทางที่ดี
          เริ่มต้นจากพลังดี ๆ ในทุกช่วงเวลา
        </p>
        <Photo
          src="/coffee/coffee-cup-gallery.png"
          alt="กาแฟ Super Black Coffee"
        />
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-menu-feature']]}
        className="sb-menu-feature"
      >
        <Photo
          src="/services/superblackcoffee-service-coffee.png"
          alt="เครื่องดื่มกาแฟ Super Black Coffee"
        />
        <Box
          component="div"
          sx={[websiteSx['sb-menu-feature-copy']]}
          className="sb-menu-feature-copy"
        >
          <Box
            component="span"
            sx={[websiteSx['sb-rule']]}
            className="sb-rule"
          />
          <h2>
            มากกว่ากาแฟ
            <br />
            เพื่อไลฟ์สไตล์ของคุณ
          </h2>
          <p>
            สัมผัสกาแฟคุณภาพจากเมล็ดกาแฟไทย คัดสรรอย่างพิถีพิถัน
            พร้อมเมนูที่รังสรรค์ให้ตอบโจทย์ทุกช่วงเวลาของการเดินทาง
          </p>
          <Box
            component={Link}
            sx={[websiteSx['sb-button'], websiteSx['sb-button-gold']]}
            className="sb-button sb-button-gold"
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
          <Photo
            src="/services/superblackcoffee-service-bakery.png"
            alt="เบเกอรี่"
          />
          <Photo src="/coffee/coffee-bean-ingredients.png" alt="เมล็ดกาแฟ" />
        </Box>
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-services-preview'], websiteSx['sb-container']]}
        className="sb-services-preview sb-container"
      >
        <SectionHeading
          text="ทุกพื้นที่ออกแบบให้ตอบโจทย์ทั้งการพักผ่อนและการเดินทาง"
          link="/services"
          linkText="ดูบริการทั้งหมด"
        >
          ครบที่สุดในที่เดียว
          <br />
          ทั้งกาแฟ และพลังงานสะอาด
        </SectionHeading>
        <Box
          component="div"
          sx={[websiteSx['sb-services-grid']]}
          className="sb-services-grid"
        >
          <Link href="/services">
            <Photo src="/coffee/coffee-storefront.png" alt="พื้นที่ร้านกาแฟ" />
            <div>
              <h3>กาแฟคุณภาพ</h3>
              <p>พื้นที่สำหรับคนรักกาแฟในบรรยากาศที่ผ่อนคลาย</p>
              <Arrow />
            </div>
          </Link>
          <Link href="/services">
            <Photo
              src="/services/superblackcoffee-service-ev-charging.png"
              alt="จุดชาร์จ EV"
            />
            <div>
              <h3>EV Charging</h3>
              <p>เติมพลังให้ทุกการเดินทาง ด้วยสถานีชาร์จมาตรฐาน</p>
              <Arrow />
            </div>
          </Link>
        </Box>
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-branch-banner']]}
        className="sb-branch-banner"
      >
        <Photo
          src="/hero/superblackcoffee-brand-hero.png?v=20260930"
          alt="ร้าน Super Black Coffee"
        />
        <div>
          <Box
            component="span"
            sx={[websiteSx['sb-rule']]}
            className="sb-rule"
          />
          <h2>ค้นหาสาขาใกล้คุณ</h2>
          <p>
            พบ Super Black Coffee ในเส้นทางของคุณ ทั้งร้านกาแฟและสถานีชาร์จ EV
          </p>
          <Box
            component={Link}
            sx={[websiteSx['sb-button'], websiteSx['sb-button-outline-light']]}
            className="sb-button sb-button-outline-light"
            href="/branches"
          >
            ดูสาขาทั้งหมด <Arrow />
          </Box>
        </div>
      </Box>
      <Box
        component="section"
        sx={[websiteSx['sb-franchise-preview'], websiteSx['sb-container']]}
        className="sb-franchise-preview sb-container"
      >
        <div>
          <Box
            component="span"
            sx={[websiteSx['sb-rule']]}
            className="sb-rule"
          />
          <h2>
            ร่วมเป็นส่วนหนึ่ง
            <br />
            ของการเติบโตไปด้วยกัน
          </h2>
          <p>
            มาร่วมสร้างประสบการณ์กาแฟไทย ควบคู่กับพลังงานสะอาด
            ไปยังอีกหลายเส้นทางทั่วประเทศ
          </p>
          <Box
            component={Link}
            sx={[websiteSx['sb-button'], websiteSx['sb-button-dark']]}
            className="sb-button sb-button-dark"
            href="/franchise"
          >
            สำรวจแฟรนไชส์ <Arrow />
          </Box>
        </div>
        <Photo
          src="/franchise/superblackcoffee-franchise-m.png"
          alt="รูปแบบแฟรนไชส์ Super Black Coffee"
        />
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
                <a href="tel:021234567">02-123-4567</a>
              </dd>
            </div>
            <div>
              <dt>อีเมล</dt>
              <dd>
                <a href="mailto:hello@superblackcoffee.co.th">
                  hello@superblackcoffee.co.th
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
