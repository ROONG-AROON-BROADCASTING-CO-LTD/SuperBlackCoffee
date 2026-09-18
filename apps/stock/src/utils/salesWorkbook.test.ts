import { describe, expect, it } from 'vitest';
import {
  channelFromWorkbook,
  matchWorkbookSales,
  readSalesWorkbook,
} from './salesWorkbook';

const menus = [
  { id: 1, name: 'ชาเขียวปั่น' },
  { id: 2, name: 'ชาไทยปั่น' },
];

const encoder = new TextEncoder();
const uint16 = (value: number) => Uint8Array.of(value & 0xff, value >> 8);
const uint32 = (value: number) =>
  Uint8Array.of(
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    value >> 24,
  );
const join = (parts: Uint8Array[]) => {
  const result = new Uint8Array(
    parts.reduce((total, part) => total + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
};

// A minimal uncompressed .xlsx archive lets the browser parser be tested
// without checking a customer export into the repository.
const workbookFile = () => {
  const files = [
    [
      'xl/workbook.xml',
      '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="salebybilldetail" r:id="rId1"/></sheets></workbook>',
    ],
    [
      'xl/_rels/workbook.xml.rels',
      '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
    ],
    [
      'xl/sharedStrings.xml',
      '<sst><si><t>Menu Name</t></si><si><t>Quantity</t></si><si><t>Channel</t></si><si><t>ชาเขียวปั่น</t></si><si><t>หน้าร้าน (Storefront)</t></si></sst>',
    ],
    [
      'xl/worksheets/sheet1.xml',
      '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row><row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2"><v>2</v></c><c r="C2" t="s"><v>4</v></c></row></sheetData></worksheet>',
    ],
  ] as const;
  const localFiles: Uint8Array[] = [];
  const centralFiles: Uint8Array[] = [];
  let offset = 0;
  for (const [name, contents] of files) {
    const filename = encoder.encode(name);
    const content = encoder.encode(contents);
    localFiles.push(
      join([
        uint32(0x04034b50),
        uint16(20),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(0),
        uint32(content.length),
        uint32(content.length),
        uint16(filename.length),
        uint16(0),
        filename,
        content,
      ]),
    );
    centralFiles.push(
      join([
        uint32(0x02014b50),
        uint16(20),
        uint16(20),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(0),
        uint32(content.length),
        uint32(content.length),
        uint16(filename.length),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(0),
        uint32(offset),
        filename,
      ]),
    );
    offset += localFiles.at(-1)?.length ?? 0;
  }
  const centralDirectory = join(centralFiles);
  return join([
    ...localFiles,
    centralDirectory,
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralDirectory.length),
    uint32(offset),
    uint16(0),
  ]);
};

describe('sales workbook import', () => {
  it('maps FoodStory display names with inline options to canonical database names', () => {
    expect(
      matchWorkbookSales(
        [
          {
            'Menu Name':
              'อเมริกาโน่ (Ice Americano) เมล็ดกาแฟ : Special Bean Medium Roast x 1 ระดับความหวาน : ไม่หวาน 0%',
            Category: 'กาแฟเย็น',
            Quantity: 2,
            Channel: 'หน้าร้าน (Storefront)',
          },
        ],
        [
          {
            id: 31,
            name: 'อเมริกาโน่เย็น คั่วเข้ม และ คั่วกลาง',
            category: 'เมนูกาแฟเย็น',
          },
        ],
      ).sales,
    ).toEqual([
      {
        menuItemId: 31,
        menuName: 'อเมริกาโน่เย็น คั่วเข้ม และ คั่วกลาง',
        quantity: 2,
        channel: 'storefront',
      },
    ]);
  });

  it('maps FoodStory columns, totals duplicate menu rows, and retains each channel', () => {
    const result = matchWorkbookSales(
      [
        {
          'Menu Name': 'ชาเขียว ปั่น (Green Tea Frappe)',
          Quantity: 1,
          Channel: 'หน้าร้าน (Storefront)',
        },
        {
          'Menu Name': 'ชาเขียวปั่น',
          Quantity: 2,
          Channel: 'หน้าร้าน (Storefront)',
        },
        {
          'Menu Name': 'ชาไทย ปั่น (Blended Thai Tea)',
          Quantity: 1,
          Channel: 'LINE MAN Delivery',
        },
      ],
      menus,
    );

    expect(result.sales).toEqual([
      {
        menuItemId: 1,
        menuName: 'ชาเขียวปั่น',
        quantity: 3,
        channel: 'storefront',
      },
      { menuItemId: 2, menuName: 'ชาไทยปั่น', quantity: 1, channel: 'lineman' },
    ]);
    expect(result.rowCount).toBe(3);
  });

  it('does not add a row whose name or channel is unsafe to match', () => {
    const result = matchWorkbookSales(
      [
        {
          'Menu Name': 'ไม่รับช้อนส้อมพลาสติก',
          Quantity: 1,
          Channel: 'หน้าร้าน (Storefront)',
        },
        { 'Menu Name': 'ชาเขียวปั่น', Quantity: 1, Channel: 'Marketplace' },
      ],
      menus,
    );

    expect(result.sales).toEqual([]);
    expect(result.unmatchedMenuNames).toEqual(['ไม่รับช้อนส้อมพลาสติก']);
    expect(result.unsupportedChannelMenuNames).toEqual(['ชาเขียวปั่น']);
  });

  it('recognizes the channel values exported by FoodStory', () => {
    expect(channelFromWorkbook('หน้าร้าน (Storefront)')).toBe('storefront');
    expect(channelFromWorkbook('LINE MAN Delivery')).toBe('lineman');
  });

  it('matches FoodStory base names to temperature/roast database names by category', () => {
    const result = matchWorkbookSales(
      [
        {
          'Menu Name': 'อเมริกาโน่ (Ice Americano) - ไม่หวาน 0% x 1,',
          Quantity: 1,
          Channel: 'หน้าร้าน (Storefront)',
          Category: 'กาแฟเย็น',
        },
        {
          'Menu Name': 'มัทฉะลาเต้ (Matcha Latte)',
          Quantity: 1,
          Channel: 'หน้าร้าน (Storefront)',
          Category: 'ชา/นม เย็น',
        },
      ],
      [
        {
          id: 3,
          name: 'อเมริกาโน่เย็น คั่วเข้ม และ คั่วกลาง',
          category: 'เมนูกาแฟเย็น',
        },
        { id: 4, name: 'มัฉฉะลาเต้', category: 'เมนูชา' },
      ],
    );

    expect(result.sales.map(({ menuItemId }) => menuItemId)).toEqual([3, 4]);
    expect(result.unmatchedMenuNames).toEqual([]);
  });

  it('matches the exported Matcha Latte name with English options in parentheses', () => {
    const result = matchWorkbookSales(
      [
        {
          'Menu Name':
            'มัทฉะลาเต้ (Matcha Latte) - ไม่หวาน 0% x 1, - แยกน้ำ x 1,',
          Quantity: 1,
          Channel: 'LINE MAN Delivery',
          Category: 'ชา/นม เย็น',
        },
      ],
      [{ id: 5, name: 'มัทฉะลาเต้', category: 'เมนูชา' }],
    );

    expect(result.sales).toEqual([
      {
        menuItemId: 5,
        menuName: 'มัทฉะลาเต้',
        quantity: 1,
        channel: 'lineman',
      },
    ]);
    expect(result.unmatchedMenuNames).toEqual([]);
  });

  it('prefers the exact Matcha Latte base menu over similarly named variants', () => {
    const result = matchWorkbookSales(
      [
        {
          'Menu Name':
            'มัทฉะลาเต้ (Matcha Latte) - ไม่หวาน 0% x 1, - แยกน้ำ x 1,',
          Quantity: 1,
          Channel: 'LINE MAN Delivery',
          Category: 'ชา/นม เย็น',
        },
      ],
      [
        { id: 5, name: 'มัทฉะลาเต้', category: 'เมนูชา' },
        { id: 6, name: 'มัทฉะลาเต้มะพร้าว', category: 'เมนูชา' },
        { id: 7, name: 'สตรอเบอร์รี่มัทฉะลาเต้', category: 'เมนูชา' },
      ],
    );

    expect(result.sales).toEqual([
      {
        menuItemId: 5,
        menuName: 'มัทฉะลาเต้',
        quantity: 1,
        channel: 'lineman',
      },
    ]);
    expect(result.unmatchedMenuNames).toEqual([]);
  });

  it('reads FoodStory workbook headers and rows from an .xlsx archive', async () => {
    const contents = workbookFile();
    const rows = await readSalesWorkbook({
      arrayBuffer: async () => contents.buffer.slice(0),
    } as File);

    expect(rows).toEqual([
      {
        'Menu Name': 'ชาเขียวปั่น',
        Quantity: '2',
        Channel: 'หน้าร้าน (Storefront)',
      },
    ]);
  });
});
