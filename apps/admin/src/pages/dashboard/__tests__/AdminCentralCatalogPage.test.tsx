import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCentralCatalogPage } from '../AdminCentralCatalogPage';
import {
  createCatalogTemplateInventoryItem,
  createCatalogTemplateMenuItem,
  getCatalogTemplate,
  getCatalogTemplateImpact,
  listCatalogTemplates,
  listBranchCatalogSelections,
  setBranchCatalogSelection,
  replaceCatalogTemplateMenuRecipes,
  retireCatalogTemplateInventoryItem,
  retireCatalogTemplateMenuItem,
  syncCatalogTemplate,
  updateCatalogTemplateInventoryItem,
  updateCatalogTemplateMenuItem,
} from '../../../api/catalogTemplates';

vi.mock('../../../api/catalogTemplates', () => ({
  createCatalogTemplateInventoryItem: vi.fn(),
  createCatalogTemplateMenuItem: vi.fn(),
  getCatalogTemplate: vi.fn(),
  getCatalogTemplateImpact: vi.fn(),
  listCatalogTemplates: vi.fn(),
  listBranchCatalogSelections: vi.fn(),
  setBranchCatalogSelection: vi.fn(),
  replaceCatalogTemplateMenuRecipes: vi.fn(),
  retireCatalogTemplateInventoryItem: vi.fn(),
  retireCatalogTemplateMenuItem: vi.fn(),
  syncCatalogTemplate: vi.fn(),
  updateCatalogTemplateInventoryItem: vi.fn(),
  updateCatalogTemplateMenuItem: vi.fn(),
}));

const template = {
  id: 21,
  scope: 'central' as const,
  size: 'ALL' as const,
  name: 'สินค้าและคลังกลาง',
  description: 'ข้อมูลกลางสำหรับทุกสาขา',
  inventoryCount: 5,
  menuCount: 3,
  branchCount: 2,
};

const mockedListCatalogTemplates = vi.mocked(listCatalogTemplates);
const mockedCreateCatalogTemplateInventoryItem = vi.mocked(
  createCatalogTemplateInventoryItem,
);
const mockedCreateCatalogTemplateMenuItem = vi.mocked(
  createCatalogTemplateMenuItem,
);
const mockedGetCatalogTemplate = vi.mocked(getCatalogTemplate);
const mockedGetCatalogTemplateImpact = vi.mocked(getCatalogTemplateImpact);
const mockedSyncCatalogTemplate = vi.mocked(syncCatalogTemplate);
const mockedReplaceCatalogTemplateMenuRecipes = vi.mocked(
  replaceCatalogTemplateMenuRecipes,
);
const mockedRetireCatalogTemplateMenuItem = vi.mocked(
  retireCatalogTemplateMenuItem,
);
const mockedUpdateCatalogTemplateInventoryItem = vi.mocked(
  updateCatalogTemplateInventoryItem,
);
const mockedUpdateCatalogTemplateMenuItem = vi.mocked(
  updateCatalogTemplateMenuItem,
);

