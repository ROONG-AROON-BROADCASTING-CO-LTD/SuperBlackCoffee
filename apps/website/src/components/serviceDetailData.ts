export type ServiceDetail = {
  slug: string;
  navigationTitle: string;
  title: string;
  summary: string;
  image: string;
  imagePosition?: string;
  introductionTitle: string;
  introduction: string;
  points: Array<{ title: string; description: string }>;
  detailTitle: string;
  detailSummary: string;
  details: Array<{ title: string; description: string }>;
  journeyTitle: string;
  journeySummary: string;
  journey: Array<{ title: string; description: string }>;
  closingTitle: string;
  closingDescription: string;
  actionLabel: string;
  actionHref: string;
};

export const serviceDetails: ServiceDetail[] = [
  {
    slug: 'premium-coffee',
    navigationTitle: 'Premium Coffee',
    title: 'กาแฟพรีเมียม\nในทุกจังหวะ',
    summary:
      'กาแฟที่คัดสรรด้วยความตั้งใจ เพื่อให้ทุกแก้วเป็นช่วงเวลาที่ดีของคุณ',
    image: '/services/superblackcoffee-service-coffee.png',
    introductionTitle: 'ความตั้งใจที่สัมผัสได้ในทุกแก้ว',
    introduction:
      'ตั้งแต่การเลือกเมล็ด การสกัด ไปจนถึงการเสิร์ฟ เราใส่ใจในรายละเอียดเล็ก ๆ เพื่อให้กาแฟแก้วโปรดของคุณดื่มง่ายและน่าจดจำเสมอ',
    points: [
      {
        title: 'เลือกสรรอย่างตั้งใจ',
        description: 'เริ่มจากวัตถุดิบที่เราอยากเสิร์ฟให้คุณจริง ๆ',
      },
      {
        title: 'รสชาติที่ชัดเจน',
        description: 'พัฒนารสชาติให้ดื่มได้ดีในทุกช่วงเวลาของวัน',
      },
      {
        title: 'ทำสดทุกแก้ว',
        description: 'ดูแลทุกขั้นตอน เพื่อส่งมอบช่วงเวลาที่ดีตรงหน้า',
      },
    ],
    detailTitle: 'ทุกแก้วมีพื้นที่ให้เลือกในแบบของคุณ',
    detailSummary:
      'ไม่ว่าจะเป็นช่วงเช้าที่เร่งรีบ เวลาพักระหว่างวัน หรือบทสนทนายาว ๆ เราอยากให้การเลือกเครื่องดื่มเป็นเรื่องง่ายและน่ารื่นรมย์',
    details: [
      {
        title: 'กาแฟในแบบที่คุณชอบ',
        description:
          'เลือกความเข้มและอุณหภูมิที่เข้ากับจังหวะของวัน แล้วให้บาริสต้าดูแลแก้วตรงหน้าอย่างตั้งใจ',
      },
      {
        title: 'มากกว่าเมนูกาแฟ',
        description:
          'มีเครื่องดื่มหลากหลายให้เลือกสำหรับวันที่อยากเปลี่ยนรสชาติ หรืออยากแบ่งปันเวลาพักกับคนข้าง ๆ',
      },
      {
        title: 'พื้นที่ที่ชวนให้ใช้เวลา',
        description:
          'นั่งพัก ทำงาน หรือพบปะกันได้อย่างสบาย ๆ พร้อมแก้วโปรดที่ทำให้ช่วงเวลาธรรมดาดีขึ้น',
      },
    ],
    journeyTitle: 'จากการเลือกเมนู สู่ช่วงเวลาที่ดีของคุณ',
    journeySummary:
      'เราออกแบบประสบการณ์ให้เรียบง่าย ตั้งแต่เดินเข้าร้านจนถึงแก้วสุดท้ายที่วางอยู่ตรงหน้า',
    journey: [
      {
        title: 'เลือกแก้วที่ใช่',
        description: 'เริ่มจากเมนูและรสชาติที่เข้ากับวันของคุณ',
      },
      {
        title: 'รังสรรค์สดตรงหน้า',
        description: 'บาริสต้าดูแลรายละเอียดของแต่ละแก้วอย่างพอดี',
      },
      {
        title: 'พัก แล้วค่อยไปต่อ',
        description: 'ใช้เวลาของคุณในพื้นที่ที่พร้อมให้ทุกจังหวะของวัน',
      },
    ],
    closingTitle: 'แก้วที่ดี เริ่มจากสิ่งที่เราอยากเสิร์ฟให้คุณจริง ๆ',
    closingDescription:
      'สำรวจเครื่องดื่มที่คัดสรรไว้ แล้วพบกับแก้วโปรดแก้วถัดไปของคุณที่ Super Black Coffee',
    actionLabel: 'ดูเมนูของเรา',
    actionHref: '/menu',
  },
  {
    slug: 'ev-charging',
    navigationTitle: 'EV Charging',
    title: 'เติมพลังให้รถ\nและตัวคุณ',
    summary:
      'จุดพักระหว่างทางที่ให้คุณชาร์จรถ ดื่มกาแฟ และพร้อมไปต่ออย่างสบายใจ',
    image: '/services/superblackcoffee-service-ev-charging.png',
    introductionTitle: 'พักระหว่างทางให้เป็นช่วงเวลาที่ดี',
    introduction:
      'เราอยากให้ทุกจุดแวะพักช่วยให้การเดินทางเบาขึ้น จึงรวมพื้นที่กาแฟและการชาร์จพลังไว้ในจังหวะเดียวกัน',
    points: [
      {
        title: 'แวะพักได้อย่างสบายใจ',
        description: 'ใช้เวลาระหว่างรอในพื้นที่ที่พร้อมให้คุณพักผ่อน',
      },
      {
        title: 'กาแฟคู่การเดินทาง',
        description: 'เลือกเครื่องดื่มแก้วโปรด แล้วค่อยออกเดินทางต่อ',
      },
      {
        title: 'พร้อมไปต่อทุกเส้นทาง',
        description: 'เติมจังหวะดี ๆ ก่อนกลับสู่ทุกแผนของวัน',
      },
    ],
    detailTitle: 'เวลารอที่กลายเป็นเวลาของคุณ',
    detailSummary:
      'เราอยากให้การชาร์จรถไม่ใช่แค่ช่วงเวลาที่ต้องรอ แต่เป็นโอกาสเล็ก ๆ ให้คุณได้พัก เติมพลัง และจัดระเบียบวันของตัวเอง',
    details: [
      {
        title: 'จุดพักที่ดูแลง่าย',
        description:
          'แวะจอดรถ ใช้เวลาระหว่างรอในบรรยากาศสบาย ๆ แล้วค่อยกลับสู่เส้นทางของคุณอย่างไม่เร่งรีบ',
      },
      {
        title: 'กาแฟและพื้นที่ในจังหวะเดียวกัน',
        description:
          'เลือกเครื่องดื่ม พักสายตา หรือนัดพบคนสำคัญได้ โดยไม่ต้องแยกการเดินทางออกเป็นหลายจุด',
      },
      {
        title: 'วางแผนเดินทางได้มั่นใจขึ้น',
        description:
          'ค้นหาสาขาก่อนออกเดินทาง เพื่อเลือกจุดพักที่เข้ากับเส้นทางและเวลาของคุณ',
      },
    ],
    journeyTitle: 'แวะพักอย่างง่าย แล้วพร้อมออกเดินทางต่อ',
    journeySummary:
      'รายละเอียดของอุปกรณ์และบริการอาจแตกต่างกันในแต่ละสาขา จึงแนะนำให้ตรวจสอบสาขาที่คุณต้องการแวะก่อนเดินทาง',
    journey: [
      {
        title: 'เลือกสาขาบนเส้นทาง',
        description: 'ค้นหาจุดแวะพักที่ใกล้คุณและเหมาะกับแผนเดินทาง',
      },
      {
        title: 'ชาร์จรถในเวลาที่พอดี',
        description: 'จัดการเวลาระหว่างรอในพื้นที่กาแฟที่พร้อมให้พัก',
      },
      {
        title: 'เติมพลังให้ตัวเอง',
        description: 'รับกาแฟแก้วโปรด แล้วออกเดินทางต่ออย่างสบายใจ',
      },
    ],
    closingTitle: 'ให้ทุกจุดแวะพัก ช่วยให้การเดินทางเบาขึ้น',
    closingDescription:
      'ค้นหาสาขา Super Black Coffee ที่ใกล้คุณ เพื่อวางแผนพัก เติมพลัง และไปต่อในจังหวะของตัวเอง',
    actionLabel: 'ค้นหาสาขาใกล้คุณ',
    actionHref: '/branches',
  },
  {
    slug: 'bpost65-express',
    navigationTitle: 'BPOST65 Express',
    title: 'ส่งต่อทุกเรื่องสำคัญ\nได้ง่ายขึ้น',
    summary:
      'บริการรับส่งพัสดุที่ช่วยให้ทุกการแวะร้าน เติมความสะดวกให้ชีวิตและการเดินทาง',
    image: '/services/superblackcoffee-service-bpost65-express.png',
    introductionTitle: 'ความสะดวกที่รวมอยู่ในจุดพักเดียว',
    introduction:
      'เมื่อคุณแวะพักดื่มกาแฟ ก็สามารถจัดการเรื่องพัสดุที่สำคัญได้ในคราวเดียว เพื่อให้วันของคุณเดินต่ออย่างลื่นไหล',
    points: [
      {
        title: 'แวะครั้งเดียว ได้หลายเรื่อง',
        description: 'เติมกาแฟ เติมพลัง และจัดการธุระในจังหวะเดียวกัน',
      },
      {
        title: 'ออกแบบให้เข้าใจง่าย',
        description: 'บริการที่ช่วยให้ทุกขั้นตอนตรงไปตรงมา',
      },
      {
        title: 'อยู่กับทุกการเดินทาง',
        description: 'ส่งต่อสิ่งสำคัญ ก่อนคุณออกไปยังจุดหมายถัดไป',
      },
    ],
    detailTitle: 'เรื่องสำคัญของวัน จัดการได้ระหว่างแวะพัก',
    detailSummary:
      'เมื่อการส่งพัสดุอยู่ใกล้กับกาแฟแก้วโปรดและพื้นที่พักระหว่างทาง เรื่องที่ต้องทำก็กลายเป็นส่วนหนึ่งของวันได้อย่างลื่นไหล',
    details: [
      {
        title: 'รวมหลายธุระไว้ในจุดเดียว',
        description:
          'แวะรับกาแฟ จัดการพัสดุ และใช้เวลาพักสั้น ๆ ได้ในจุดแวะเดียวก่อนกลับไปทำสิ่งที่สำคัญต่อ',
      },
      {
        title: 'เตรียมตัวได้อย่างมั่นใจ',
        description:
          'เตรียมข้อมูลผู้ส่งและผู้รับให้พร้อม แล้วสอบถามทีมหน้าร้านสำหรับขั้นตอนการใช้บริการที่สาขา',
      },
      {
        title: 'สะดวกกับทุกจังหวะของวัน',
        description:
          'ไม่ว่าจะเป็นวันทำงาน วันที่เดินทาง หรือวันที่มีหลายเรื่องให้จัดการ เราอยากช่วยให้คุณไปต่อได้ง่ายขึ้น',
      },
    ],
    journeyTitle: 'เตรียมให้พร้อม แล้วส่งต่ออย่างสบายใจ',
    journeySummary:
      'เงื่อนไขและความพร้อมให้บริการอาจต่างกันตามสาขาและผู้ให้บริการ โปรดตรวจสอบกับสาขาก่อนใช้บริการ',
    journey: [
      {
        title: 'เลือกสาขาที่สะดวก',
        description: 'ค้นหาจุดแวะที่เข้ากับเส้นทางและเวลาของคุณ',
      },
      {
        title: 'เตรียมข้อมูลพัสดุ',
        description: 'จัดเตรียมข้อมูลที่จำเป็นให้ครบก่อนเข้ารับบริการ',
      },
      {
        title: 'แวะพัก แล้วส่งต่อ',
        description: 'จัดการเรื่องพัสดุพร้อมเติมพลังด้วยกาแฟแก้วโปรด',
      },
    ],
    closingTitle: 'เพราะเรื่องสำคัญ ไม่ควรทำให้วันของคุณสะดุด',
    closingDescription:
      'ค้นหาสาขาใกล้คุณและสอบถามความพร้อมของบริการก่อนแวะ เพื่อให้ทุกธุระจบได้ในจังหวะเดียว',
    actionLabel: 'ค้นหาสาขาใกล้คุณ',
    actionHref: '/branches',
  },
  {
    slug: 'franchise',
    navigationTitle: 'Franchise',
    title: 'ธุรกิจที่เติบโต\nไปด้วยกัน',
    summary:
      'ร่วมสร้างพื้นที่กาแฟที่ดี และเติบโตกับแบรนด์ที่ให้ความสำคัญกับทุกคนในเส้นทาง',
    image: '/franchise/superblackcoffee-franchise-m.png',
    introductionTitle: 'เริ่มต้นบนพื้นฐานที่ชัดเจน',
    introduction:
      'เราเชื่อว่าการเติบโตที่ดีเกิดจากความเข้าใจร่วมกัน จึงพร้อมพูดคุยและวางเส้นทางที่เหมาะกับผู้ประกอบการแต่ละคน',
    points: [
      {
        title: 'แบรนด์ที่มีจุดยืน',
        description: 'กาแฟ พลังงานสะอาด และพื้นที่สำหรับทุกการเดินทาง',
      },
      {
        title: 'วางแผนไปด้วยกัน',
        description: 'เริ่มจากการทำความเข้าใจเป้าหมายและทำเลของคุณ',
      },
      {
        title: 'เติบโตอย่างมีความหมาย',
        description: 'สร้างธุรกิจที่ดูแลลูกค้า ทีมงาน และชุมชนไปพร้อมกัน',
      },
    ],
    detailTitle: 'เริ่มจากความเข้าใจ แล้วค่อยวางแผนไปด้วยกัน',
    detailSummary:
      'ทุกทำเลและเป้าหมายมีบริบทของตัวเอง เราจึงเริ่มจากการฟังสิ่งที่คุณต้องการ ก่อนร่วมกันมองหาทิศทางที่เหมาะกับธุรกิจ',
    details: [
      {
        title: 'คุยเรื่องเป้าหมายให้ชัด',
        description:
          'เริ่มจากภาพธุรกิจที่คุณอยากสร้าง เพื่อเลือกแนวทางที่เข้ากับพื้นที่ ทีม และความตั้งใจของคุณ',
      },
      {
        title: 'มองทำเลในภาพเดียวกัน',
        description:
          'ร่วมพิจารณาบริบทของพื้นที่และประสบการณ์ที่อยากส่งมอบให้ลูกค้าในแต่ละจุด',
      },
      {
        title: 'เตรียมตัวอย่างเป็นขั้นตอน',
        description:
          'จัดลำดับการเตรียมร้าน การทำงาน และการเปิดตัว เพื่อให้ทุกฝ่ายเห็นจังหวะการเติบโตเดียวกัน',
      },
    ],
    journeyTitle: 'เส้นทางที่เริ่มจากการพูดคุย',
    journeySummary:
      'ทีมแฟรนไชส์พร้อมช่วยให้คุณเห็นภาพการเริ่มต้นชัดขึ้น ตั้งแต่ข้อมูลเบื้องต้นจนถึงการเตรียมความพร้อมก่อนเปิดร้าน',
    journey: [
      {
        title: 'ส่งข้อมูลเบื้องต้น',
        description: 'บอกเราเกี่ยวกับเป้าหมาย ทำเล และสิ่งที่คุณสนใจ',
      },
      {
        title: 'นัดพูดคุยและประเมิน',
        description: 'ร่วมกันทำความเข้าใจโอกาสและความเหมาะสมของพื้นที่',
      },
      {
        title: 'วางแผนเพื่อเริ่มต้น',
        description: 'เตรียมขั้นตอนต่อไปในจังหวะที่ชัดเจนสำหรับทุกฝ่าย',
      },
    ],
    closingTitle: 'เริ่มคุยวันนี้ เพื่อเห็นภาพธุรกิจของคุณชัดขึ้น',
    closingDescription:
      'กรอกข้อมูลเบื้องต้น แล้วให้ทีมแฟรนไชส์ติดต่อกลับเพื่อเริ่มต้นบทสนทนาที่เหมาะกับคุณ',
    actionLabel: 'เริ่มคุยกับทีมแฟรนไชส์',
    actionHref: '/franchise#apply',
  },
  {
    slug: 'superblack-control',
    navigationTitle: 'SuperBlack Control',
    title: 'ทุกภาพของธุรกิจ\nอยู่ในมือคุณ',
    summary:
      'ระบบที่ช่วยให้การดูแลร้านค้าและแฟรนไชส์เป็นเรื่องที่เห็นภาพและจัดการต่อได้ง่ายขึ้น',
    image: '/services/superblackcoffee-service-control.png',
    imagePosition: 'center top',
    introductionTitle: 'ข้อมูลที่พร้อมใช้ เพื่อทีมที่พร้อมไปต่อ',
    introduction:
      'การบริหารที่ดีเริ่มจากการเห็นภาพเดียวกัน SuperBlack Control ช่วยให้การติดตามงานและการประสานงานของธุรกิจเป็นระเบียบมากขึ้น',
    points: [
      {
        title: 'เห็นภาพการทำงานชัดขึ้น',
        description: 'รวมเรื่องสำคัญของร้านไว้ให้ติดตามได้ง่าย',
      },
      {
        title: 'ทำงานร่วมกันลื่นไหล',
        description: 'ช่วยให้ทีมและผู้ประกอบการสื่อสารในจังหวะเดียวกัน',
      },
      {
        title: 'พร้อมใช้กับการเติบโต',
        description: 'วางรากฐานการจัดการที่ขยายไปพร้อมกับธุรกิจ',
      },
    ],
    detailTitle: 'เห็นภาพเดียวกัน เพื่อขับเคลื่อนธุรกิจได้ชัดขึ้น',
    detailSummary:
      'เมื่อข้อมูลสำคัญอยู่ในมุมมองที่เข้าใจง่าย ทีมหน้าร้านและผู้ประกอบการก็ใช้เวลาไปกับการตัดสินใจและดูแลลูกค้าได้มากขึ้น',
    details: [
      {
        title: 'ติดตามสิ่งสำคัญได้เป็นระบบ',
        description:
          'รวบรวมข้อมูลการดำเนินงานที่จำเป็น เพื่อช่วยให้เห็นภาพรวมและจุดที่ควรติดตามต่อได้ชัดขึ้น',
      },
      {
        title: 'เชื่อมจังหวะการทำงานของทีม',
        description:
          'สื่อสารและติดตามงานจากข้อมูลชุดเดียวกัน ลดช่องว่างระหว่างสิ่งที่เกิดขึ้นในร้านกับการวางแผนของทีม',
      },
      {
        title: 'ใช้ข้อมูลเพื่อวางแผนวันถัดไป',
        description:
          'มองแนวโน้มของงานและเตรียมการต่อได้อย่างเป็นขั้นตอน เมื่อธุรกิจขยายไปสู่หลายสาขา',
      },
    ],
    journeyTitle: 'จากข้อมูลที่มองเห็น สู่การตัดสินใจที่เดินหน้า',
    journeySummary:
      'SuperBlack Control ถูกออกแบบให้ช่วยทีมเชื่อมข้อมูลสำคัญกับการทำงานประจำวัน โดยปรับใช้ตามบทบาทและการเติบโตของธุรกิจ',
    journey: [
      {
        title: 'เห็นภาพรวมที่จำเป็น',
        description: 'เริ่มจากข้อมูลที่ช่วยให้ติดตามการดำเนินงานได้ง่าย',
      },
      {
        title: 'ระบุเรื่องที่ต้องดูแล',
        description: 'ใช้ภาพรวมเดียวกันเพื่อจัดลำดับสิ่งที่ทีมต้องทำต่อ',
      },
      {
        title: 'ประสานงานและพัฒนา',
        description: 'เปลี่ยนสิ่งที่เห็นให้เป็นการทำงานที่ต่อเนื่องมากขึ้น',
      },
    ],
    closingTitle: 'ระบบที่ช่วยให้ทีมมองไปในทิศทางเดียวกัน',
    closingDescription:
      'สอบถามทีมแฟรนไชส์เพื่อเรียนรู้เพิ่มเติมว่า SuperBlack Control สนับสนุนการบริหารธุรกิจของคุณได้อย่างไร',
    actionLabel: 'สอบถามทีมแฟรนไชส์',
    actionHref: '/franchise#apply',
  },
];

