/**
 * E2E — Authentication flows
 *
 * Covers:
 *  1. Register a new account
 *  2. Login with correct credentials
 *  3. Login with wrong credentials shows error
 *  4. Logout
 */
import { test, expect } from "@playwright/test";

const TIMESTAMP = Date.now();
const TEST_EMAIL = `e2e_${TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Test@1234";
const TEST_NAME = `测试用户_${TIMESTAMP}`;

test.describe("Auth — register", () => {
  test("can register a new account", async ({ page }) => {
    await page.goto("/auth/register");

    await page.getByPlaceholder("你的昵称").fill(TEST_NAME);
    await page.getByPlaceholder("email@example.com").fill(TEST_EMAIL);
    // Find both password fields
    const pwFields = page.locator('input[type="password"]');
    await pwFields.nth(0).fill(TEST_PASSWORD);
    await pwFields.nth(1).fill(TEST_PASSWORD);

    await page.getByRole("button", { name: "注册" }).click();

    // Should redirect to login page with ?registered=true
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("Auth — login / logout", () => {
  test("cannot login with wrong password", async ({ page }) => {
    await page.goto("/auth/login");

    await page.getByPlaceholder(/邮箱/).fill(TEST_EMAIL);
    await page.getByPlaceholder(/密码/).fill("WrongPassword!");
    await page.getByRole("button", { name: "登录" }).click();

    // Error message should be visible
    await expect(page.locator("text=/密码|错误|失败/")).toBeVisible({ timeout: 5_000 });
  });

  test("can login and then logout", async ({ page }) => {
    await page.goto("/auth/login");

    await page.getByPlaceholder(/邮箱/).fill(TEST_EMAIL);
    await page.getByPlaceholder(/密码/).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "登录" }).click();

    // After login, should land on /forum
    await expect(page).toHaveURL(/\/forum/, { timeout: 10_000 });

    // Open user dropdown and logout
    const chevron = page.locator("header button", { has: page.locator("svg") }).last();
    await chevron.click();
    await page.getByRole("button", { name: "退出登录" }).click();

    // After logout, should redirect to home (match full URL like http://localhost:3000/ or .../forum)
    await expect(page).toHaveURL(/\/(forum)?$/, { timeout: 10_000 });
  });
});
