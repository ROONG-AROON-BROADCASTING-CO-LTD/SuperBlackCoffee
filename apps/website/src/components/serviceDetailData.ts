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
  reference?: { label: string; href: string };
  details: Array<{ title: string; description: string }>;
  systemScreens?: Array<{
    title: string;
    description: string;
    image: string;
  }>;
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
    introductionTitle: 'กาแฟที่ตั้งใจดูแล ตั้งแต่เมล็ดถึงแก้ว',
    introduction:
      'Super Black Coffee คัดสรรเมล็ดกาแฟคุณภาพ และดูแลการบดกับการสกัดให้เหมาะกับแต่ละเมนู เพื่อให้กาแฟที่เสิร์ฟมีรสชาติชัดเจนและสม่ำเสมอในทุกแก้ว',
    points: [
      {
        title: 'คัดสรรเมล็ดกาแฟคุณภาพ',
        description:
          'เราเลือกเมล็ดกาแฟเพื่อเป็นพื้นฐานของรสชาติที่ดื่มได้ดี ทั้งเมนูกาแฟดำ กาแฟนม และเมนูซิกเนเจอร์',
      },
      {
        title: 'บดและสกัดให้เข้ากับเมนู',
        description:
          'ดูแลสัดส่วนกาแฟ น้ำ และนมให้เหมาะกับเครื่องดื่มแต่ละแบบ เพื่อให้รสชาติของเมนูยังชัดเจน',
      },
      {
        title: 'ชงสดตามออเดอร์',
        description:
          'ทุกแก้วผ่านการเตรียมและเสิร์ฟตามมาตรฐานของร้าน เพื่อให้คุณได้กาแฟแก้วเดิมที่ไว้ใจได้ในทุกครั้ง',
      },
    ],
    detailTitle: 'เมนูกาแฟที่เลือกได้ตามรสชาติที่ชอบ',
    detailSummary:
      'เริ่มจากกาแฟคลาสสิกที่คุ้นเคย ไปจนถึงเมนูกาแฟที่จับคู่กับนม ผลไม้ และวัตถุดิบอื่น เพื่อให้เลือกแก้วที่เข้ากับวันของคุณได้ง่ายขึ้น',
    details: [
      {
        title: 'กาแฟคลาสสิก',
        description:
          'พบกับอเมริกาโน่ เอสเปรสโซ่ มอคค่า คาปูชิโน่ และลาเต้ ทั้งแบบร้อนและเย็น',
      },
      {
        title: 'กาแฟนมและเมนูรสละมุน',
        description:
          'เลือกจากลาเต้ วนิลาลาเต้ คาราเมลมัคคิอาโต้ หรือเมนูที่ผสมกาแฟกับนมในคาแรกเตอร์ที่ต่างกัน',
      },
      {
        title: 'กาแฟผสมผลไม้และเมนูสร้างสรรค์',
        description:
          'ลองอเมริกาโน่มะพร้าว อเมริกาโน่ส้ม อเมริกาโน่น้ำผึ้งมะนาว หรือเมนูซิกเนเจอร์ของ Super Black Coffee',
      },
    ],
    journeyTitle: 'จากเมนูที่เลือก สู่กาแฟแก้วตรงหน้า',
    journeySummary:
      'ทุกแก้วเริ่มจากการเลือกเมนูที่เหมาะกับคุณ แล้วจึงผ่านการเตรียม ชง และเสิร์ฟในขั้นตอนที่เรียบง่าย',
    journey: [
      {
        title: 'เลือกเมนูที่ตรงใจ',
        description:
          'เลือกจากกาแฟดำ กาแฟนม เมนูร้อน เมนูเย็น หรือเมนูที่อยากลองในวันนั้น',
      },
      {
        title: 'ชงตามมาตรฐานของร้าน',
        description:
          'บาริสต้าดูแลการเตรียม ส่วนผสม และการสกัดให้กาแฟแต่ละแก้วพร้อมเสิร์ฟ',
      },
      {
        title: 'รับกาแฟแก้วที่เลือก',
        description:
          'นั่งดื่มที่ร้านหรือรับกลับไป พร้อมกาแฟที่เข้ากับจังหวะของวันคุณ',
      },
    ],
    closingTitle: 'เลือกกาแฟแก้วที่ใช่สำหรับวันนี้',
    closingDescription:
      'สำรวจเมนูกาแฟคลาสสิก กาแฟนม และเมนูสร้างสรรค์ของเรา แล้วเลือกแก้วที่อยากดื่มได้เลย',
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
      'ข้อมูลสเปกด้านล่างอ้างอิงจาก RBC EV Station เพื่อใช้ประกอบการวางแผนโครงการ ส่วนรุ่นและการติดตั้งจริงของแต่ละสาขาต้องยืนยันก่อนใช้บริการ',
    points: [
      {
        title: 'ตัวเลือกเครื่องชาร์จ DC',
        description:
          'RBC ระบุเครื่องชาร์จ DC 2 กลุ่ม: iGreen CSEVC3401E กำลัง 20 / 30 kW และ iGreen CSEVC3108E กำลัง 120 kW สำหรับพื้นที่ที่ต้องการกำลังสูง',
      },
      {
        title: 'ตัวเลือกเครื่องชาร์จ AC',
        description:
          'RBC ระบุ AC 7.4 kW และ 22 kW ใช้หัวต่อ Type 2 และสายชาร์จยาว 5 เมตร โดยมีรุ่นมีจอและไม่มีจอ',
      },
      {
        title: 'ระบบไฟฟ้าต้องออกแบบตามพื้นที่',
        description:
          'กำลังติดตั้งจริง ขนาดหม้อแปลง จุดเชื่อมต่อ และอุปกรณ์ป้องกัน ต้องตรวจสอบจากหน้างานโดยวิศวกรและการไฟฟ้า',
      },
    ],
    detailTitle: 'สเปกเครื่องชาร์จและระบบไฟฟ้า',
    detailSummary:
      'สเปกต่อไปนี้เป็นข้อมูลอ้างอิงจาก RBC EV Station ไม่ใช่การยืนยันรุ่น อุปกรณ์ หรือกำลังที่ติดตั้งจริงในทุกสาขา Super Black Coffee',
    reference: {
      label: 'ดูข้อมูลอ้างอิงจาก RBC EV Station',
      href: 'https://www.rbcevstation.com/investment',
    },
    details: [
      {
        title: 'DC 20 / 30 kW',
        description:
          'แรงดันขาออก 150–1000 V DC, กระแสสูงสุด 100 A, สายชาร์จ 5 เมตร และหน้าจอ LCD 4.3 นิ้ว รับประกัน 2 ปี สำหรับรุ่น 20 และ 30 kW',
      },
      {
        title: 'DC 120 kW',
        description:
          'แรงดันขาออก 150–1000 V DC, กระแส 200 A หรือ 100 A ต่อหัวตามรุ่นย่อย, สายชาร์จ 5 เมตร และหน้าจอ LCD 7 หรือ 4.3 นิ้ว รับประกัน 2 ปี',
      },
      {
        title: 'AC 7.4 / 22 kW',
        description:
          'หัวต่อ Type 2 และสายชาร์จ 5 เมตร รุ่นมีจอใช้ LCD 4.3 นิ้ว โดยการรับประกันอยู่ที่ 3 หรือ 5 ปีตามรุ่น ต้องยืนยันรุ่นย่อยก่อนสั่งซื้อหรือติดตั้ง',
      },
    ],
    journeyTitle: 'วางแผนก่อนแวะชาร์จ',
    journeySummary:
      'เว็บไซต์ยังไม่มีการแสดงสถานะหัวชาร์จแบบเรียลไทม์ และสเปกข้างต้นเป็นข้อมูลประกอบการวางแผนเท่านั้น จึงควรติดต่อสาขาเพื่อยืนยันก่อนออกเดินทาง',
    journey: [
      {
        title: 'ตรวจสอบสาขาและความพร้อม',
        description:
          'บริการ EV Charging มีเฉพาะบางสาขา โปรดสอบถามว่ามีหัวชาร์จกี่หัว รองรับรถได้กี่คัน และพร้อมให้บริการในเวลาที่คุณต้องการหรือไม่',
      },
      {
        title: 'ตรวจความเข้ากันได้ของรถ',
        description:
          'แจ้งรุ่นรถและหัวต่อที่ใช้กับสาขาเพื่อยืนยันชนิดเครื่องชาร์จ กำลังชาร์จ และหัวต่อที่ติดตั้งจริง โดยเฉพาะรุ่น DC ที่รายละเอียดหัวต่อขึ้นกับใบเสนอราคาโครงการ',
      },
      {
        title: 'ยืนยันเงื่อนไขบริการ',
        description:
          'สอบถามค่าบริการ เวลาทำการ วิธีชำระเงิน การจอง และสถานะล่าสุด แล้วแวะพักดื่มกาแฟระหว่างรอชาร์จได้ตามความสะดวก',
      },
    ],
    closingTitle: 'ค้นหาสาขา แล้วตรวจสอบก่อนแวะชาร์จ',
    closingDescription:
      'ค้นหาสาขา Super Black Coffee ที่ใกล้คุณเพื่อวางแผนจุดพัก และติดต่อสาขาเพื่อยืนยันรายละเอียด EV Charging ที่ตรงกับรถและเส้นทางของคุณ',
    actionLabel: 'ค้นหาสาขาใกล้คุณ',
    actionHref: '/branches',
  },
  {
    slug: 'bpost65-express',
    navigationTitle: 'BPOST65 Express',
    title: 'รับฝากส่งพัสดุ\nในจุดแวะเดียว',
    summary: 'จัดการพัสดุระหว่างแวะพัก พร้อมกาแฟแก้วโปรดในจังหวะเดียว',
    image: '/services/superblackcoffee-service-bpost65-express.png',
    introductionTitle: 'เตรียมให้ครบ แล้วส่งได้ง่ายขึ้น',
    introduction:
      'BPOST65 Express ช่วยให้คุณฝากส่งพัสดุระหว่างแวะสาขาได้ โดยรายละเอียดบริการ ประเภทพัสดุ และเวลารับฝากต้องตรวจสอบกับสาขาก่อนใช้บริการ',
    points: [
      {
        title: 'ตรวจสอบสาขาก่อนแวะ',
        description:
          'บริการมีเฉพาะบางสาขา โปรดสอบถามเวลาให้บริการ ประเภทพัสดุที่รับ และเงื่อนไขการรับฝากก่อนเดินทาง',
      },
      {
        title: 'เตรียมพัสดุและข้อมูลผู้รับ',
        description:
          'บรรจุพัสดุให้เรียบร้อย และเตรียมชื่อ ที่อยู่ รหัสไปรษณีย์ และเบอร์โทรศัพท์ของผู้ส่งกับผู้รับให้ครบ',
      },
      {
        title: 'เก็บหลักฐานสำหรับติดตาม',
        description:
          'ขอและเก็บใบรับฝากหรือหมายเลขติดตามทุกครั้ง เพื่อใช้ตรวจสอบสถานะพัสดุตามช่องทางที่สาขาแจ้ง',
      },
    ],
    detailTitle: 'สิ่งที่ควรรู้ก่อนฝากส่ง',
    detailSummary:
      'ค่าบริการ ระยะเวลานำส่ง ขนาด น้ำหนัก สิ่งของต้องห้าม และความคุ้มครอง อาจแตกต่างตามผู้ให้บริการและสาขา โปรดยืนยันก่อนส่งทุกครั้ง',
    details: [
      {
        title: 'ก่อนนำพัสดุมาที่สาขา',
        description:
          'แพ็กพัสดุให้แข็งแรง ปิดผนึกให้เรียบร้อย และตรวจชื่อ ที่อยู่ รหัสไปรษณีย์ กับเบอร์โทรศัพท์ผู้รับอีกครั้ง',
      },
      {
        title: 'เมื่อใช้บริการที่สาขา',
        description:
          'แจ้งชนิดพัสดุ ขนาด และน้ำหนักตามจริง พร้อมสอบถามราคา ระยะเวลานำส่ง สิ่งของที่ไม่รับฝาก และตัวเลือกความคุ้มครอง',
      },
      {
        title: 'หลังฝากส่ง',
        description:
          'เก็บใบรับฝากและหมายเลขติดตามไว้ แล้วตรวจสถานะผ่านช่องทางของผู้ให้บริการตามข้อมูลที่ได้รับจากสาขา',
      },
      {
        title: 'หากต้องการข้อมูลเพิ่มเติม',
        description:
          'สอบถามสาขาเรื่องพื้นที่ให้บริการ ช่องทางติดตาม การเคลม และช่องทางติดต่อ BPOST65 ก่อนชำระค่าบริการ',
      },
    ],
    journeyTitle: 'สามขั้นตอนก่อนส่งพัสดุ',
    journeySummary:
      'การเตรียมข้อมูลให้ครบช่วยลดเวลาที่สาขาและทำให้ตรวจสอบการจัดส่งได้ง่ายขึ้น',
    journey: [
      {
        title: 'เลือกสาขาและยืนยันบริการ',
        description:
          'ค้นหาสาขาที่สะดวก แล้วติดต่อเพื่อยืนยันว่ามี BPOST65 Express และรับฝากพัสดุในช่วงเวลาที่ต้องการ',
      },
      {
        title: 'แพ็กและกรอกข้อมูลให้ครบ',
        description:
          'เตรียมพัสดุให้พร้อมส่ง พร้อมรายละเอียดผู้ส่งและผู้รับที่อ่านได้ชัดเจน เพื่อให้ทีมสาขาดำเนินการได้รวดเร็ว',
      },
      {
        title: 'รับหลักฐานและติดตาม',
        description:
          'ตรวจสอบรายละเอียดบนใบรับฝาก เก็บหมายเลขติดตาม แล้วแวะพักดื่มกาแฟก่อนเดินทางต่อได้ตามสบาย',
      },
    ],
    closingTitle: 'ส่งพัสดุให้จบ ในจุดแวะเดียว',
    closingDescription:
      'ค้นหาสาขาใกล้คุณ แล้วสอบถามความพร้อมของ BPOST65 Express ก่อนแวะ เพื่อให้การฝากส่งเป็นไปตามแผนของคุณ',
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
    title: 'สามระบบสำคัญ\nสำหรับแฟรนไชส์',
    summary:
      'บริหารแฟรนไชส์ คุมสต๊อก และติดตามเวลาเข้างานของทีมได้จากระบบที่เชื่อมกับการทำงานประจำวัน',
    image: '/services/superblackcoffee-service-control.png',
    imagePosition: 'center top',
    introductionTitle: 'เครื่องมือที่ช่วยให้ร้านเดินหน้าเป็นระบบ',
    introduction:
      'SuperBlack Control รวมเครื่องมือหลักที่แฟรนไชส์ใช้ในการดำเนินงานประจำวัน เพื่อให้เจ้าของร้านและทีมสาขาติดตามข้อมูลสำคัญได้ในที่เดียว',
    points: [
      {
        title: 'ระบบแฟรนไชส์',
        description:
          'ติดตามข้อมูลสาขาและการดำเนินงานของแฟรนไชส์จากพื้นที่จัดการเดียว',
      },
      {
        title: 'ระบบสต๊อก',
        description:
          'ดูแลรายการสินค้าและวัตถุดิบ เพื่อให้ทีมติดตามสิ่งที่ต้องใช้ในร้านได้เป็นระบบ',
      },
      {
        title: 'ระบบเช็กอิน–เช็กเอาต์',
        description:
          'บันทึกเวลาเข้างานและออกงาน เพื่อช่วยให้ติดตามเวลาทำงานของพนักงานได้ชัดเจน',
      },
    ],
    detailTitle: 'สิ่งที่แฟรนไชส์ใช้จัดการร้านได้จริง',
    detailSummary:
      'หลังเริ่มต้นแฟรนไชส์ ทีมจะมีเครื่องมือสำหรับติดตามสาขา จัดการสต๊อก และบันทึกเวลาเข้างาน–ออกงาน โดยรายละเอียดสิทธิ์และการตั้งค่าเป็นไปตามรูปแบบที่ทีมกำหนดให้',
    details: [
      {
        title: 'บริหารแฟรนไชส์จากจุดเดียว',
        description:
          'เข้าถึงพื้นที่จัดการที่เกี่ยวข้องกับสาขา เพื่อให้เจ้าของร้านและทีมเห็นข้อมูลการดำเนินงานในมุมมองที่เหมาะกับบทบาท',
      },
      {
        title: 'ติดตามสินค้าและวัตถุดิบ',
        description:
          'ใช้ระบบสต๊อกช่วยดูแลรายการสินค้าและวัตถุดิบที่เกี่ยวข้องกับการทำงานของสาขา',
      },
      {
        title: 'ดูแลเวลาเข้างานของทีม',
        description:
          'ระบบเช็กอิน–เช็กเอาต์ช่วยบันทึกเวลาเริ่มและสิ้นสุดงาน เพื่อให้ทีมตรวจสอบข้อมูลเวลาได้ง่ายขึ้น',
      },
    ],
    systemScreens: [
      {
        title: 'ภาพรวมแฟรนไชส์',
        description:
          'ดูข้อมูลสาขา สินค้าที่พร้อมขาย และรายการที่ต้องติดตามจากหน้าเดียว',
        image: '/services/system-previews/franchise-dashboard.jpg',
      },
      {
        title: 'คำขอวัตถุดิบ',
        description: 'ติดตามคำขอวัตถุดิบที่สาขาส่งให้ทีมดำเนินการ',
        image: '/services/system-previews/franchise-ingredient-requests.jpg',
      },
      {
        title: 'เมนูและสินค้า',
        description: 'ตรวจสอบเมนู ราคา และความพร้อมขายของสาขา',
        image: '/services/system-previews/franchise-products.jpg',
      },
      {
        title: 'ตารางพนักงาน',
        description: 'ดูและวางแผนตารางกะของทีมประจำสาขา',
        image: '/services/system-previews/franchise-schedule.jpg',
      },
      {
        title: 'บันทึกเมนูที่ขายและตัดสต๊อก',
        description: 'ทีมหน้าร้านบันทึกการขายเพื่อตัดวัตถุดิบตามเมนูที่เลือก',
        image: '/services/system-previews/stock-sales.jpg',
      },
      {
        title: 'ตรวจนับวัตถุดิบ',
        description:
          'ตรวจสอบยอดคงเหลือ สถานะ และสั่งซื้อวัตถุดิบได้จากหน้าเดียว',
        image: '/services/system-previews/stock-ingredients.jpg',
      },
      {
        title: 'โปรโมชั่น',
        description: 'ดูและจัดการโปรโมชั่นตามสิทธิ์ที่ได้รับของสาขา',
        image: '/services/system-previews/stock-promotions.jpg',
      },
      {
        title: 'เช็กอิน–เช็กเอาต์พนักงาน',
        description:
          'พนักงานบันทึกเวลาเข้างานและดูสถานะการทำงานของตนเองได้จากมือถือ',
        image: '/services/system-previews/attendance-clock.jpg',
      },
      {
        title: 'คำขอลา',
        description: 'พนักงานส่งคำขอลาและกรอกรายละเอียดที่เกี่ยวข้องได้จากระบบ',
        image: '/services/system-previews/attendance-leave-request.jpg',
      },
      {
        title: 'ประวัติการทำงาน',
        description: 'ตรวจสอบประวัติเช็กอิน–เช็กเอาต์และใบลาที่บันทึกไว้',
        image: '/services/system-previews/attendance-history.jpg',
      },
    ],
    journeyTitle: 'เริ่มใช้งานระบบในสามส่วน',
    journeySummary:
      'ตั้งค่าบัญชีและสิทธิ์การใช้งานให้เหมาะกับสาขา แล้วให้ทีมใช้ข้อมูลเดียวกันในงานประจำวัน',
    journey: [
      {
        title: 'จัดการข้อมูลแฟรนไชส์',
        description:
          'เริ่มต้นจากข้อมูลสาขาและบัญชีผู้ใช้งานที่ทีมจำเป็นต้องใช้',
      },
      {
        title: 'ดูแลสต๊อกในร้าน',
        description:
          'บันทึกและติดตามข้อมูลสินค้าและวัตถุดิบตามกระบวนการของสาขา',
      },
      {
        title: 'บันทึกเวลาเข้างาน–ออกงาน',
        description: 'ให้พนักงานเช็กอินและเช็กเอาต์ตามขั้นตอนที่ร้านกำหนด',
      },
    ],
    closingTitle: 'ดูแลร้านด้วยระบบที่ทีมใช้ร่วมกัน',
    closingDescription:
      'สอบถามทีมแฟรนไชส์เกี่ยวกับระบบแฟรนไชส์ สต๊อก และเช็กอิน–เช็กเอาต์ เพื่อดูรูปแบบการใช้งานที่เหมาะกับสาขาของคุณ',
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
    introductionTitle: 'Coffee cared for from bean to cup',
    introduction:
      'Super Black Coffee selects quality beans and cares for grinding and extraction to suit each menu item, so every cup has a clear and consistent flavour.',
    points: [
      {
        title: 'Quality coffee beans',
        description:
          'Our coffee beans are the starting point for drinks that work well as black coffee, milk coffee, and signature creations.',
      },
      {
        title: 'Ground and extracted for each drink',
        description:
          'Coffee, water, and milk are prepared in proportions that suit each drink, keeping its character clear.',
      },
      {
        title: 'Prepared to order',
        description:
          'Every cup is prepared and served to the shop standard, for a familiar cup you can rely on each time.',
      },
    ],
    detailTitle: 'Coffee menu choices for your taste',
    detailSummary:
      'Start with familiar classics, or explore coffee paired with milk, fruit, and other ingredients to find a drink for your day.',
    details: [
      {
        title: 'Coffee classics',
        description:
          'Discover Americano, espresso, mocha, cappuccino, and latte in hot and iced options.',
      },
      {
        title: 'Milk coffee and smooth flavours',
        description:
          'Choose from latte, vanilla latte, caramel macchiato, and other coffee-and-milk combinations.',
      },
      {
        title: 'Fruit coffee and creative drinks',
        description:
          'Try coconut Americano, orange Americano, honey lemon Americano, or a Super Black Coffee signature drink.',
      },
    ],
    journeyTitle: 'From your choice to the cup in front of you',
    journeySummary:
      'Every cup starts with your menu choice, then follows a simple process of preparation, brewing, and serving.',
    journey: [
      {
        title: 'Choose the drink that fits',
        description:
          'Pick black coffee, milk coffee, hot drinks, iced drinks, or something new for today.',
      },
      {
        title: 'Prepared to the shop standard',
        description:
          'Our baristas prepare the ingredients and extraction so each coffee is ready to serve.',
      },
      {
        title: 'Receive the coffee you chose',
        description:
          'Enjoy it in the shop or take it away, with a coffee that fits your day.',
      },
    ],
    closingTitle: 'Choose the right coffee for today',
    closingDescription:
      'Explore our classic coffee, milk coffee, and creative drinks, then choose the cup you want to enjoy.',
    actionLabel: 'View our menu',
  },
  'ev-charging': {
    title: 'Recharge your car\nand yourself',
    summary:
      'A stop along the road where you can charge your car, enjoy coffee, and continue with ease.',
    introductionTitle: 'Make a stop along the road a good moment',
    introduction:
      'The specifications below reference RBC EV Station for project planning. Confirm the exact model and installed setup with each branch before using the service.',
    points: [
      {
        title: 'DC charger options',
        description:
          'RBC lists two DC charger groups: iGreen CSEVC3401E at 20 / 30 kW, and iGreen CSEVC3108E at 120 kW for higher-power sites.',
      },
      {
        title: 'AC charger options',
        description:
          'RBC lists AC 7.4 kW and 22 kW options with Type 2 connectors and 5-metre cables, in both display and no-display variants.',
      },
      {
        title: 'Electrical design is site-specific',
        description:
          'Installed capacity, transformer sizing, connection points, and protection equipment require site review by engineers and the utility.',
      },
    ],
    detailTitle: 'Charger specifications and electrical supply',
    detailSummary:
      'The following references RBC EV Station. They do not confirm the model, equipment, or capacity installed at every Super Black Coffee branch.',
    reference: {
      label: 'View the RBC EV Station reference',
      href: 'https://www.rbcevstation.com/investment',
    },
    details: [
      {
        title: 'DC 20 / 30 kW',
        description:
          '150–1000 V DC output, up to 100 A, a 5-metre cable, and a 4.3-inch LCD. RBC lists a two-year warranty for both 20 and 30 kW models.',
      },
      {
        title: 'DC 120 kW',
        description:
          '150–1000 V DC output, 200 A or 100 A per connector by configuration, a 5-metre cable, and a 7- or 4.3-inch LCD. RBC lists a two-year warranty.',
      },
      {
        title: 'AC 7.4 / 22 kW',
        description:
          'Type 2 connector and a 5-metre cable. Display variants use a 4.3-inch LCD, while warranty is three or five years by model; confirm the exact variant before ordering or installation.',
      },
    ],
    journeyTitle: 'Plan your charging stop',
    journeySummary:
      'Live charger status is not currently shown on the website, and the above specifications are planning references only. Contact your selected branch before travelling.',
    journey: [
      {
        title: 'Check branch availability',
        description:
          'EV Charging is available at selected branches only. Ask about the charger count, simultaneous capacity, and availability at the time you plan to visit.',
      },
      {
        title: 'Confirm vehicle compatibility',
        description:
          'Share your vehicle model and connector to confirm the installed charger type, power, and connector. DC connector details especially depend on the project quotation.',
      },
      {
        title: 'Confirm service conditions',
        description:
          'Confirm fees, opening hours, payment methods, booking requirements, and current status, then enjoy a coffee break while you charge.',
      },
    ],
    closingTitle: 'Find a branch, then confirm before you charge',
    closingDescription:
      'Find a nearby Super Black Coffee branch to plan your stop, then contact the branch to confirm EV Charging details for your vehicle and route.',
    actionLabel: 'Find a branch near you',
  },
  'bpost65-express': {
    title: 'Send parcels\nin one stop',
    summary: 'Handle a parcel while you pause for your favourite coffee.',
    introductionTitle: 'Prepare well, then send with ease',
    introduction:
      'BPOST65 Express lets you send a parcel while visiting a branch. Confirm service availability, accepted parcel types, and receiving hours with the branch first.',
    points: [
      {
        title: 'Check the branch before visiting',
        description:
          'The service is available at selected branches. Ask about operating hours, accepted parcel types, and drop-off conditions before travelling.',
      },
      {
        title: 'Prepare the parcel and recipient details',
        description:
          'Pack the parcel securely and have complete sender and recipient names, addresses, postcodes, and phone numbers ready.',
      },
      {
        title: 'Keep your tracking proof',
        description:
          'Request and retain the drop-off receipt or tracking number, so you can check delivery status through the channel provided by the branch.',
      },
    ],
    detailTitle: 'What to know before you send',
    detailSummary:
      'Fees, transit times, size and weight limits, prohibited items, and coverage can vary by provider and branch. Confirm them before every shipment.',
    details: [
      {
        title: 'Before bringing your parcel',
        description:
          'Pack the parcel securely, seal it properly, and recheck the recipient name, address, postcode, and phone number.',
      },
      {
        title: 'At the branch',
        description:
          'Declare the parcel type, actual size, and weight. Ask about price, delivery time, prohibited items, and coverage options.',
      },
      {
        title: 'After drop-off',
        description:
          'Keep the receipt and tracking number, then follow delivery status through the provider channel given by the branch.',
      },
      {
        title: 'If you need more information',
        description:
          'Ask the branch about service coverage, tracking channels, claims, and how to contact BPOST65 before paying.',
      },
    ],
    journeyTitle: 'Three steps before sending',
    journeySummary:
      'Having complete details ready reduces time at the branch and makes the shipment easier to track.',
    journey: [
      {
        title: 'Choose a branch and confirm service',
        description:
          'Find a convenient branch, then contact it to confirm that BPOST65 Express can accept your parcel at the time you plan to visit.',
      },
      {
        title: 'Pack and complete the details',
        description:
          'Prepare the parcel and clearly readable sender and recipient details, so the branch team can process it quickly.',
      },
      {
        title: 'Collect proof and track it',
        description:
          'Review the receipt, retain the tracking number, then enjoy a coffee break before continuing your day.',
      },
    ],
    closingTitle: 'Send your parcel in one stop',
    closingDescription:
      'Find a nearby branch and confirm BPOST65 Express availability before visiting, so your shipment fits your plan.',
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
    title: 'Three essential systems\nfor franchise operations',
    summary:
      'Manage franchise operations, stock, and team clock-ins from systems that support everyday work.',
    introductionTitle: 'Tools that keep the store running systematically',
    introduction:
      'SuperBlack Control brings together the core tools franchise teams use every day, helping owners and branch teams follow important information in one place.',
    points: [
      {
        title: 'Franchise system',
        description:
          'Follow branch and franchise operating information from one management space.',
      },
      {
        title: 'Stock system',
        description:
          'Manage product and ingredient lists so the team can follow the items used in the store systematically.',
      },
      {
        title: 'Clock-in and clock-out system',
        description:
          'Record start and finish times to help teams follow staff working hours clearly.',
      },
    ],
    detailTitle: 'What franchise teams can use to run the store',
    detailSummary:
      'After onboarding, teams have tools to follow branch operations, manage stock, and record clock-ins and clock-outs. Access and setup details follow the operating model provided by the team.',
    details: [
      {
        title: 'Manage franchise operations from one place',
        description:
          'Access the branch-related management space so owners and teams can see operating information relevant to their role.',
      },
      {
        title: 'Follow products and ingredients',
        description:
          'Use the stock system to manage product and ingredient information related to branch operations.',
      },
      {
        title: 'Look after team working time',
        description:
          'The clock-in and clock-out system records work start and finish times so teams can review time information more easily.',
      },
    ],
    systemScreens: [
      {
        title: 'Franchise overview',
        description:
          'View branch information, products ready to sell, and items that need attention in one place.',
        image: '/services/system-previews/franchise-dashboard.jpg',
      },
      {
        title: 'Ingredient requests',
        description:
          'Follow ingredient requests sent by the branch for the team to process.',
        image: '/services/system-previews/franchise-ingredient-requests.jpg',
      },
      {
        title: 'Menus and products',
        description: 'Check branch menus, prices, and product availability.',
        image: '/services/system-previews/franchise-products.jpg',
      },
      {
        title: 'Employee schedules',
        description: 'View and plan branch team schedules.',
        image: '/services/system-previews/franchise-schedule.jpg',
      },
      {
        title: 'Sales entry and stock deduction',
        description:
          'Front-of-house teams record sales so ingredients can be deducted against the selected menu item.',
        image: '/services/system-previews/stock-sales.jpg',
      },
      {
        title: 'Ingredient counting',
        description:
          'Check quantities and status, then order ingredients from one place.',
        image: '/services/system-previews/stock-ingredients.jpg',
      },
      {
        title: 'Promotions',
        description:
          'View and manage promotions according to the branch access granted.',
        image: '/services/system-previews/stock-promotions.jpg',
      },
      {
        title: 'Employee clock-in and clock-out',
        description:
          'Employees can record work time and view their work status from a mobile device.',
        image: '/services/system-previews/attendance-clock.jpg',
      },
      {
        title: 'Leave requests',
        description:
          'Employees can submit leave requests and provide the required details through the system.',
        image: '/services/system-previews/attendance-leave-request.jpg',
      },
      {
        title: 'Work history',
        description:
          'Review recorded clock-ins, clock-outs, and leave history.',
        image: '/services/system-previews/attendance-history.jpg',
      },
    ],
    journeyTitle: 'Start with three connected systems',
    journeySummary:
      'Set up accounts and access for the branch, then let the team work from the same information in everyday operations.',
    journey: [
      {
        title: 'Manage franchise information',
        description:
          'Start with the branch information and user accounts the team needs.',
      },
      {
        title: 'Manage in-store stock',
        description:
          'Record and follow product and ingredient information through the branch process.',
      },
      {
        title: 'Record clock-ins and clock-outs',
        description:
          'Let employees clock in and out through the procedure set by the store.',
      },
    ],
    closingTitle: 'Run the store with systems your team uses together',
    closingDescription:
      'Ask the franchise team about franchise, stock, and clock-in and clock-out systems to find the setup that fits your branch.',
    actionLabel: 'Ask our franchise team',
  },
};
