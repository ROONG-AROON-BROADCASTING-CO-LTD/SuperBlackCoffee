import { expect, test } from '@playwright/test';

const applicationLoginChecks = [
  {
    name: 'Admin',
    url: 'http://localhost:5174/',
    title: 'SuperBlackCoffee — Admin',
    usernameLabel: 'ชื่อผู้ใช้งาน',
    submitLabel: 'เข้าสู่ระบบผู้ดูแล',
  },
  {
    name: 'Franchise',
    url: 'http://localhost:5176/',
    title: 'SuperBlackCoffee — Franchise',
    usernameLabel: 'ชื่อผู้ใช้งาน',
    submitLabel: 'เข้าสู่ระบบแฟรนไชส์',
  },
  {
    name: 'Staff',
    url: 'http://localhost:5177/',
    title: 'SuperBlackCoffee — Staff',
    usernameLabel: 'ชื่อผู้ใช้',
    submitLabel: 'ดำเนินการต่อ',
  },
  {
    name: 'Stock',
    url: 'http://localhost:5178/',
    title: 'SuperBlackCoffee — Stock',
    usernameLabel: 'ชื่อผู้ใช้',
    submitLabel: 'ดำเนินการต่อ',
  },
] as const;

for (const app of applicationLoginChecks) {
  test(`${app.name} opens its sign-in screen without browser errors`, async ({
    page,
  }) => {
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    // An unauthenticated visit intentionally checks a session first. Return a
    // normal API failure rather than a browser-level 401 so this smoke test can
    // distinguish an expected sign-in state from an actual console error.
    await page.route('**/api/v1/**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'ยังไม่ได้เข้าสู่ระบบ',
        }),
      }),
    );

    await page.goto(app.url);

    await expect(page).toHaveTitle(app.title);
    await expect(
      page.getByRole('textbox', { name: app.usernameLabel, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: app.submitLabel, exact: true }),
    ).toBeVisible();
    expect(browserErrors).toEqual([]);
  });
}
