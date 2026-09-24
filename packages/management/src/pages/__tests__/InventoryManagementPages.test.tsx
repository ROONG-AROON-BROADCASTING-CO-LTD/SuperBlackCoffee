import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IngredientsManagementPage } from '../IngredientsManagementPage';
import { ProductsManagementPage } from '../ProductsManagementPage';
import { StockManagementPage } from '../StockManagementPage';
import {
  adjustInventory,
  createInventory,
  deleteInventory,
  listFreshInventoryLots,
  listInventory,
  updateInventory,
} from '../../api/inventory';
import {
  createMenuItem,
  listMenuItems,
  listMenuSummary,
  updateMenuItem,
} from '../../api/menu';
import { createStockRequest } from '../../api/stock-requests';

vi.mock('../../api/inventory', () => ({
  adjustInventory: vi.fn(),
  createInventory: vi.fn(),
  deleteInventory: vi.fn(),
  discardFreshInventoryLot: vi.fn(),
  listFreshInventoryLots: vi.fn(),
  listInventory: vi.fn(),
  receiveFreshInventoryLot: vi.fn(),
  updateInventory: vi.fn(),
}));
vi.mock('../../api/menu', () => ({
  createMenuItem: vi.fn(),
  listMenuItems: vi.fn(),
  listMenuSummary: vi.fn(),
  updateMenuItem: vi.fn(),
}));
vi.mock('../../api/stock-requests', () => ({ createStockRequest: vi.fn() }));

const mockedListInventory = vi.mocked(listInventory);
const mockedAdjustInventory = vi.mocked(adjustInventory);
const mockedCreateInventory = vi.mocked(createInventory);
const mockedDeleteInventory = vi.mocked(deleteInventory);
const mockedListFreshInventoryLots = vi.mocked(listFreshInventoryLots);
const mockedUpdateInventory = vi.mocked(updateInventory);
const mockedListMenuItems = vi.mocked(listMenuItems);
const mockedListMenuSummary = vi.mocked(listMenuSummary);
const mockedCreateMenuItem = vi.mocked(createMenuItem);
const mockedUpdateMenuItem = vi.mocked(updateMenuItem);
const mockedCreateStockRequest = vi.mocked(createStockRequest);

const ingredient = {
  id: 1,
  name: 'เมล็ดกาแฟทดสอบ',
  category: 'coffee',
  kind: 'ingredient' as const,
  quantity: 4,
  unit: 'ถุง',
  reorderLevel: 5,
  unitCost: 125,
  status: 'low' as const,
  imageUrl: '',
  expiryDate: '2026-12-31',
  expiryStatus: 'expiring_soon' as const,
};

const renderPage = (page: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{page}</QueryClientProvider>,
  );
};

