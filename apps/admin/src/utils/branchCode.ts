const thaiAreaCodes: Record<string, string> = {
  กรุงเทพมหานคร: 'BKK',
  กระบี่: 'KBI',
  กาญจนบุรี: 'KRI',
  กาฬสินธุ์: 'KSN',
  กำแพงเพชร: 'KPT',
  ขอนแก่น: 'KKN',
  จันทบุรี: 'CTI',
  ฉะเชิงเทรา: 'CCO',
  ชลบุรี: 'CBI',
  ชัยนาท: 'CNT',
  ชัยภูมิ: 'CPM',
  ชุมพร: 'CPN',
  เชียงราย: 'CEI',
  เชียงใหม่: 'CNX',
  ตรัง: 'TRG',
  ตราด: 'TAT',
  ตาก: 'TAK',
  นครนายก: 'NYK',
  นครปฐม: 'NPT',
  นครพนม: 'NPM',
  นครราชสีมา: 'NMA',
  นครศรีธรรมราช: 'NST',
  นครสวรรค์: 'NSN',
  นนทบุรี: 'NBI',
  นราธิวาส: 'NAW',
  น่าน: 'NAN',
  บึงกาฬ: 'BKN',
  บุรีรัมย์: 'BRM',
  ปทุมธานี: 'PTE',
  ประจวบคีรีขันธ์: 'PKK',
  ปราจีนบุรี: 'PRI',
  ปัตตานี: 'PTN',
  พะเยา: 'PYO',
  พังงา: 'PNA',
  พัทลุง: 'PLG',
  พิจิตร: 'PCT',
  พิษณุโลก: 'PLO',
  เพชรบุรี: 'PBI',
  เพชรบูรณ์: 'PBN',
  แพร่: 'PRE',
  ภูเก็ต: 'HKT',
  มหาสารคาม: 'MKM',
  มุกดาหาร: 'MDH',
  แม่ฮ่องสอน: 'MHS',
  ยโสธร: 'YST',
  ยะลา: 'YLA',
  ร้อยเอ็ด: 'RET',
  ระนอง: 'RNG',
  ระยอง: 'RYG',
  ราชบุรี: 'RBR',
  ลพบุรี: 'LRI',
  ลำปาง: 'LPG',
  ลำพูน: 'LPN',
  เลย: 'LOE',
  ศรีสะเกษ: 'SSK',
  สกลนคร: 'SNK',
  สงขลา: 'SKA',
  สตูล: 'STN',
  สมุทรปราการ: 'SPK',
  สมุทรสงคราม: 'SKM',
  สมุทรสาคร: 'SKN',
  สระแก้ว: 'SKW',
  สระบุรี: 'SRI',
  สิงห์บุรี: 'SBR',
  สุโขทัย: 'STI',
  อยุธยา: 'AYU',
  สุพรรณบุรี: 'SPB',
  สุราษฎร์ธานี: 'SRT',
  สุรินทร์: 'SRN',
  หนองคาย: 'NKI',
  หนองบัวลำภู: 'NBP',
  อ่างทอง: 'ATG',
  อำนาจเจริญ: 'ACN',
  อุดรธานี: 'UDN',
  อุตรดิตถ์: 'UTT',
  อุทัยธานี: 'UTY',
  อุบลราชธานี: 'UBP',
  หาดใหญ่: 'HDY',
  กรุงเทพ: 'BKK',
};

function codePrefix(name: string) {
  const normalized = name.trim().toLowerCase();
  const matchedArea = Object.entries(thaiAreaCodes).find(([area]) =>
    normalized.includes(area),
  );
  if (matchedArea) return matchedArea[1];

  const latin = normalized
    .replace(/super\s*black\s*coffee|sbc|สาขา|แฟรนไชส์/gi, ' ')
    .match(/[a-z0-9]+/g)
    ?.join('');
  return (latin || 'BR').slice(0, 3).toUpperCase();
}

export function suggestBranchCode(
  name: string,
  existingCodes: Iterable<string>,
) {
  const prefix = codePrefix(name);
  const used = new Set(
    [...existingCodes].map((code) => code.trim().toUpperCase()),
  );
  if (!used.has(prefix)) return prefix;

  let suffix = 2;
  while (used.has(`${prefix}-${String(suffix).padStart(2, '0')}`)) suffix += 1;
  return `${prefix}-${String(suffix).padStart(2, '0')}`;
}
