export type SalesChannel = 'storefront' | 'lineman';

type RecipeMenu = {
  id: number;
  name: string;
};

export type WorkbookSale = {
  menuItemId: number;
  menuName: string;
  quantity: number;
  channel: SalesChannel;
};

export type WorkbookImport = {
  sales: WorkbookSale[];
  unmatchedMenuNames: string[];
  unsupportedChannelMenuNames: string[];
  rowCount: number;
};

type WorkbookRow = Record<string, string | number | undefined>;
type WorkbookMenu = RecipeMenu & { category?: string };

const normalizeHeader = (value: string) =>
  value.trim().toLocaleLowerCase('en-US');

const cell = (row: WorkbookRow, header: string) => {
  const target = normalizeHeader(header);
  const key = Object.keys(row).find(
    (candidate) => normalizeHeader(candidate) === target,
  );
  return key ? row[key] : undefined;
};

const asText = (value: string | number | undefined) =>
  String(value ?? '').trim();

const parseQuantity = (value: string | number | undefined) => {
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
};

const normalizeMenuText = (value: string) =>
  value
    .toLocaleLowerCase('th-TH')
    .replace(/มัฉฉะ/gu, 'มัทฉะ')
    .replace(/^น้ำ(?=ส้ม|มะนาว)/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '');

const workbookCategoryMatches = (menu: WorkbookMenu, category: string) => {
  const normalizedCategory = normalizeMenuText(category);
  const normalizedMenu = normalizeMenuText(menu.name);
  const normalizedMenuCategory = normalizeMenuText(menu.category ?? '');
  if (!normalizedCategory) return true;
  if (
    normalizedCategory.includes('กาแฟเย็น') ||
    normalizedCategory.includes('ชานมเย็น')
  ) {
    return (
      normalizedMenu.includes('เย็น') ||
      normalizedMenuCategory.includes('กาแฟเย็น') ||
      (normalizedCategory.includes('ชานมเย็น') &&
        normalizedMenuCategory.includes('เมนูชา') &&
        !normalizedMenu.includes('ร้อน'))
    );
  }
  if (
    normalizedCategory.includes('กาแฟร้อน') ||
    normalizedCategory.includes('ชาร้อน')
  ) {
    return (
      normalizedMenu.includes('ร้อน') ||
      normalizedMenuCategory.includes('กาแฟร้อน') ||
      (normalizedCategory.includes('ชาร้อน') &&
        normalizedMenuCategory.includes('เมนูชาร้อน'))
    );
  }
  if (normalizedCategory.includes('น้ำปั่น'))
    return normalizedMenu.includes('ปั่น');
  return true;
};

const matchWorkbookMenu = (
  menuName: string,
  category: string,
  menus: WorkbookMenu[],
) => {
  const normalizedName = normalizeMenuText(menuName);
  const exact = menus.find(
    (menu) => normalizeMenuText(menu.name) === normalizedName,
  );
  if (exact) {
    return { menuItemId: exact.id, menuName: exact.name, quantity: 1 };
  }

  // FoodStory appends option text to the display name. Match against the
  // canonical database name after removing those option segments.
  const optionStart = /\s+(?:เมล็ดกาแฟ|ระดับความหวาน|แยกน้ำ|ท็อปปิ้ง)\s*:/u;
  const displayName = menuName.split(optionStart, 1)[0];
  const baseName = displayName
    .split(/\s+-\s+/u, 1)[0]
    .replace(/\([^)]*\)/gu, '')
    .trim();
  const englishName = displayName.match(/\(([^)]*)\)/u)?.[1] ?? '';
  const normalizedBase = normalizeMenuText(baseName);
  const base = normalizeMenuText(
    /\bice\b/iu.test(englishName) && !normalizedBase.includes('เย็น')
      ? `${baseName}เย็น`
      : baseName,
  );
  if (base.length < 2) return undefined;
  // Prefer the exported base name when it exactly matches a menu. Without
  // this, "มัทฉะลาเต้" is ambiguous with variants such as
  // "มัทฉะลาเต้มะพร้าว" even though the base menu is present.
  const exactBase = menus.filter(
    (menu) =>
      normalizeMenuText(menu.name) === base &&
      workbookCategoryMatches(menu, category),
  );
  if (exactBase.length === 1) {
    return {
      menuItemId: exactBase[0].id,
      menuName: exactBase[0].name,
      quantity: 1,
    };
  }
  const candidates = menus.filter((menu) => {
    const normalizedMenu = normalizeMenuText(menu.name);
    return (
      (normalizedMenu.includes(base) ||
        base.includes(normalizedMenu.replace(/คั่ว(?:เข้ม|กลาง)/gu, ''))) &&
      workbookCategoryMatches(menu, category)
    );
  });
  if (candidates.length !== 1) return undefined;
  return {
    menuItemId: candidates[0].id,
    menuName: candidates[0].name,
    quantity: 1,
  };
};