describe('inventory management pages', () => {
  beforeEach(() => {
    mockedListInventory.mockImplementation(async (kind) =>
      kind === 'ingredient' ? [ingredient] : [{ ...ingredient, kind: 'stock' }],
    );
    mockedListMenuItems.mockResolvedValue([
      {
        id: 1,
        name: 'อเมริกาโน่ทดสอบ',
        category: 'เมนูกาแฟเย็น',
        storePrice: 60,
        storePriceAvailable: true,
        linemanPrice: 70,
        linemanPriceAvailable: true,
        linemanCostPrice: 50,
        costPrice: 40,
        status: 'available',
        ingredients: [
          {
            inventoryItemId: ingredient.id,
            name: ingredient.name,
            quantity: 18,
            unit: 'กรัม',
            costAmount: 12,
          },
        ],
        preparationSteps: '1. สกัดกาแฟ\n2. จัดเสิร์ฟ',
        imageUrl: '',
      },
    ]);
    mockedCreateStockRequest.mockResolvedValue({ id: 1, status: 'pending' });
    mockedAdjustInventory.mockResolvedValue({ id: 1, quantity: 0 });
    mockedCreateInventory.mockResolvedValue({ id: 2 });
    mockedDeleteInventory.mockResolvedValue(undefined);
    mockedListFreshInventoryLots.mockResolvedValue([]);
    mockedUpdateInventory.mockResolvedValue({ id: 1 });
    mockedCreateMenuItem.mockResolvedValue({ id: 2 });
    mockedUpdateMenuItem.mockResolvedValue({ id: 1 });
    mockedListMenuSummary.mockResolvedValue({
      items: [
        {
          branchCode: 'SBC-AYA-001',
          branchName: 'อยุธยา',
          menuCount: 87,
          availableCount: 80,
        },
        {
          branchCode: 'SBC-PLK-001',
          branchName: 'พิษณุโลก',
          menuCount: 135,
          availableCount: 120,
        },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    });
  });

  it('opens lot management for fresh ingredients before allowing stock changes', async () => {
    mockedListInventory.mockResolvedValueOnce([
      { ...ingredient, category: 'fresh', name: 'ผักสลัดทดสอบ' },
    ]);

    renderPage(
      <IngredientsManagementPage
        activeBranch="อยุธยา"
        ingredientScope="fresh"
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'จัดการล็อตของสด' }),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'จัดการล็อตของสด' }));

    await waitFor(() =>
      expect(mockedListFreshInventoryLots).toHaveBeenCalledWith(
        1,
        'SBC-AYA-001',
      ),
    );
    expect(screen.getByText('รับล็อตใหม่')).toBeTruthy();
    expect(screen.getByText(/ตัดตามล็อตที่หมดอายุก่อน/)).toBeTruthy();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows only permitted product controls and categories for a read-only S franchise', async () => {
    renderPage(
      <ProductsManagementPage
        activeBranch="อยุธยา"
        franchisePlan="S"
        readOnly
      />,
    );

    await waitFor(() =>
      expect(screen.getByText('อเมริกาโน่ทดสอบ')).toBeTruthy(),
    );

    expect(
      screen.queryByRole('button', { name: 'เพิ่มเมนูและสินค้า' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'อาหาร' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'เบเกอรี่' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'ดูสูตรการทำ' }));
    expect(screen.getByText('สูตรการทำ')).toBeTruthy();
    expect(screen.getByText(`1. ${ingredient.name}`)).toBeTruthy();
    expect(screen.getByText(/1\. สกัดกาแฟ/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'บันทึกสูตรการทำ' }),
    ).toBeNull();
  });

  it('saves a recipe from the Admin product card', async () => {
    renderPage(<ProductsManagementPage activeBranch="อยุธยา" />);

    await waitFor(() =>
      expect(screen.getByText('อเมริกาโน่ทดสอบ')).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'จัดการสูตรการทำ' }));
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกสูตรการทำ' }));

    await waitFor(() =>
      expect(mockedUpdateMenuItem).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'อเมริกาโน่ทดสอบ',
          ingredients: [
            {
              inventoryItemId: ingredient.id,
              quantity: 18,
              unit: 'กรัม',
            },
          ],
          preparationSteps: '1. สกัดกาแฟ\n2. จัดเสิร์ฟ',
        }),
        'SBC-AYA-001',
      ),
    );
  });

  it('loads only a paginated summary until a branch is selected', async () => {
    const onSelectBranch = vi.fn();
    renderPage(
      <ProductsManagementPage
        activeBranch="ทุกสาขา"
        onSelectBranch={onSelectBranch}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText('87 เมนู · เปิดขาย 80')).toBeTruthy(),
    );
    expect(mockedListMenuSummary).toHaveBeenCalledWith('sbc', 1);
    expect(mockedListMenuItems).not.toHaveBeenCalled();
    expect(mockedListInventory).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getAllByRole('button', { name: 'ดูเมนูและสินค้า' })[0],
    );
    expect(onSelectBranch).toHaveBeenCalledWith('อยุธยา', 'SBC-AYA-001');
  });

  it('requests only the selected page of branch summaries', async () => {
    mockedListMenuSummary.mockImplementation(async (_scope, page) => ({
      items: [
        {
          branchCode: `SBC-${page}`,
          branchName: `สาขา ${page}`,
          menuCount: page,
          availableCount: page,
        },
      ],
      total: 21,
      page,
      pageSize: 20,
    }));
    renderPage(<ProductsManagementPage activeBranch="ทุกสาขา" />);
    await waitFor(() =>
      expect(screen.getByText('1 เมนู · เปิดขาย 1')).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
    await waitFor(() =>
      expect(mockedListMenuSummary).toHaveBeenCalledWith('sbc', 2),
    );
    expect(mockedListMenuItems).not.toHaveBeenCalled();
  });

  it('shows a summary error without loading all menus when the request fails', async () => {
    mockedListMenuSummary.mockRejectedValueOnce(
      new Error('network unavailable'),
    );
    renderPage(<ProductsManagementPage activeBranch="ทุกสาขา" />);

    await waitFor(() =>
      expect(mockedListMenuSummary).toHaveBeenCalledWith('sbc', 1),
    );
    expect(mockedListMenuItems).not.toHaveBeenCalled();
    expect(mockedListInventory).not.toHaveBeenCalled();
    expect(await screen.findByText('โหลดข้อมูลสรุปเมนูไม่สำเร็จ')).toBeTruthy();
  });

  it('shows store and LINE MAN pricing on separate product card views', async () => {
    renderPage(<ProductsManagementPage activeBranch="อยุธยา" />);

    await waitFor(() =>
      expect(screen.getByText('ต้นทุน หน้าร้าน')).toBeTruthy(),
    );
    expect(screen.getByText('ราคาขาย หน้าร้าน')).toBeTruthy();
    expect(screen.queryByText('ต้นทุน LINE MAN')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'LINE MAN' }));

    expect(screen.getByText('ต้นทุน LINE MAN')).toBeTruthy();
    expect(screen.getByText('ราคาขาย LINE MAN')).toBeTruthy();
    expect(screen.queryByText('ต้นทุน หน้าร้าน')).toBeNull();
  });

  it('marks a menu without a recipe as not ready for sale', async () => {
    mockedListMenuItems.mockResolvedValueOnce([
      {
        id: 2,
        name: 'เมนูที่ยังไม่มีสูตร',
        category: 'เมนูกาแฟเย็น',
        storePrice: 60,
        storePriceAvailable: true,
        linemanPrice: 70,
        linemanPriceAvailable: true,
        linemanCostPrice: 40,
        costPrice: 30,
        status: 'soldout',
        recipeStatus: 'missing_recipe',
        sellable: false,
        ingredients: [],
        preparationSteps: '',
        imageUrl: '',
      },
    ]);

    renderPage(<ProductsManagementPage activeBranch="อยุธยา" />);

    await waitFor(() =>
      expect(screen.getByText('เมนูที่ยังไม่มีสูตร')).toBeTruthy(),
    );
    expect(screen.getByText('ต้องเพิ่มสูตร')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'เพิ่มสูตรการทำ' })).toBeTruthy();
  });

  it('saves a menu without a recipe as a draft for the API to keep off sale', async () => {
    renderPage(<ProductsManagementPage activeBranch="อยุธยา" />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'เพิ่มเมนูและสินค้า' }),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มเมนูและสินค้า' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'ชื่อสินค้า' }), {
      target: { value: 'เมนูร่างทดสอบ' },
    });
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'ราคาต้นทุนหน้าร้าน' }),
      { target: { value: '20' } },
    );
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'ราคาขายหน้าร้าน' }),
      { target: { value: '60' } },
    );
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'ราคาต้นทุน LINE MAN' }),
      { target: { value: '25' } },
    );
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'ราคาขาย LINE MAN' }),
      { target: { value: '70' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกสินค้า' }));

    await waitFor(() =>
      expect(mockedCreateMenuItem).toHaveBeenCalledWith(
        {
          name: 'เมนูร่างทดสอบ',
          category: 'เมนูร้อน',
          storePrice: 60,
          linemanPrice: 70,
          linemanCostPrice: 25,
          costPrice: 20,
          ingredients: [],
        },
        'SBC-AYA-001',
      ),
    );
  });

  it('keeps each sales channel cost and selling price together in the product form', async () => {
    renderPage(<ProductsManagementPage activeBranch="อยุธยา" />);

    await waitFor(() =>
      expect(screen.getByText('อเมริกาโน่ทดสอบ')).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขสินค้า' }));

    const pricing = screen.getByRole('group', {
      name: 'ราคาตามช่องทางขาย',
    });
    const storePricing = within(pricing).getByRole('region', {
      name: 'หน้าร้าน',
    });
    const lineManPricing = within(pricing).getByRole('region', {
      name: 'LINE MAN',
    });

    expect(
      within(storePricing).getByRole('spinbutton', {
        name: /ราคาต้นทุนหน้าร้าน/,
      }),
    ).toBeTruthy();
    expect(
      within(storePricing).getByRole('spinbutton', {
        name: /ราคาขายหน้าร้าน/,
      }),
    ).toBeTruthy();
    expect(
      within(lineManPricing).getByRole('spinbutton', {
        name: /ราคาต้นทุน LINE MAN/,
      }),
    ).toBeTruthy();
    expect(
      within(lineManPricing).getByRole('spinbutton', {
        name: /ราคาขาย LINE MAN/,
      }),
    ).toBeTruthy();
  });

  it('loads the live branch catalog instead of fallback branch codes', async () => {
    renderPage(
      <ProductsManagementPage
        activeBranch="PAGINATION"
        branchOptions={['ทุกสาขา', 'PAGINATION']}
        branchCodes={{ PAGINATION: 'PAGINATION' }}
      />,
    );

    await waitFor(() =>
      expect(mockedListMenuItems).toHaveBeenCalledWith('PAGINATION'),
    );
    expect(mockedListMenuItems).not.toHaveBeenCalledWith('SBC-AYA-001');
    expect(mockedListMenuItems).not.toHaveBeenCalledWith('SBC-PLK-001');
  });

  it('adds ingredients to the franchise cart and submits the exact request', async () => {
    renderPage(
      <IngredientsManagementPage
        activeBranch="อยุธยา"
        readOnly
        allowOrdering
      />,
    );

    await waitFor(() => expect(screen.getByText(ingredient.name)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'สั่งวัตถุดิบ' }));
    fireEvent.click(screen.getByRole('button', { name: 'ตะกร้าวัตถุดิบ' }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'ยืนยันสั่งวัตถุดิบ' }),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันสั่งวัตถุดิบ' }));

    await waitFor(() =>
      expect(mockedCreateStockRequest).toHaveBeenCalledWith(
        {
          note: 'คำขอวัตถุดิบจาก Franchise',
          items: [
            {
              inventoryItemId: ingredient.id,
              name: ingredient.name,
              quantity: 1,
              unit: ingredient.unit,
            },
          ],
        },
        expect.anything(),
      ),
    );
  });

  it('shows the expiry date and warning status on an ingredient card', async () => {
    mockedListInventory.mockResolvedValueOnce([
      { ...ingredient, status: 'ready' },
    ]);
    renderPage(<IngredientsManagementPage activeBranch="อยุธยา" />);

    expect(await screen.findByText('มีของ แต่ใกล้หมดอายุ')).toBeTruthy();
    expect(screen.queryByText('พร้อมใช้')).toBeNull();
    expect(screen.getByText('วันหมดอายุ')).toBeTruthy();
    expect(screen.getByText('31 ธ.ค. 2569')).toBeTruthy();
  });

  it('lets an admin explicitly set an ingredient to cost-only tracking', async () => {
    renderPage(<IngredientsManagementPage activeBranch="อยุธยา" />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'เพิ่มวัตถุดิบ' }),
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'ชื่อวัตถุดิบ' }), {
      target: { value: 'น้ำสกัดทดสอบ' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'จำนวนคงเหลือ' }), {
      target: { value: '0' },
    });
    fireEvent.mouseDown(
      screen.getByRole('combobox', { name: 'การจัดการสต๊อก' }),
    );
    fireEvent.click(screen.getByRole('option', { name: 'คิดต้นทุนเท่านั้น' }));
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกวัตถุดิบ' }));

    await waitFor(() =>
      expect(mockedCreateInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'น้ำสกัดทดสอบ',
          trackStock: false,
        }),
        'SBC-AYA-001',
      ),
    );
  });

  it('shows the stale-stock status when an ingredient has not moved recently', async () => {
    mockedListInventory.mockResolvedValueOnce([
      { ...ingredient, status: 'stale', expiryStatus: 'none' },
    ]);
    renderPage(<IngredientsManagementPage activeBranch="อยุธยา" />);

    expect(await screen.findByText('วัตถุดิบค้างสต๊อก')).toBeTruthy();
    expect(screen.queryByText('พร้อมใช้')).toBeNull();
  });

  it('explains why an ingredient referenced by recipes or stock history cannot be deleted', async () => {
    mockedDeleteInventory.mockRejectedValueOnce(
      new Error('ลบไม่ได้ เพราะวัตถุดิบนี้ถูกใช้งานอยู่ในสูตรหรือประวัติสต๊อก'),
    );
    renderPage(<IngredientsManagementPage activeBranch="อยุธยา" />);

    fireEvent.click(await screen.findByRole('button', { name: 'ลบวัตถุดิบ' }));
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันลบ' }));

    await waitFor(() =>
      expect(mockedDeleteInventory).toHaveBeenCalledWith(1, 'SBC-AYA-001'),
    );
    expect(
      await screen.findByText(
        'ลบไม่ได้ เพราะวัตถุดิบนี้ถูกใช้งานอยู่ในสูตรหรือประวัติสต๊อก',
      ),
    ).toBeTruthy();
  });

  it('shows ingredient count badges only on the warning filters', async () => {
    renderPage(<IngredientsManagementPage activeBranch="อยุธยา" />);

    const all = await screen.findByRole('button', {
      name: 'ทั้งหมด 1 รายการ',
    });
    const lowStock = screen.getByRole('button', {
      name: 'วัตถุดิบใกล้หมด 1 รายการ',
    });
    const expiringSoon = screen.getByRole('button', {
      name: 'ใกล้หมดอายุ 1 รายการ',
    });

    expect(all.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(lowStock.querySelector('[aria-hidden="true"]')?.textContent).toBe(
      '1',
    );
    expect(
      expiringSoon.querySelector('[aria-hidden="true"]')?.textContent,
    ).toBe('1');
  });

  it('renders an ingredient image on the grid card when one was uploaded', async () => {
    mockedListInventory.mockResolvedValueOnce([
      { ...ingredient, imageUrl: '/ingredient-photo.png' },
    ]);
    renderPage(<IngredientsManagementPage activeBranch="อยุธยา" />);

    expect(
      (await screen.findByAltText(`รูป${ingredient.name}`)).getAttribute('src'),
    ).toBe('/ingredient-photo.png');
  });

  it('keeps the card branch when saving an edit from the all-branches view', async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(
          private readonly callback: (
            entries: Array<{
              isIntersecting: boolean;
              target: Element;
            }>,
          ) => void,
        ) {}

        observe(target: Element) {
          this.callback([{ isIntersecting: true, target }]);
        }

        disconnect() {}
      },
    );
    renderPage(<IngredientsManagementPage activeBranch="ทุกสาขา" />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'แก้ไขวัตถุดิบ' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการแก้ไข' }));

    await waitFor(() =>
      expect(mockedUpdateInventory).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: ingredient.name }),
        'SBC-PLK-001',
      ),
    );
  });

  it('lets an admin discard an expired ingredient while preserving an adjustment record', async () => {
    mockedListInventory.mockResolvedValue([
      { ...ingredient, quantity: 3, expiryStatus: 'expired' },
    ]);
    renderPage(<IngredientsManagementPage activeBranch="อยุธยา" />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'ตัดทิ้งวัตถุดิบหมดอายุ' }),
    );
    expect(screen.getByText('ตัดทิ้งวัตถุดิบหมดอายุ?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันตัดทิ้ง' }));

    await waitFor(() =>
      expect(mockedAdjustInventory).toHaveBeenCalledWith(
        ingredient.id,
        0,
        'ตัดทิ้งวัตถุดิบหมดอายุ',
        'SBC-AYA-001',
      ),
    );
  });

  it('separates fresh ingredients into their dedicated page', async () => {
    mockedListInventory.mockResolvedValue([
      { ...ingredient, category: 'fresh', name: 'นมสด' },
      { ...ingredient, category: 'coffee', name: 'เมล็ดกาแฟ' },
    ]);
    renderPage(
      <IngredientsManagementPage
        activeBranch="อยุธยา"
        ingredientScope="fresh"
      />,
    );

    await waitFor(() => expect(screen.getByText('นมสด')).toBeTruthy());
    expect(
      screen.getByRole('button', { name: 'ทั้งหมด 1 รายการ' }),
    ).toBeTruthy();
    expect(screen.getByText('นมสด')).toBeTruthy();
    expect(screen.queryByText('เมล็ดกาแฟ')).toBeNull();
    expect(screen.queryByRole('button', { name: 'ของสด' })).toBeNull();
  });

  it('keeps stock data visible but hides stock maintenance actions in read-only mode', async () => {
    renderPage(
      <StockManagementPage
        activeBranch="อยุธยา"
        readOnly
        stockCategory="postal_equipment"
        stockLabel="สต๊อกอุปกรณ์ไปรษณีย์"
      />,
    );

    await waitFor(() => expect(screen.getByText(ingredient.name)).toBeTruthy());

    expect(screen.getByText('คงเหลือ')).toBeTruthy();
    expect(screen.getByText('4 ถุง')).toBeTruthy();
    expect(screen.getByText('ต้นทุน')).toBeTruthy();
    expect(screen.getByText('125.00 บาท/ถุง')).toBeTruthy();
    expect(screen.queryByText('แจ้งเตือนเมื่อเหลือ')).toBeNull();
    expect(screen.queryByText('5 ถุง')).toBeNull();
    expect(
      screen.queryByText('คงเหลือ 4 ถุง · ต้นทุน 125.00 บาท/ถุง'),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'เพิ่มสต๊อก' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'แก้ไขสต๊อก' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ลบสต๊อก' })).toBeNull();
    expect(mockedListInventory).toHaveBeenCalledWith(
      'stock',
      'SBC-AYA-001',
      'postal_equipment',
    );
  });

  it('allows only editing—not adding or deleting—on protected branch inventory pages', async () => {
    const { unmount } = renderPage(
      <IngredientsManagementPage activeBranch="อยุธยา" readOnly allowEditing />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'แก้ไขวัตถุดิบ' }),
      ).toBeTruthy(),
    );
    expect(screen.queryByRole('button', { name: 'เพิ่มวัตถุดิบ' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ลบวัตถุดิบ' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขวัตถุดิบ' }));
    expect(
      screen.getByRole('textbox', { name: 'ชื่อวัตถุดิบ' }),
    ).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'จำนวนคงเหลือ' }), {
      target: { value: '7' },
    });
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'แจ้งเตือนเมื่อคงเหลือ' }),
      { target: { value: '3' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการแก้ไข' }));
    await waitFor(() =>
      expect(mockedUpdateInventory).toHaveBeenCalledWith(
        ingredient.id,
        expect.objectContaining({
          name: ingredient.name,
          quantity: 7,
          reorderLevel: 3,
          unit: ingredient.unit,
          unitCost: ingredient.unitCost,
        }),
        'SBC-AYA-001',
      ),
    );

    unmount();
    mockedUpdateInventory.mockClear();
    renderPage(
      <StockManagementPage
        activeBranch="อยุธยา"
        readOnly
        allowEditing
        stockCategory="postal_equipment"
        stockLabel="สต๊อกอุปกรณ์ไปรษณีย์"
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'ปรับยอดคงเหลือ' }),
      ).toBeTruthy(),
    );
    expect(screen.queryByRole('button', { name: 'เพิ่มสต๊อก' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ลบสต๊อก' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'ปรับยอดคงเหลือ' }));
    expect(
      screen.getByRole('textbox', {
        name: 'ชื่อสต๊อกอุปกรณ์ไปรษณีย์',
      }),
    ).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'จำนวนคงเหลือ' }), {
      target: { value: '8' },
    });
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'แจ้งเตือนเมื่อคงเหลือ' }),
      { target: { value: '2' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการแก้ไข' }));
    await waitFor(() =>
      expect(mockedUpdateInventory).toHaveBeenCalledWith(
        ingredient.id,
        expect.objectContaining({
          name: ingredient.name,
          quantity: 8,
          reorderLevel: 2,
          unit: ingredient.unit,
          unitCost: ingredient.unitCost,
          stockCategory: 'postal_equipment',
        }),
        'SBC-AYA-001',
      ),
    );
  });

  it('shows stock count badges only on the warning filters', async () => {
    renderPage(<StockManagementPage activeBranch="อยุธยา" />);

    const all = await screen.findByRole('button', {
      name: 'ทั้งหมด 1 รายการ',
    });
    const lowStock = screen.getByRole('button', { name: 'ใกล้หมด 1 รายการ' });

    expect(all.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(lowStock.querySelector('[aria-hidden="true"]')?.textContent).toBe(
      '1',
    );
  });

  it('adds drink equipment to the franchise cart and submits the exact request', async () => {
    renderPage(
      <StockManagementPage
        activeBranch="อยุธยา"
        readOnly
        allowOrdering
        stockCategory="drink_equipment"
        stockLabel="สต๊อกอุปกรณ์เครื่องดื่ม"
      />,
    );

    await waitFor(() => expect(screen.getByText(ingredient.name)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'สั่งอุปกรณ์' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'ตะกร้าอุปกรณ์เครื่องดื่ม' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: `เพิ่มจำนวน ${ingredient.name}` }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันสั่งอุปกรณ์' }));

    await waitFor(() =>
      expect(mockedCreateStockRequest).toHaveBeenCalledWith(
        {
          note: 'คำขออุปกรณ์เครื่องดื่มจาก Franchise',
          items: [
            {
              inventoryItemId: ingredient.id,
              name: ingredient.name,
              quantity: 2,
              unit: ingredient.unit,
            },
          ],
        },
        expect.anything(),
      ),
    );
  });
});