export function getServiceDetail(slug: string) {
  return serviceDetails.find((service) => service.slug === slug);
}

type ServiceDetailTranslation = Partial<
  Omit<
    ServiceDetail,
    'slug' | 'navigationTitle' | 'image' | 'imagePosition' | 'actionHref'
  >
>;

export const englishServiceDetails: Record<string, ServiceDetailTranslation> = {
  'premium-coffee': {
    title: 'Premium coffee\nin every moment',
    summary:
      'Thoughtfully selected coffee, so every cup becomes a better moment in your day.',
    introductionTitle: 'Care you can taste in every cup',
    introduction:
      'From selecting beans and extracting espresso to serving the finished drink, we pay attention to the details that make your favourite cup easy to enjoy and memorable.',
    points: [
      {
        title: 'Chosen with intention',
        description: 'We start with ingredients we are proud to serve.',
      },
      {
        title: 'Clear, balanced flavour',
        description:
          'Flavours developed to drink well at every point in the day.',
      },
      {
        title: 'Made fresh to order',
        description: 'Every step is cared for before your cup reaches you.',
      },
    ],
    detailTitle: 'A cup that fits your day',
    detailSummary:
      'For a fast morning, a mid-day break, or a long conversation, we make choosing a drink simple and enjoyable.',
    details: [
      {
        title: 'Coffee your way',
        description:
          'Choose the intensity and temperature that fit your day, and let our baristas care for the details.',
      },
      {
        title: 'More than coffee',
        description:
          'A varied drinks menu for the days you want a different flavour or a break with someone beside you.',
      },
      {
        title: 'A space worth staying in',
        description:
          'Sit, work, or meet in comfort with a favourite cup that lifts an ordinary moment.',
      },
    ],
    journeyTitle: 'From choosing a drink to enjoying a good moment',
    journeySummary:
      'We keep the experience simple from the moment you enter until the final sip in front of you.',
    journey: [
      {
        title: 'Choose your cup',
        description: 'Start with a menu and flavour that fit your day.',
      },
      {
        title: 'Made fresh for you',
        description: 'Our baristas balance the details of every cup.',
      },
      {
        title: 'Pause, then continue',
        description:
          'Take your time in a space made for every moment of the day.',
      },
    ],
    closingTitle: 'A great cup begins with what we genuinely want to serve you',
    closingDescription:
      'Explore our carefully selected drinks and discover your next favourite cup at Super Black Coffee.',
    actionLabel: 'View our menu',
  },
  'ev-charging': {
    title: 'Recharge your car\nand yourself',
    summary:
      'A stop along the road where you can charge your car, enjoy coffee, and continue with ease.',
    introductionTitle: 'Make a stop along the road a good moment',
    introduction:
      'We bring coffee and charging together so every stop can make your journey feel lighter.',
    points: [
      {
        title: 'Stop with ease',
        description: 'Spend the waiting time in a space made for rest.',
      },
      {
        title: 'Coffee for the journey',
        description: 'Choose a favourite drink before setting off again.',
      },
      {
        title: 'Ready for every route',
        description: 'Recharge before returning to the rest of your day.',
      },
    ],
    detailTitle: 'Waiting time that becomes your time',
    detailSummary:
      'Charging should not only be time you have to wait. It can be a small opportunity to rest, recharge, and reset your day.',
    details: [
      {
        title: 'An easy stop',
        description:
          'Park, spend time in a comfortable setting, and return to your route without rushing.',
      },
      {
        title: 'Coffee and space together',
        description:
          'Choose a drink, rest your eyes, or meet someone without splitting your journey between several stops.',
      },
      {
        title: 'Plan with more confidence',
        description:
          'Find a branch before leaving to choose a stop that matches your route and schedule.',
      },
    ],
    journeyTitle: 'Stop simply, then be ready to go on',
    journeySummary:
      'Equipment and services can vary by branch, so please check your intended branch before travelling.',
    journey: [
      {
        title: 'Choose a branch on your route',
        description: 'Find a nearby stop that suits your travel plan.',
      },
      {
        title: 'Charge at the right time',
        description: 'Use your waiting time in a coffee space made for rest.',
      },
      {
        title: 'Recharge yourself',
        description:
          'Pick up your favourite coffee and continue with confidence.',
      },
    ],
    closingTitle: 'Let every stop make the journey feel lighter',
    closingDescription:
      'Find a Super Black Coffee branch near you to plan a pause, recharge, and continue at your own pace.',
    actionLabel: 'Find a branch near you',
  },
  'bpost65-express': {
    title: 'Send important things\nmore easily',
    summary:
      'A parcel service that makes every café stop more convenient for daily life and travel.',
    introductionTitle: 'Convenience in one stop',
    introduction:
      'When you stop for coffee, you can also take care of an important parcel, so your day keeps moving smoothly.',
    points: [
      {
        title: 'One stop, more done',
        description: 'Coffee, a recharge, and an errand in the same moment.',
      },
      {
        title: 'Made easy to understand',
        description: 'A service designed to keep every step straightforward.',
      },
      {
        title: 'Part of every journey',
        description: 'Send something important before your next destination.',
      },
    ],
    detailTitle: 'Take care of important errands while you pause',
    detailSummary:
      'When parcel sending is near your favourite coffee and a place to rest, an errand becomes a seamless part of the day.',
    details: [
      {
        title: 'Bring errands together',
        description:
          'Collect coffee, manage a parcel, and take a short break in one stop before continuing your day.',
      },
      {
        title: 'Prepare with confidence',
        description:
          'Have sender and recipient details ready, then ask the branch team about the service process.',
      },
      {
        title: 'Useful in every kind of day',
        description:
          'On workdays, travel days, and busy days, we want to make it easier to keep going.',
      },
    ],
    journeyTitle: 'Prepare, then send with ease',
    journeySummary:
      'Terms and availability vary by branch and service provider. Please check with the branch before using the service.',
    journey: [
      {
        title: 'Choose a convenient branch',
        description: 'Find a stop that suits your route and timing.',
      },
      {
        title: 'Prepare parcel details',
        description: 'Bring the required information before arriving.',
      },
      {
        title: 'Pause, then send on',
        description:
          'Take care of the parcel while recharging with a favourite coffee.',
      },
    ],
    closingTitle: 'Important things should not interrupt your day',
    closingDescription:
      'Find a nearby branch and ask about service availability before you visit, so every errand can be handled in one stop.',
    actionLabel: 'Find a branch near you',
  },
  franchise: {
    title: 'A business that grows\nwith you',
    summary:
      'Build a great coffee space and grow with a brand that values everyone on the journey.',
    introductionTitle: 'Start from a clear foundation',
    introduction:
      'We believe sustainable growth begins with shared understanding, so we are ready to discuss and plan a route that fits each entrepreneur.',
    points: [
      {
        title: 'A brand with a point of view',
        description: 'Coffee, clean energy, and spaces for every journey.',
      },
      {
        title: 'Plan together',
        description: 'Start by understanding your goals and location.',
      },
      {
        title: 'Grow with purpose',
        description:
          'Build a business that cares for customers, teams, and communities.',
      },
    ],
    detailTitle: 'A model shaped around your opportunity',
    detailSummary:
      'We work from the realities of your site and goals, matching a practical model with the services that help the business grow.',
    details: [
      {
        title: 'A clear starting point',
        description:
          'Discuss your location, customer needs, and ambitions with our franchise team.',
      },
      {
        title: 'A complete support system',
        description:
          'Build on operations, brand direction, training, and services that have been developed in real cafés.',
      },
      {
        title: 'Room to grow',
        description:
          'Choose a format that can develop along with your business and your community.',
      },
    ],
    journeyTitle: 'A clear path from first conversation to opening day',
    journeySummary:
      'Our team supports every stage, so the plan reflects both the opportunity in your location and the Super Black Coffee experience.',
    journey: [
      {
        title: 'Share your idea',
        description: 'Tell us about your site and what you want to build.',
      },
      {
        title: 'Assess the opportunity',
        description:
          'Review the location and choose a suitable franchise format.',
      },
      {
        title: 'Prepare to open',
        description:
          'Move forward with the team, training, and an opening plan.',
      },
    ],
    closingTitle: 'Let us build the next step together',
    closingDescription:
      'Talk to our franchise team to find the format and support that fit your opportunity.',
    actionLabel: 'Talk to our franchise team',
  },
  'superblack-control': {
    title: 'Your business,\nclearly in hand',
    summary:
      'A system that makes store and franchise operations easier to see, understand, and manage.',
    introductionTitle: 'Ready information for a team ready to move',
    introduction:
      'Strong operations begin with a shared view. SuperBlack Control helps businesses follow work and coordinate with more order.',
    points: [
      {
        title: 'See operations clearly',
        description: 'Keep important store information easy to follow.',
      },
      {
        title: 'Work together smoothly',
        description: 'Help teams and operators communicate in the same rhythm.',
      },
      {
        title: 'Ready for growth',
        description:
          'Build a management foundation that scales with the business.',
      },
    ],
    detailTitle: 'One clear view to move the business forward',
    detailSummary:
      'When important information is easy to understand, store teams and operators can spend more time deciding and caring for customers.',
    details: [
      {
        title: 'Follow key work systematically',
        description:
          'Bring together essential operating information to make the big picture and next priorities clearer.',
      },
      {
        title: 'Connect the team’s rhythm',
        description:
          'Communicate and follow work from the same source of information, narrowing the gap between the store and planning.',
      },
      {
        title: 'Use information to plan ahead',
        description:
          'See operating patterns and prepare step by step as the business expands to more branches.',
      },
    ],
    journeyTitle: 'From visible information to decisions that move forward',
    journeySummary:
      'SuperBlack Control is designed to connect important information with daily work, adapting to roles and business growth.',
    journey: [
      {
        title: 'See the essential overview',
        description:
          'Start with information that makes operations easier to follow.',
      },
      {
        title: 'Identify what needs care',
        description: 'Use a shared view to prioritise the team’s next actions.',
      },
      {
        title: 'Coordinate and improve',
        description: 'Turn what you see into more continuous, effective work.',
      },
    ],
    closingTitle: 'A system that keeps the team moving in one direction',
    closingDescription:
      'Ask the franchise team how SuperBlack Control can support your business operations.',
    actionLabel: 'Ask our franchise team',
  },
};