export const channelFromWorkbook = (
  value: string | number | undefined,
): SalesChannel | null => {
  const normalized = asText(value).toLocaleLowerCase('en-US');
  if (normalized.includes('line man') || normalized.includes('lineman')) {
    return 'lineman';
  }
  if (normalized.includes('storefront') || normalized.includes('หน้าร้าน')) {
    return 'storefront';
  }
  return null;
};

/**
 * Converts Sale by Bill Detail rows into a conservative stock-consumption
 * preview. Rows with a menu name that cannot be uniquely matched are never
 * put in the cart, so a staff member can inspect the warning before saving.
 */
export function matchWorkbookSales(
  rows: WorkbookRow[],
  menus: WorkbookMenu[],
): WorkbookImport {
  const sales = new Map<string, WorkbookSale>();
  const unmatchedMenuNames = new Set<string>();
  const unsupportedChannelMenuNames = new Set<string>();
  let rowCount = 0;

  for (const row of rows) {
    const menuName = asText(cell(row, 'Menu Name'));
    const category = asText(cell(row, 'Category'));
    const quantity = parseQuantity(cell(row, 'Quantity'));
    if (!menuName || !quantity) continue;
    rowCount += 1;

    const channel = channelFromWorkbook(cell(row, 'Channel'));
    if (!channel) {
      unsupportedChannelMenuNames.add(menuName);
      continue;
    }

    const match = matchWorkbookMenu(menuName, category, menus);
    if (!match) {
      unmatchedMenuNames.add(menuName);
      continue;
    }
    const key = `${channel}:${match.menuItemId}`;
    const current = sales.get(key);
    sales.set(key, {
      menuItemId: match.menuItemId,
      menuName: match.menuName,
      quantity: (current?.quantity ?? 0) + quantity,
      channel,
    });
  }

  return {
    sales: [...sales.values()],
    unmatchedMenuNames: [...unmatchedMenuNames],
    unsupportedChannelMenuNames: [...unsupportedChannelMenuNames],
    rowCount,
  };
}

const zipSignature = 0x06054b50;
const centralDirectorySignature = 0x02014b50;
const localFileSignature = 0x04034b50;

const readUint16 = (bytes: Uint8Array, offset: number) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(
    offset,
    true,
  );
const readUint32 = (bytes: Uint8Array, offset: number) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    offset,
    true,
  );

const unzipEntry = async (
  bytes: Uint8Array,
  offset: number,
  compressedSize: number,
  compression: number,
) => {
  const content = bytes.slice(offset, offset + compressedSize);
  if (compression === 0) return content;
  if (compression !== 8 || typeof DecompressionStream === 'undefined') {
    throw new Error('ไฟล์ Excel นี้ใช้รูปแบบการบีบอัดที่ไม่รองรับ');
  }
  const stream = new Blob([content])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const workbookPath = (target: string) => {
  const parts = ['xl', ...target.replace(/^\/+/, '').split('/')];
  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') resolved.pop();
    else resolved.push(part);
  }
  return resolved.join('/');
};

const xml = (bytes: Uint8Array) =>
  new DOMParser().parseFromString(
    new TextDecoder().decode(bytes),
    'application/xml',
  );

const columnIndex = (cellReference: string) => {
  const letters = cellReference.match(/[A-Z]+/i)?.[0]?.toUpperCase() ?? '';
  return (
    [...letters].reduce(
      (index, letter) => index * 26 + letter.charCodeAt(0) - 64,
      0,
    ) - 1
  );
};

const textAt = (element: Element, selector: string) =>
  element.getElementsByTagName(selector)[0]?.textContent ?? '';

const spreadsheetRows = (sheet: Document, sharedStrings: string[]) => {
  const rows: string[][] = [];
  for (const row of [...sheet.getElementsByTagName('row')]) {
    const values: string[] = [];
    for (const worksheetCell of [...row.getElementsByTagName('c')]) {
      const reference = worksheetCell.getAttribute('r') ?? '';
      const index = columnIndex(reference);
      const type = worksheetCell.getAttribute('t');
      const rawValue = textAt(worksheetCell, 'v');
      const value =
        type === 's'
          ? (sharedStrings[Number(rawValue)] ?? '')
          : type === 'inlineStr'
            ? textAt(worksheetCell, 't')
            : rawValue;
      values[index] = value;
    }
    rows.push(values);
  }
  return rows;
};

const workbookHeaderAliases = {
  menuName: ['Menu Name', 'ชื่อเมนู'],
  category: ['Category', 'หมวดหมู่', 'หมวดสินค้า'],
  quantity: ['Quantity', 'จำนวน'],
  channel: ['Channel', 'ช่องทาง'],
} as const;

