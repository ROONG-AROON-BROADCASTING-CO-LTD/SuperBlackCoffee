import { expect, test, type Page } from '@playwright/test';

const stockSession = {
  user: {
    id: 7,
    name: 'พนักงานสต๊อก',
    role: 'cashier',
    branchId: 4,
    branchName: 'อยุธยา',
    isFranchise: false,
  },
};

const expirySuggestion = {
  menuId: 88,
  menuName: 'ลาเต้เย็น',
  category: 'เมนูกาแฟเย็น',
  storePrice: 70,
  lotId: 19,
  inventoryItemId: 56,
  ingredientName: 'นมสด',
  lotNumber: 'LOT-88',
  expiryDate: '2026-10-06',
  quantityRemaining: 12,
  unit: 'กล่อง',
  daysUntilExpiry: 7,
  suggestedDiscountPercent: 25,
  reason: 'ใช้ นมสด จากล็อตใกล้หมดอายุ',
};

async function mockStockApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const data = pathname.endsWith('/stock/session')
      ? stockSession
      : pathname.endsWith('/inventory/expiry-promotion-suggestions')
        ? { warningDays: 30, suggestions: [expirySuggestion] }
        : pathname.endsWith('/inventory') ||
            pathname.endsWith('/menu-items') ||
            pathname.endsWith('/stock-movements')
          ? []
          : undefined;

    if (data === undefined) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'ไม่พบ API ทดสอบ' }),
      });
      return;
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    });
  });
}

test('Stock can review an expiry suggestion and receive a prefilled promotion draft', async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await mockStockApi(page);
  await page.goto('/promotions');

  await expect(page).toHaveTitle('SuperBlackCoffee — Stock');
  await expect(page.getByText('แนะนำโปรโมชันเพื่อลดของเสีย')).toBeVisible();
  await expect(page.getByText('ลาเต้เย็น', { exact: true })).toBeVisible();
  await expect(page.getByText('เหลือ 7 วัน · แนะนำลด 25%')).toBeVisible();

  await page.getByRole('button', { name: 'สร้างโปรโมชั่น' }).click();

  await expect(
    page.getByText('สร้างโปรโมชั่นจากวัตถุดิบใกล้หมดอายุ'),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'ชื่อโปรโมชั่น', exact: true }),
  ).toHaveValue('ลาเต้เย็น ลด 25%');
  await expect(
    page.getByRole('textbox', {
      name: 'สิทธิพิเศษ / รายละเอียด',
      exact: true,
    }),
  ).toHaveValue('ลด 25% เพื่อใช้ นมสด ล็อตใกล้หมดอายุ');
  await expect(
    page.getByRole('textbox', { name: 'สาขาที่เข้าร่วม', exact: true }),
  ).toHaveValue('สาขาอยุธยา');
  expect(consoleErrors).toEqual([]);

  await testInfo.attach('prefilled-promotion-draft', {
    body: await page.screenshot({ fullPage: false }),
    contentType: 'image/png',
  });
});
