/**
 * E2E — Admin flows
 *
 * Covers:
 *  1. Non-admin is redirected away from /admin
 *  2. Admin can access the dashboard
 *  3. Admin can view the users list
 *  4. Admin can view the posts list
 *
 * Requires TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD environment variables
 * pointing to a seeded ADMIN account.  If the env vars are not set the
 * admin-specific tests are skipped gracefully.
 */
import { test, expect, Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "";

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.getByPlaceholder(/邮箱/).fill(email);
  await page.getByPlaceholder(/密码/).fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/forum/, { timeout: 10_000 });
}

async function registerAndLoginRegular(page: Page) {
  const ts = Date.now();
  const email = `admin_test_regular_${ts}@example.com`;
  const password = "Test@1234";

  await page.goto("/auth/register");
  await page.getByPlaceholder("你的昵称").fill(`普通用户${ts}`);
  await page.getByPlaceholder("email@example.com").fill(email);
  const pwFields = page.locator('input[type="password"]');
  await pwFields.nth(0).fill(password);
  await pwFields.nth(1).fill(password);
  await page.getByRole("button", { name: "注册" }).click();
  await expect(page).toHaveURL(/\/auth\/login/);

  await page.getByPlaceholder(/邮箱/).fill(email);
  await page.getByPlaceholder(/密码/).fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/forum/, { timeout: 10_000 });
}

test.describe("Admin — access control", () => {
  test("non-admin is redirected away from /admin", async ({ page }) => {
    await registerAndLoginRegular(page);
    await page.goto("/admin");
    // Middleware redirects to /
    await expect(page).not.toHaveURL(/\/admin/, { timeout: 5_000 });
  });
});

test.describe("Admin — dashboard (requires ADMIN credentials)", () => {
  test.beforeEach(async () => {
    // Skip entire describe block when admin credentials are not provided
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      test.skip();
    }
  });

  test("admin can access dashboard", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin/, { timeout: 5_000 });
    // Dashboard heading
    await expect(page.locator("h1, h2").filter({ hasText: /管理|后台|控制台|概览/ })).toBeVisible();
  });

  test("admin can view users list", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/users/, { timeout: 5_000 });
    // At least one user row should exist
    await expect(page.locator("table tr, .card").first()).toBeVisible();
  });

  test("admin can view posts list", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/posts");
    await expect(page).toHaveURL(/\/admin\/posts/, { timeout: 5_000 });
    await expect(page.locator("table tr, .card").first()).toBeVisible();
  });
});
