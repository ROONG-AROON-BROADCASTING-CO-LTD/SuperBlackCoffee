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
import { listInventory } from '../../api/inventory';
import { createMenuItem, listMenuItems, updateMenuItem } from '../../api/menu';
import { createStockRequest } from '../../api/stock-requests';

vi.mock('../../api/inventory', () => ({
  deleteInventory: vi.fn(),
  listInventory: vi.fn(),
  updateInventory: vi.fn(),
}));
vi.mock('../../api/menu', () => ({
  createMenuItem: vi.fn(),
  listMenuItems: vi.fn(),
  updateMenuItem: vi.fn(),
}));
vi.mock('../../api/stock-requests', () => ({ createStockRequest: vi.fn() }));

const mockedListInventory = vi.mocked(listInventory);
const mockedListMenuItems = vi.mocked(listMenuItems);
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
    mockedCreateMenuItem.mockResolvedValue({ id: 2 });
    mockedUpdateMenuItem.mockResolvedValue({ id: 1 });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
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
    renderPage(<IngredientsManagementPage activeBranch="อยุธยา" />);

    await waitFor(() => expect(screen.getByText('ใกล้หมดอายุ')).toBeTruthy());
    expect(screen.getByText('วันหมดอายุ')).toBeTruthy();
    expect(screen.getByText('31 ธ.ค. 2569')).toBeTruthy();
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
    expect(screen.getByText('แจ้งเตือนเมื่อเหลือ')).toBeTruthy();
    expect(screen.getByText('5 ถุง')).toBeTruthy();
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