describe('AdminCentralCatalogPage', () => {
  beforeEach(() => {
    mockedListCatalogTemplates.mockResolvedValue([template]);
    mockedGetCatalogTemplate.mockResolvedValue({
      ...template,
      inventoryItems: [
        {
          id: 1,
          name: 'เมล็ดกาแฟ',
          imageUrl: '/images/coffee-beans.jpg',
          category: 'กาแฟ',
          kind: 'ingredient',
          unit: 'กรัม',
          unitCost: 0.5,
          reorderLevel: 20,
          trackStock: true,
          availableSizes: ['S', 'M'],
        },
      ],
      menuItems: [
        {
          id: 9,
          name: 'อเมริกาโน่เย็น',
          imageUrl: '/images/americano.jpg',
          category: 'กาแฟ',
          storePrice: 75,
          linemanPrice: 85,
          availableSizes: ['S', 'M'],
          recipes: [
            {
              catalogItemId: 1,
              name: 'เมล็ดกาแฟ',
              channel: 'storefront',
              quantity: 18,
              unit: 'กรัม',
              costAmount: 9,
            },
          ],
        },
      ],
    });
    mockedGetCatalogTemplateImpact.mockResolvedValue({
      template,
      count: 2,
      branches: [
        { id: 5, name: 'อยุธยา', code: 'SBC-AYA-001', size: 'S' },
        { id: 6, name: 'พิษณุโลก', code: 'SBC-PLK-001', size: 'S' },
      ],
    });
    vi.mocked(listBranchCatalogSelections).mockResolvedValue([]);
    vi.mocked(setBranchCatalogSelection).mockResolvedValue({
      entityType: 'menu',
      sourceKey: 9,
      enabled: false,
    });
    mockedSyncCatalogTemplate.mockResolvedValue({
      syncedBranches: 2,
      template,
    });
    mockedUpdateCatalogTemplateInventoryItem.mockResolvedValue({ id: 1 });
    mockedUpdateCatalogTemplateMenuItem.mockResolvedValue({ id: 9 });
    mockedCreateCatalogTemplateInventoryItem.mockResolvedValue({ id: 2 });
    mockedCreateCatalogTemplateMenuItem.mockResolvedValue({ id: 10 });
    mockedReplaceCatalogTemplateMenuRecipes.mockResolvedValue({
      id: 9,
      recipeCount: 1,
    });
    vi.mocked(retireCatalogTemplateInventoryItem).mockResolvedValue({
      id: 1,
      retired: true,
    });
    mockedRetireCatalogTemplateMenuItem.mockResolvedValue({
      id: 9,
      retired: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads a single central catalog and shows its menu data', async () => {
    render(<AdminCentralCatalogPage />);

    expect(
      await screen.findByRole('heading', { name: 'เมนูและสินค้ากลาง' }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(mockedListCatalogTemplates).toHaveBeenCalledWith(),
    );
    expect(await screen.findByText('อเมริกาโน่เย็น')).toBeTruthy();
    expect(
      screen.getByRole('columnheader', { name: 'ราคาหน้าร้าน' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('columnheader', { name: 'ราคา LINE MAN' }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('img', { name: 'รูปอเมริกาโน่เย็น' })
        .getAttribute('src'),
    ).toBe('/images/americano.jpg');
    expect(screen.getByText('85 บาท')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ทุกขนาด' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ขนาด S' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ขนาด M' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ขนาด L' })).toBeTruthy();
  });

  it('aligns inventory columns with cost and reorder data and shows its image', async () => {
    render(<AdminCentralCatalogPage section="ingredients" />);

    expect(await screen.findByText('เมล็ดกาแฟ')).toBeTruthy();
    expect(
      screen.getByRole('columnheader', { name: 'ต้นทุนต่อหน่วย' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('columnheader', { name: 'จุดสั่งซื้อ' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('img', { name: 'รูปเมล็ดกาแฟ' }).getAttribute('src'),
    ).toBe('/images/coffee-beans.jpg');
    expect(screen.getByText('20 กรัม')).toBeTruthy();
  });

  it.each([
    ['ingredients', 'เมล็ดกาแฟ'],
    ['fresh-ingredients', 'นมสด'],
    ['drink-equipment', 'แก้ว'],
    ['postal-equipment', 'กล่องพัสดุ'],
  ] as const)(
    'shows only %s in its own central catalog page',
    async (section, expectedName) => {
      const base = await mockedGetCatalogTemplate(21);
      mockedGetCatalogTemplate.mockResolvedValue({
        ...base,
        inventoryItems: [
          ...base.inventoryItems,
          { ...base.inventoryItems[0], id: 2, name: 'นมสด', category: 'fresh' },
          {
            ...base.inventoryItems[0],
            id: 3,
            name: 'แก้ว',
            kind: 'stock',
            stockCategory: 'drink_equipment',
          },
          {
            ...base.inventoryItems[0],
            id: 4,
            name: 'กล่องพัสดุ',
            kind: 'stock',
            stockCategory: 'postal_equipment',
          },
        ],
      });

      render(<AdminCentralCatalogPage section={section} />);

      expect(await screen.findByText(expectedName)).toBeTruthy();
      for (const otherName of [
        'เมล็ดกาแฟ',
        'นมสด',
        'แก้ว',
        'กล่องพัสดุ',
      ].filter((name) => name !== expectedName)) {
        expect(screen.queryByText(otherName)).toBeNull();
      }
      expect(screen.queryByText('อเมริกาโน่เย็น')).toBeNull();
    },
  );

  it.each([
    ['ingredients', 'วัตถุดิบ', 'ingredient', undefined, 'other'],
    ['fresh-ingredients', 'วัตถุดิบของสด', 'ingredient', undefined, 'fresh'],
    [
      'drink-equipment',
      'อุปกรณ์เครื่องดื่ม',
      'stock',
      'drink_equipment',
      'other',
    ],
    [
      'postal-equipment',
      'อุปกรณ์ไปรษณีย์',
      'stock',
      'postal_equipment',
      'other',
    ],
  ] as const)(
    'opens the branch-style drawer and creates a %s catalog item without a branch balance',
    async (section, label, kind, stockCategory, category) => {
      render(<AdminCentralCatalogPage section={section} />);
      fireEvent.click(
        await screen.findByRole('button', { name: `+ เพิ่ม${label}กลาง` }),
      );
      expect(
        screen.getByText(`กรอกข้อมูล${label}เพื่อเพิ่มเข้าคลังกลาง`),
      ).toBeTruthy();
      expect(screen.getByText(`เพิ่มรูป${label}`)).toBeTruthy();
      expect(
        screen.getByRole('spinbutton', { name: 'ต้นทุนต่อหน่วย' }),
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'ขนาด S' })).toBeTruthy();
      expect(
        screen.queryByRole('spinbutton', { name: 'จำนวนคงเหลือ' }),
      ).toBeNull();

      fireEvent.change(screen.getByRole('textbox', { name: `ชื่อ${label}` }), {
        target: { value: `${label}ทดสอบ` },
      });
      fireEvent.submit(
        screen.getByRole('button', { name: `บันทึก${label}` }).closest('form')!,
      );
      await waitFor(() =>
        expect(mockedCreateCatalogTemplateInventoryItem).toHaveBeenCalledWith(
          21,
          expect.objectContaining({
            name: `${label}ทดสอบ`,
            category,
            kind,
            stockCategory,
            imageUrl: '',
            availableSizes: ['S', 'M', 'L'],
          }),
        ),
      );
      expect(mockedSyncCatalogTemplate).not.toHaveBeenCalled();
    },
  );

  it('shows a retry action when the central catalog cannot be loaded', async () => {
    mockedListCatalogTemplates
      .mockRejectedValueOnce(new Error('โหลดข้อมูลกลางไม่สำเร็จ'))
      .mockResolvedValueOnce([template]);

    render(<AdminCentralCatalogPage />);
    expect(await screen.findByText('โหลดข้อมูลกลางไม่สำเร็จ')).toBeTruthy();
    expect(screen.queryByText('อเมริกาโน่เย็น')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }));
    expect(await screen.findByText('อเมริกาโน่เย็น')).toBeTruthy();
    expect(mockedListCatalogTemplates).toHaveBeenCalledTimes(2);
  });

  it('filters the same central catalog by size without reloading a different template', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.click(screen.getByRole('button', { name: 'ขนาด M' }));
    expect(screen.getByText('อเมริกาโน่เย็น')).toBeTruthy();
    expect(mockedListCatalogTemplates).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'ขนาด L' }));
    expect(screen.queryByText('อเมริกาโน่เย็น')).toBeNull();
  });

  it('searches central items and restores the full list when cleared', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.change(screen.getByPlaceholderText('ค้นหารายการกลาง'), {
      target: { value: 'ไม่พบรายการนี้' },
    });
    expect(screen.queryByText('อเมริกาโน่เย็น')).toBeNull();
    expect(screen.getByText(/ที่ตรงกับตัวกรอง/)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('ค้นหารายการกลาง'), {
      target: { value: 'อเมริกาโน่' },
    });
    expect(screen.getByText('อเมริกาโน่เย็น')).toBeTruthy();
  });

  it('paginates long catalog lists without hiding later items', async () => {
    const base = await mockedGetCatalogTemplate(21);
    mockedGetCatalogTemplate.mockResolvedValue({
      ...base,
      menuItems: Array.from({ length: 12 }, (_, index) => ({
        ...base.menuItems[0],
        id: index + 1,
        name: `เมนูทดสอบ ${index + 1}`,
      })),
    });
    render(<AdminCentralCatalogPage />);
    await screen.findByText('เมนูทดสอบ 1');
    expect(screen.queryByText('เมนูทดสอบ 12')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
    expect(screen.getByText('เมนูทดสอบ 12')).toBeTruthy();
    expect(screen.queryByText('เมนูทดสอบ 1')).toBeNull();
    expect(screen.getByText('2/2')).toBeTruthy();
  });

  it('saves size membership on a central menu item', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
    fireEvent.click(screen.getByRole('button', { name: 'ขนาด L' }));
    fireEvent.submit(
      screen.getByRole('button', { name: 'บันทึกการแก้ไข' }).closest('form')!,
    );
    await waitFor(() =>
      expect(mockedUpdateCatalogTemplateMenuItem).toHaveBeenCalledWith(
        21,
        9,
        expect.objectContaining({ availableSizes: ['S', 'M', 'L'] }),
      ),
    );
  });

  it('rejects an empty menu price instead of silently saving it as zero', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'ราคาขายหน้าร้าน' }),
      {
        target: { value: '' },
      },
    );
    fireEvent.submit(
      screen.getByRole('button', { name: 'บันทึกการแก้ไข' }).closest('form')!,
    );

    expect(
      screen.getByText('ราคาและจุดแจ้งเตือนต้องเป็นเลขศูนย์หรือมากกว่า'),
    ).toBeTruthy();
    expect(mockedUpdateCatalogTemplateMenuItem).not.toHaveBeenCalled();
  });

  it('can disable one branch menu without editing the shared catalog', async () => {
    render(<AdminCentralCatalogPage section="branches" />);
    await screen.findByRole('heading', {
      name: 'รายการสาขาและแฟรนไชส์',
    });
    expect(
      await screen.findByRole('button', { name: 'เปิดข้อมูลกลาง' }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(mockedGetCatalogTemplateImpact).toHaveBeenCalledWith(21),
    );
    expect(
      screen.getByRole('combobox', { name: 'สาขา' }).textContent,
    ).toContain('กรุณาเลือกสาขา');
    const emptyBranchTable = screen.getByRole('table', {
      name: 'รายการที่ใช้ในสาขา',
    });
    expect(emptyBranchTable.textContent).toContain(
      'กรุณาเลือกสาขาเพื่อแสดงรายการ',
    );
    expect(
      screen.queryByRole('switch', { name: 'อเมริกาโน่เย็น สำหรับสาขา' }),
    ).toBeNull();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'สาขา' }));
    fireEvent.click(
      await screen.findByRole('option', { name: 'อยุธยา · SBC-AYA-001 · S' }),
    );
    const branchTable = await screen.findByRole('table', {
      name: 'รายการที่ใช้ในสาขา',
    });
    expect(branchTable.querySelectorAll('thead th')).toHaveLength(5);
    const menuRow = screen.getByRole('row', { name: /อเมริกาโน่เย็น/ });
    expect(menuRow.textContent).toContain('ใช้กับขนาด S / M');
    expect(menuRow.textContent).toContain('กาแฟ');
    expect(menuRow.querySelector('img')?.getAttribute('src')).toBe(
      '/images/americano.jpg',
    );
    fireEvent.click(
      await screen.findByRole('switch', {
        name: 'อเมริกาโน่เย็น สำหรับสาขา',
      }),
    );
    await waitFor(() =>
      expect(setBranchCatalogSelection).toHaveBeenCalledWith(
        5,
        'menu',
        9,
        false,
      ),
    );
    expect(mockedUpdateCatalogTemplateMenuItem).not.toHaveBeenCalled();
  });

  it('keeps a branch item enabled and reports an error when its selection update fails', async () => {
    vi.mocked(setBranchCatalogSelection).mockRejectedValueOnce(
      new Error('บันทึกรายการสาขาไม่สำเร็จ'),
    );
    render(<AdminCentralCatalogPage section="branches" />);
    await screen.findByRole('heading', {
      name: 'รายการสาขาและแฟรนไชส์',
    });
    await waitFor(() =>
      expect(mockedGetCatalogTemplateImpact).toHaveBeenCalledWith(21),
    );
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'สาขา' }));
    fireEvent.click(
      await screen.findByRole('option', { name: 'อยุธยา · SBC-AYA-001 · S' }),
    );
    const selection = await screen.findByRole('switch', {
      name: 'อเมริกาโน่เย็น สำหรับสาขา',
    });
    expect((selection as HTMLInputElement).checked).toBe(true);

    fireEvent.click(selection);

    expect(await screen.findByText('บันทึกรายการสาขาไม่สำเร็จ')).toBeTruthy();
    expect((selection as HTMLInputElement).checked).toBe(true);
    expect(mockedUpdateCatalogTemplateMenuItem).not.toHaveBeenCalled();
  });

  it('prevents branch edits while selections fail to load and offers a retry', async () => {
    vi.mocked(listBranchCatalogSelections)
      .mockRejectedValueOnce(new Error('โหลดรายการของสาขาไม่สำเร็จ'))
      .mockResolvedValueOnce([]);
    render(<AdminCentralCatalogPage section="branches" />);
    await screen.findByRole('heading', { name: 'รายการที่ใช้รายสาขา' });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'สาขา' }));
    fireEvent.click(
      await screen.findByRole('option', { name: 'อยุธยา · SBC-AYA-001 · S' }),
    );

    const retry = await screen.findByRole('button', {
      name: 'ลองโหลดรายการอีกครั้ง',
    });
    expect(
      screen.queryByRole('switch', { name: 'อเมริกาโน่เย็น สำหรับสาขา' }),
    ).toBeNull();
    fireEvent.click(retry);

    expect(
      await screen.findByRole('switch', { name: 'อเมริกาโน่เย็น สำหรับสาขา' }),
    ).toBeTruthy();
    expect(listBranchCatalogSelections).toHaveBeenCalledTimes(2);
  });

  it('previews affected branches and requires confirmation before syncing a template', async () => {
    render(<AdminCentralCatalogPage section="sync" />);
    await screen.findByRole('heading', {
      name: 'รายการสาขาและแฟรนไชส์',
    });
    expect(
      await screen.findByRole('heading', { name: 'รายการที่ใช้รายสาขา' }),
    ).toBeTruthy();
    await screen.findByRole('button', { name: 'เปิดข้อมูลกลาง' });

    fireEvent.click(screen.getByRole('button', { name: 'เปิดข้อมูลกลาง' }));
    expect(await screen.findByText('กระจายการเปลี่ยนแปลง')).toBeTruthy();
    await screen.findByRole('button', { name: 'ซิงก์ไปยังสาขา' });

    fireEvent.click(screen.getByRole('button', { name: 'ซิงก์ไปยังสาขา' }));
    expect(await screen.findByText('ยืนยันการซิงก์ข้อมูลกลาง')).toBeTruthy();
    expect(screen.getByText('อยุธยา')).toBeTruthy();
    expect(screen.getByText('พิษณุโลก')).toBeTruthy();
    expect(mockedSyncCatalogTemplate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันการซิงก์' }));
    await waitFor(() =>
      expect(mockedSyncCatalogTemplate).toHaveBeenCalledWith(21),
    );
    expect(
      await screen.findByText('อัปเดตข้อมูลกลางไปยัง 2 สาขาแล้ว'),
    ).toBeTruthy();
  });

  it('opens an impact overlay without starting a sync', async () => {
    render(<AdminCentralCatalogPage section="branches" />);
    await screen.findByRole('button', { name: 'เปิดข้อมูลกลาง' });

    fireEvent.click(screen.getByRole('button', { name: 'เปิดข้อมูลกลาง' }));
    expect(await screen.findByText('รายการเมนูจากข้อมูลกลาง')).toBeTruthy();
    await screen.findByRole('button', { name: 'ดูผลกระทบ' });

    fireEvent.click(screen.getByRole('button', { name: 'ดูผลกระทบ' }));

    expect(
      await screen.findByRole('heading', { name: 'ผลกระทบของข้อมูลกลาง' }),
    ).toBeTruthy();
    expect(screen.getByText('อยุธยา')).toBeTruthy();
    expect(screen.getByText('พิษณุโลก')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ปิด' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ยืนยันการซิงก์' })).toBeNull();
    expect(mockedSyncCatalogTemplate).not.toHaveBeenCalled();
  });

  it('edits central menu data before a later impact preview and sync', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'ราคาขายหน้าร้าน' }),
      {
        target: { value: '80' },
      },
    );
    fireEvent.submit(
      screen.getByRole('button', { name: 'บันทึกการแก้ไข' }).closest('form')!,
    );

    await waitFor(() =>
      expect(mockedUpdateCatalogTemplateMenuItem).toHaveBeenCalledWith(21, 9, {
        category: 'กาแฟ',
        storePrice: 80,
        costPrice: 0,
        linemanCostPrice: 0,
        imageUrl: '/images/americano.jpg',
        linemanPrice: 85,
        status: 'available',
        availableSizes: ['S', 'M'],
      }),
    );
    expect(mockedReplaceCatalogTemplateMenuRecipes).toHaveBeenCalledWith(
      21,
      9,
      [
        {
          catalogItemId: 1,
          channel: 'storefront',
          quantity: 18,
          unit: 'กรัม',
          costAmount: 9,
        },
      ],
    );
    expect(
      await screen.findByText(
        'บันทึกข้อมูลกลางแล้ว ตรวจผลกระทบก่อนซิงก์ไปยังสาขา',
      ),
    ).toBeTruthy();
    expect(mockedSyncCatalogTemplate).not.toHaveBeenCalled();
  });

  it('keeps a completed menu edit successful when its follow-up refresh fails', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
    mockedGetCatalogTemplate.mockRejectedValueOnce(new Error('Network Error'));
    fireEvent.submit(
      screen.getByRole('button', { name: 'บันทึกการแก้ไข' }).closest('form')!,
    );

    await waitFor(() =>
      expect(mockedUpdateCatalogTemplateMenuItem).toHaveBeenCalledWith(
        21,
        9,
        expect.any(Object),
      ),
    );
    expect(
      await screen.findByText(
        'บันทึกข้อมูลกลางแล้ว ตรวจผลกระทบก่อนซิงก์ไปยังสาขา',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Network Error')).toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'แก้ไขเมนูและสินค้า' }),
    ).toBeNull();
  });

  it('edits central inventory defaults without writing a branch stock balance', async () => {
    render(<AdminCentralCatalogPage section="ingredients" />);
    expect(await screen.findByText('เมล็ดกาแฟ')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'แจ้งเตือนเมื่อคงเหลือ' }),
      {
        target: { value: '30' },
      },
    );
    fireEvent.submit(
      screen.getByRole('button', { name: 'บันทึกการแก้ไข' }).closest('form')!,
    );

    await waitFor(() =>
      expect(mockedUpdateCatalogTemplateInventoryItem).toHaveBeenCalledWith(
        21,
        1,
        {
          category: 'กาแฟ',
          imageUrl: '/images/coffee-beans.jpg',
          stockCategory: undefined,
          kind: 'ingredient',
          unit: 'กรัม',
          unitCost: 0.5,
          reorderLevel: 30,
          trackStock: true,
          availableSizes: ['S', 'M'],
        },
      ),
    );
    expect(mockedSyncCatalogTemplate).not.toHaveBeenCalled();
  });

  it('edits equipment through its own drawer and retains its image and stock category', async () => {
    const base = await mockedGetCatalogTemplate(21);
    mockedGetCatalogTemplate.mockResolvedValue({
      ...base,
      inventoryItems: [
        {
          ...base.inventoryItems[0],
          id: 3,
          name: 'แก้วกระดาษ',
          imageUrl: '/images/cup.jpg',
          category: 'cup',
          kind: 'stock',
          stockCategory: 'drink_equipment',
          unit: 'ใบ',
        },
      ],
    });
    render(<AdminCentralCatalogPage section="drink-equipment" />);
    await screen.findByText('แก้วกระดาษ');

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
    expect(screen.getByText('แก้ไขอุปกรณ์เครื่องดื่ม')).toBeTruthy();
    expect(
      screen
        .getByRole('img', { name: 'ตัวอย่างรูปอุปกรณ์เครื่องดื่ม' })
        .getAttribute('src'),
    ).toBe('/images/cup.jpg');
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'ต้นทุนต่อหน่วย' }),
      {
        target: { value: '2.5' },
      },
    );
    fireEvent.submit(
      screen.getByRole('button', { name: 'บันทึกการแก้ไข' }).closest('form')!,
    );

    await waitFor(() =>
      expect(mockedUpdateCatalogTemplateInventoryItem).toHaveBeenCalledWith(
        21,
        3,
        expect.objectContaining({
          imageUrl: '/images/cup.jpg',
          category: 'cup',
          kind: 'stock',
          stockCategory: 'drink_equipment',
          unitCost: 2.5,
        }),
      ),
    );
    expect(mockedSyncCatalogTemplate).not.toHaveBeenCalled();
  });

  it('creates a menu in the selected central template before any branch sync', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.click(screen.getByRole('button', { name: /เพิ่มเมนู/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'ชื่อสินค้า' }), {
      target: { value: 'อเมริกาโน่ใหม่' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ขนาด M' }));
    fireEvent.submit(
      screen.getByRole('button', { name: 'บันทึกสินค้า' }).closest('form')!,
    );

    await waitFor(() =>
      expect(mockedCreateCatalogTemplateMenuItem).toHaveBeenCalledWith(
        21,
        expect.objectContaining({ name: 'อเมริกาโน่ใหม่' }),
      ),
    );
    expect(mockedReplaceCatalogTemplateMenuRecipes).not.toHaveBeenCalled();
    expect(mockedSyncCatalogTemplate).not.toHaveBeenCalled();
  });

  it('creates a menu without ingredients or a recipe request', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.click(screen.getByRole('button', { name: /เพิ่มเมนู/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'ชื่อสินค้า' }), {
      target: { value: 'โค้กไม่มีสูตร' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ขนาด S' }));
    fireEvent.submit(
      screen.getByRole('button', { name: 'บันทึกสินค้า' }).closest('form')!,
    );

    expect(
      await screen.findByText(
        'บันทึกข้อมูลกลางแล้ว ตรวจผลกระทบก่อนซิงก์ไปยังสาขา',
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: 'เพิ่มเมนูและสินค้า' }),
    ).toBeNull();
    expect(mockedReplaceCatalogTemplateMenuRecipes).not.toHaveBeenCalled();
  });

  it('keeps a new menu editable and does not report success when creation fails', async () => {
    mockedCreateCatalogTemplateMenuItem.mockRejectedValueOnce(
      new Error('ไม่สามารถบันทึกเมนูได้'),
    );
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.click(screen.getByRole('button', { name: /เพิ่มเมนู/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'ชื่อสินค้า' }), {
      target: { value: 'โค้ก' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ขนาด S' }));
    fireEvent.submit(
      screen.getByRole('button', { name: 'บันทึกสินค้า' }).closest('form')!,
    );

    expect(await screen.findByText('ไม่สามารถบันทึกเมนูได้')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'เพิ่มเมนูและสินค้า' }),
    ).toBeTruthy();
    expect(
      (screen.getByRole('textbox', { name: 'ชื่อสินค้า' }) as HTMLInputElement)
        .value,
    ).toBe('โค้ก');
    expect(
      screen.queryByText('บันทึกข้อมูลกลางแล้ว ตรวจผลกระทบก่อนซิงก์ไปยังสาขา'),
    ).toBeNull();
  });

  it('requires an explicitly selected branch size and supports an ingredient-free soda menu', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.click(screen.getByRole('button', { name: /เพิ่มเมนู/ }));
    expect(screen.getByRole('button', { name: 'บันทึกสินค้า' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(
      screen.getByText('เลือกขนาดอย่างน้อย 1 ขนาดก่อนบันทึกสินค้า'),
    ).toBeTruthy();
    expect(
      screen.getByText('ยังไม่มีสูตรหรือส่วนผสม — สามารถบันทึกสินค้าได้'),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: 'ไม่มีสูตร/ส่วนผสม' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'หมวดหมู่' }));
    fireEvent.click(
      await screen.findByRole('option', { name: 'เมนูน้ำอัดลม' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'ขนาด L' }));
    expect(screen.getByRole('button', { name: 'บันทึกสินค้า' })).toHaveProperty(
      'disabled',
      false,
    );
    expect(
      screen.getByText('เลือกขนาดอย่างน้อย 1 ขนาดก่อนบันทึกสินค้า'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '+ เพิ่มส่วนผสม' }));
    expect(
      screen
        .getByRole('button', { name: '+ เพิ่มส่วนผสม' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: 'ไม่มีสูตร/ส่วนผสม' })
        .getAttribute('aria-pressed'),
    ).toBe('false');
    expect(
      (screen.getByRole('spinbutton', { name: 'ปริมาณ' }) as HTMLInputElement)
        .value,
    ).toBe('0');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'วัตถุดิบ' }));
    expect(
      await screen.findByRole('option', { name: 'กรุณาเลือกวัตถุดิบ' }),
    ).toBeTruthy();
  });

  it('requires confirmation and soft-retires a central menu before branch sync', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.click(screen.getByRole('button', { name: 'นำออก' }));

    expect(screen.getByText('ยืนยันการนำรายการออก?')).toBeTruthy();
    expect(mockedRetireCatalogTemplateMenuItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }));

    await waitFor(() =>
      expect(mockedRetireCatalogTemplateMenuItem).toHaveBeenCalledWith(21, 9),
    );
    expect(mockedSyncCatalogTemplate).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        'นำรายการออกจากข้อมูลกลางแล้ว ตรวจผลกระทบก่อนซิงก์ไปยังสาขา',
      ),
    ).toBeTruthy();
  });

  it('does not retire a central menu when removal is cancelled', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.click(screen.getByRole('button', { name: 'นำออก' }));
    expect(screen.getByText('ยืนยันการนำรายการออก?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }));

    expect(screen.queryByText('ยืนยันการนำรายการออก?')).toBeNull();
    expect(mockedRetireCatalogTemplateMenuItem).not.toHaveBeenCalled();
    expect(mockedSyncCatalogTemplate).not.toHaveBeenCalled();
    expect(screen.getByText('อเมริกาโน่เย็น')).toBeTruthy();
  });

  it('requires confirmation before retiring an inventory item without syncing branches', async () => {
    render(<AdminCentralCatalogPage section="ingredients" />);
    await screen.findByText('เมล็ดกาแฟ');

    fireEvent.click(screen.getByRole('button', { name: 'นำออก' }));
    expect(screen.getByText('ยืนยันการนำรายการออก?')).toBeTruthy();
    expect(retireCatalogTemplateInventoryItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }));

    await waitFor(() =>
      expect(retireCatalogTemplateInventoryItem).toHaveBeenCalledWith(21, 1),
    );
    expect(mockedRetireCatalogTemplateMenuItem).not.toHaveBeenCalled();
    expect(mockedSyncCatalogTemplate).not.toHaveBeenCalled();
  });
});
