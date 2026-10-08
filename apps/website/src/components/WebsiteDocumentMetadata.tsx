'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { englishServiceDetails, getServiceDetail } from './serviceDetailData';
import { useWebsiteLanguage } from './WebsiteLanguageProvider';

type DocumentCopy = {
  title: string;
  description: string;
  home?: boolean;
};

const pages: Record<string, { th: DocumentCopy; en: DocumentCopy }> = {
  '/': {
    th: {
      title: 'กาแฟดีในทุกจังหวะของคุณ',
      description:
        'กาแฟไทย พลังงานสะอาด และพื้นที่ที่ออกแบบมาเพื่อทุกการเดินทางของคุณ',
      home: true,
    },
    en: {
      title: 'Thai coffee, clean energy, every journey',
      description:
        'Thai coffee, clean energy, and spaces designed for every journey.',
      home: true,
    },
  },
  '/about': {
    th: {
      title: 'เกี่ยวกับเรา',
      description: 'เรื่องราวและแนวคิดของ Super Black Coffee',
    },
    en: {
      title: 'About us',
      description: 'The story and ideas behind Super Black Coffee.',
    },
  },
  '/menu': {
    th: {
      title: 'เมนูกาแฟและเครื่องดื่ม',
      description: 'สำรวจเมนูกาแฟและเครื่องดื่มของ Super Black Coffee',
    },
    en: {
      title: 'Coffee & drinks',
      description: 'Explore the coffee and drinks menu at Super Black Coffee.',
    },
  },
  '/branches': {
    th: { title: 'สาขา', description: 'ค้นหาสาขา Super Black Coffee ใกล้คุณ' },
    en: {
      title: 'Branches',
      description: 'Find a Super Black Coffee branch near you.',
    },
  },
  '/franchise': {
    th: {
      title: 'แฟรนไชส์',
      description: 'เติบโตไปด้วยกันกับแฟรนไชส์ Super Black Coffee',
    },
    en: {
      title: 'Franchise',
      description: 'Grow with the Super Black Coffee franchise.',
    },
  },
  '/services': {
    th: {
      title: 'บริการของเรา',
      description: 'บริการของ Super Black Coffee สำหรับทุกการเดินทาง',
    },
    en: {
      title: 'Our services',
      description: 'Super Black Coffee services for every journey.',
    },
  },
  '/news': {
    th: {
      title: 'ข่าวสารและเรื่องราว',
      description: 'ข่าวสาร โปรโมชั่น และเรื่องราวจาก Super Black Coffee',
    },
    en: {
      title: 'News & stories',
      description: 'News, promotions, and stories from Super Black Coffee.',
    },
  },
  '/contact': {
    th: { title: 'ติดต่อเรา', description: 'ติดต่อทีมงาน Super Black Coffee' },
    en: {
      title: 'Contact us',
      description: 'Contact the Super Black Coffee team.',
    },
  },
  '/privacy': {
    th: {
      title: 'นโยบายความเป็นส่วนตัว',
      description: 'นโยบายความเป็นส่วนตัวของ Super Black Coffee',
    },
    en: {
      title: 'Privacy policy',
      description: 'Super Black Coffee privacy policy.',
    },
  },
  '/terms': {
    th: {
      title: 'ข้อกำหนดการใช้งาน',
      description: 'ข้อกำหนดการใช้งานเว็บไซต์ Super Black Coffee',
    },
    en: {
      title: 'Terms of use',
      description: 'Terms of use for the Super Black Coffee website.',
    },
  },
};

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attribute}="${key}"]`;
  const elements = Array.from(
    document.head.querySelectorAll<HTMLMetaElement>(selector),
  );
  const metaElements = elements.length
    ? elements
    : [document.head.appendChild(document.createElement('meta'))];

  metaElements.forEach((element) => {
    element.setAttribute(attribute, key);
    element.content = content;
  });
}

function getServiceCopy(
  pathname: string,
  isEnglish: boolean,
): DocumentCopy | null {
  const slug = pathname.split('/')[2];
  if (!slug) return null;

  const service = getServiceDetail(slug);
  if (!service) return null;

  const english = englishServiceDetails[slug];
  return isEnglish
    ? {
        title: service.navigationTitle,
        description: english?.summary ?? service.summary,
      }
    : {
        title: service.navigationTitle,
        description: service.summary,
      };
}

export function WebsiteDocumentMetadata() {
  const pathname = usePathname();
  const { isEnglish, language } = useWebsiteLanguage();

  const copy = useMemo(() => {
    const serviceCopy = pathname.startsWith('/services/')
      ? getServiceCopy(pathname, isEnglish)
      : null;

    return serviceCopy ?? pages[pathname]?.[language] ?? pages['/'][language];
  }, [isEnglish, language, pathname]);

  useEffect(() => {
    const applyMetadata = () => {
      const title = copy.home
        ? `Super Black Coffee - ${copy.title}`
        : `${copy.title} - Super Black Coffee`;

      document.title = title;
      setMeta('name', 'description', copy.description);
      setMeta('property', 'og:title', title);
      setMeta('property', 'og:description', copy.description);
      setMeta('property', 'og:locale', isEnglish ? 'en_US' : 'th_TH');
      setMeta('name', 'twitter:title', title);
      setMeta('name', 'twitter:description', copy.description);
    };

    applyMetadata();
    const timeout = window.setTimeout(applyMetadata, 50);
    const observer = new MutationObserver(applyMetadata);
    observer.observe(document.head, { childList: true });

    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, [copy, isEnglish]);

  return null;
}
