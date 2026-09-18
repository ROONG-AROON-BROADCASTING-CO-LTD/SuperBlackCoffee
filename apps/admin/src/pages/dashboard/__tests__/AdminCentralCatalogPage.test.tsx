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
  replaceCatalogTemplateMenuRecipes: vi.fn(),
  retireCatalogTemplateInventoryItem: vi.fn(),
  retireCatalogTemplateMenuItem: vi.fn(),
  syncCatalogTemplate: vi.fn(),
  updateCatalogTemplateInventoryItem: vi.fn(),
  updateCatalogTemplateMenuItem: vi.fn(),
}));

const template = {
  id: 21,
  scope: 'sbc' as const,
  size: 'S' as const,
  name: 'แม่แบบ SBC S',
  description: 'น้ำและสต๊อกสำหรับสาขา SBC',
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
          category: 'กาแฟ',
          unit: 'กรัม',
          unitCost: 0.5,
          reorderLevel: 20,
          trackStock: true,
        },
      ],
      menuItems: [
        {
          id: 9,
          name: 'อเมริกาโน่เย็น',
          category: 'กาแฟ',
          storePrice: 75,
          linemanPrice: 85,
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

  it('loads a central template by scope and size and shows its menu data', async () => {
    render(<AdminCentralCatalogPage />);

    expect(
      await screen.findByRole('heading', { name: 'สินค้าและคลังกลาง' }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(mockedListCatalogTemplates).toHaveBeenCalledWith('sbc', 'S'),
    );
    expect(await screen.findByText('อเมริกาโน่เย็น')).toBeTruthy();
    expect(screen.getByText('LINE MAN 85 บาท')).toBeTruthy();
  });

  it('switches the central template scope and size without mixing franchise data into SBC', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.click(screen.getByRole('button', { name: 'แฟรนไชส์' }));
    await waitFor(() =>
      expect(mockedListCatalogTemplates).toHaveBeenLastCalledWith(
        'franchise',
        'S',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'M' }));
    await waitFor(() =>
      expect(mockedListCatalogTemplates).toHaveBeenLastCalledWith(
        'franchise',
        'M',
      ),
    );
  });

  it('previews affected branches and requires confirmation before syncing a template', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.click(screen.getByRole('button', { name: 'ซิงก์ไปยังสาขา' }));
    expect(await screen.findByText('ยืนยันการซิงก์แม่แบบ')).toBeTruthy();
    expect(screen.getByText('อยุธยา')).toBeTruthy();
    expect(screen.getByText('พิษณุโลก')).toBeTruthy();
    expect(mockedSyncCatalogTemplate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันการซิงก์' }));
    await waitFor(() =>
      expect(mockedSyncCatalogTemplate).toHaveBeenCalledWith(21),
    );
    expect(
      await screen.findByText('อัปเดตแม่แบบไปยัง 2 สาขาแล้ว'),
    ).toBeTruthy();
  });

  it('edits central menu data before a later impact preview and sync', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'ราคาหน้าร้าน' }), {
      target: { value: '80' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกแม่แบบ' }));

    await waitFor(() =>
      expect(mockedUpdateCatalogTemplateMenuItem).toHaveBeenCalledWith(21, 9, {
        category: 'กาแฟ',
        storePrice: 80,
        linemanPrice: 85,
        status: 'available',
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
        'บันทึกแม่แบบกลางแล้ว ตรวจผลกระทบก่อนซิงก์ไปยังสาขา',
      ),
    ).toBeTruthy();
    expect(mockedSyncCatalogTemplate).not.toHaveBeenCalled();
  });

  it('edits central inventory defaults without writing a branch stock balance', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.click(screen.getByRole('tab', { name: 'วัตถุดิบและอุปกรณ์' }));
    expect(await screen.findByText('เมล็ดกาแฟ')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'จุดแจ้งเตือน' }), {
      target: { value: '30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกแม่แบบ' }));

    await waitFor(() =>
      expect(mockedUpdateCatalogTemplateInventoryItem).toHaveBeenCalledWith(
        21,
        1,
        {
          category: 'กาแฟ',
          stockCategory: undefined,
          kind: 'ingredient',
          unit: 'กรัม',
          unitCost: 0.5,
          reorderLevel: 30,
          trackStock: true,
        },
      ),
    );
    expect(mockedSyncCatalogTemplate).not.toHaveBeenCalled();
  });

  it('creates a menu in the selected central template before any branch sync', async () => {
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มเมนู' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'ชื่อเมนู' }), {
      target: { value: 'อเมริกาโน่ใหม่' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกแม่แบบ' }));

    await waitFor(() =>
      expect(mockedCreateCatalogTemplateMenuItem).toHaveBeenCalledWith(
        21,
        expect.objectContaining({ name: 'อเมริกาโน่ใหม่' }),
      ),
    );
    expect(mockedReplaceCatalogTemplateMenuRecipes).toHaveBeenCalledWith(
      21,
      10,
      [],
    );
    expect(mockedSyncCatalogTemplate).not.toHaveBeenCalled();
  });

  it('requires confirmation and soft-retires a central menu before branch sync', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AdminCentralCatalogPage />);
    await screen.findByText('อเมริกาโน่เย็น');

    fireEvent.click(screen.getByRole('button', { name: 'นำออก' }));

    await waitFor(() =>
      expect(mockedRetireCatalogTemplateMenuItem).toHaveBeenCalledWith(21, 9),
    );
    expect(mockedSyncCatalogTemplate).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        'นำรายการออกจากแม่แบบแล้ว ตรวจผลกระทบก่อนซิงก์ไปยังสาขา',
      ),
    ).toBeTruthy();
  });
});
