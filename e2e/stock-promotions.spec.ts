import { expect, test } from '@playwright/test';

test('Stock saves an editable promotion and restores it after reload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const branch = { id: 4, name: 'อยุธยา', code: 'AYA' };
  const menu = {
    id: 88,
    name: 'ลาเต้เย็น',
    category: 'กาแฟ',
    storePrice: 70,
    imageUrl: '',
  };
  let saved: Record<string, unknown> | null = null;
  let submitted: Record<string, unknown> | null = null;
  await page.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    let data: unknown;
    if (pathname.endsWith('/stock/session')) {
      data = {
        user: {
          id: 7,
          name: 'พนักงานสต๊อก',
          role: 'cashier',
          branchId: 4,
          branchName: 'อยุธยา',
          isFranchise: false,
        },
      };
    } else if (pathname.endsWith('/promotions')) {
      expect(route.request().headers()['x-sbc-session-role']).toBe('stock');
      if (route.request().method() === 'POST') {
        submitted = route.request().postDataJSON();
        saved = {
          ...submitted,
          id: 1,
          usage: 0,
          branches: [branch],
          menuItems: [{ ...menu, price: 70 }],
        };
        data = saved;
      } else data = saved ? [saved] : [];
    } else if (pathname.endsWith('/branches')) data = [branch];
    else if (pathname.endsWith('/menu-items')) data = [menu];
    else if (
      pathname.endsWith('/inventory') ||
      pathname.endsWith('/stock-movements')
    )
      data = [];
    else {
      await route.fulfill({
        status: 404,
        json: { success: false, message: 'Unexpected test request' },
      });
      return;
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/promotions');
  await expect(page.getByText('ยังไม่มีโปรโมชั่นตามเงื่อนไขนี้')).toBeVisible();
  await page.getByRole('button', { name: 'เพิ่มโปรโมชั่น' }).click();
  await page
    .getByRole('textbox', { name: 'ชื่อโปรโมชั่น', exact: true })
    .fill('ลาเต้ ลด 25%');
  await page
    .getByRole('textbox', { name: 'ประเภทโปรโมชั่น', exact: true })
    .fill('แคมเปญตามฤดูกาล');
  await page
    .getByRole('textbox', { name: 'สิทธิพิเศษ / รายละเอียด', exact: true })
    .fill('ลด 25% เมื่อซื้อ 2 แก้ว');
  await page.getByRole('combobox', { name: 'เมนูที่ร่วมโปรโมชั่น' }).click();
  await page.getByRole('option', { name: 'ลาเต้เย็น · 70 บาท' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'บันทึกโปรโมชั่น' }).click();
  await expect(
    page.getByRole('heading', { name: 'รายละเอียดโปรโมชั่น' }),
  ).toBeVisible();
  expect(submitted).toMatchObject({
    name: 'ลาเต้ ลด 25%',
    type: 'แคมเปญตามฤดูกาล',
    benefit: 'ลด 25% เมื่อซื้อ 2 แก้ว',
    menuItemIds: [88],
    status: 'draft',
  });
  await page.reload();
  await expect(page.getByText('ลาเต้ ลด 25%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'จัดการโปรโมชั่น' }).click();
  await expect(
    page
      .getByRole('dialog')
      .getByText('ลด 25% เมื่อซื้อ 2 แก้ว', { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