const headerAlias = (value: string) => {
  const normalized = normalizeHeader(value);
  for (const [field, aliases] of Object.entries(workbookHeaderAliases)) {
    if (aliases.some((alias) => normalizeHeader(alias) === normalized)) {
      return field;
    }
  }
  return undefined;
};

/** Reads the standard FoodStory "Sale by Bill Detail" .xlsx export in-browser. */
export async function readSalesWorkbook(file: File): Promise<WorkbookRow[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let eocd = -1;
  for (
    let index = bytes.length - 22;
    index >= Math.max(0, bytes.length - 65_557);
    index -= 1
  ) {
    if (readUint32(bytes, index) === zipSignature) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error('ไม่พบข้อมูลไฟล์ Excel ที่ถูกต้อง');

  const entries = new Map<string, Uint8Array>();
  const entryCount = readUint16(bytes, eocd + 10);
  let cursor = readUint32(bytes, eocd + 16);
  const decoder = new TextDecoder();
  for (let entry = 0; entry < entryCount; entry += 1) {
    if (readUint32(bytes, cursor) !== centralDirectorySignature) break;
    const compression = readUint16(bytes, cursor + 10);
    const compressedSize = readUint32(bytes, cursor + 20);
    const filenameLength = readUint16(bytes, cursor + 28);
    const extraLength = readUint16(bytes, cursor + 30);
    const commentLength = readUint16(bytes, cursor + 32);
    const localOffset = readUint32(bytes, cursor + 42);
    const name = decoder.decode(
      bytes.slice(cursor + 46, cursor + 46 + filenameLength),
    );
    if (readUint32(bytes, localOffset) !== localFileSignature) {
      throw new Error('โครงสร้างไฟล์ Excel ไม่ถูกต้อง');
    }
    const localNameLength = readUint16(bytes, localOffset + 26);
    const localExtraLength = readUint16(bytes, localOffset + 28);
    entries.set(
      name,
      await unzipEntry(
        bytes,
        localOffset + 30 + localNameLength + localExtraLength,
        compressedSize,
        compression,
      ),
    );
    cursor += 46 + filenameLength + extraLength + commentLength;
  }

  const workbook = entries.get('xl/workbook.xml');
  const relationships = entries.get('xl/_rels/workbook.xml.rels');
  if (!workbook || !relationships)
    throw new Error('ไม่พบตารางข้อมูลในไฟล์ Excel');
  const relationshipTargets = new Map<string, string>();
  for (const relationship of [
    ...xml(relationships).getElementsByTagName('Relationship'),
  ]) {
    const id = relationship.getAttribute('Id');
    const target = relationship.getAttribute('Target');
    if (id && target) relationshipTargets.set(id, workbookPath(target));
  }
  const sheets = [...xml(workbook).getElementsByTagName('sheet')];
  const saleSheet =
    sheets.find((sheet) =>
      sheet
        .getAttribute('name')
        ?.toLocaleLowerCase('en-US')
        .includes('salebybilldetail'),
    ) ?? sheets[0];
  const relationshipId = saleSheet?.getAttributeNS(
    'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'id',
  );
  const worksheet = relationshipId
    ? entries.get(relationshipTargets.get(relationshipId) ?? '')
    : undefined;
  if (!worksheet) throw new Error('ไม่พบชีตยอดขายในไฟล์ Excel');

  const sharedStrings = entries.get('xl/sharedStrings.xml');
  const strings = sharedStrings
    ? [...xml(sharedStrings).getElementsByTagName('si')].map((item) =>
        [...item.getElementsByTagName('t')]
          .map((text) => text.textContent ?? '')
          .join(''),
      )
    : [];
  const rows = spreadsheetRows(xml(worksheet), strings);
  // FoodStory's Thai export includes a report title row before the actual
  // table header, while the English export starts with headers immediately.
  // Locate the first row containing the required menu/quantity/channel fields.
  const headerIndex = rows.findIndex((row) => {
    const fields = new Set(row.map((value) => headerAlias(value)));
    return (
      fields.has('menuName') && fields.has('quantity') && fields.has('channel')
    );
  });
  if (headerIndex < 0) throw new Error('ไม่พบหัวตารางยอดขายในไฟล์ Excel');
  const [headers = [], ...data] = rows.slice(headerIndex);
  const canonicalHeaders = headers.map((header) => {
    const field = headerAlias(header);
    if (field === 'menuName') return 'Menu Name';
    if (field === 'category') return 'Category';
    if (field === 'quantity') return 'Quantity';
    if (field === 'channel') return 'Channel';
    return header;
  });
  return data
    .filter((row) => row.some((value) => value))
    .map((row) =>
      Object.fromEntries(
        canonicalHeaders
          .map((header, index) => [header, row[index]] as const)
          .filter(([header]) => Boolean(header)),
      ),
    );
}
