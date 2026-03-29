/**
 * E2E — Post flows
 *
 * Covers:
 *  1. Create a new post (requires login)
 *  2. View the created post
 *  3. Edit the post
 *  4. Delete the post
 *
 * Prerequisite: a USER account must exist.
 * This suite shares the same timestamp-based credentials as auth.spec.ts
 * but manages its own independent login session via storageState.
 */
import { test, expect, Page } from "@playwright/test";

const TIMESTAMP = Date.now();
const EMAIL = `post_${TIMESTAMP}@example.com`;
const PASSWORD = "Test@1234";
const NAME = `发帖用户_${TIMESTAMP}`;

async function registerAndLogin(page: Page) {
  // Register
  await page.goto("/auth/register");
  await page.getByPlaceholder("你的昵称").fill(NAME);
  await page.getByPlaceholder("email@example.com").fill(EMAIL);
  const pwFields = page.locator('input[type="password"]');
  await pwFields.nth(0).fill(PASSWORD);
  await pwFields.nth(1).fill(PASSWORD);
  await page.getByRole("button", { name: "注册" }).click();
  await expect(page).toHaveURL(/\/auth\/login/);

  // Login
  await page.getByPlaceholder(/邮箱/).fill(EMAIL);
  await page.getByPlaceholder(/密码/).fill(PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/forum/, { timeout: 10_000 });
}

/** Login only — assumes the account was already created by a previous test. */
async function loginOnly(page: Page) {
  await page.goto("/auth/login");
  await page.getByPlaceholder(/邮箱/).fill(EMAIL);
  await page.getByPlaceholder(/密码/).fill(PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/forum/, { timeout: 10_000 });
}

test.describe("Post — create / view / edit / delete", () => {
  let postId: string;

  test("can create a new post", async ({ page }) => {
    await registerAndLogin(page);

    await page.goto("/post/create");

    // Pick first available category
    const categorySelect = page.locator("select[name='categoryId']");
    await categorySelect.selectOption({ index: 1 });

    await page.locator("input[name='title']").fill("E2E 自动化测试帖子");
    await page.locator("textarea[name='content']").fill(
      "这是一篇由 Playwright E2E 测试自动创建的帖子，内容超过10个字符。"
    );

    await page.getByRole("button", { name: "发布帖子" }).click();

    // Should redirect to the new post page (use {15,} so /post/create cannot false-match)
    await expect(page).toHaveURL(/\/post\/[a-z0-9]{15,}/, { timeout: 10_000 });

    // Store the post ID for subsequent tests
    const url = page.url();
    postId = url.split("/post/")[1];
    expect(postId).toBeTruthy();
  });

  test("can view the created post", async ({ page }) => {
    if (!postId) test.skip();
    await page.goto(`/post/${postId}`);
    await expect(page.locator("h1, h2").filter({ hasText: "E2E 自动化测试帖子" }).first()).toBeVisible();
  });

  test("can edit the post", async ({ page }) => {
    if (!postId) test.skip();
    await loginOnly(page);

    await page.goto(`/post/${postId}/edit`);
    await page.locator("input[name='title']").fill("E2E 自动化测试帖子（已编辑）");
    await page.getByRole("button", { name: "保存修改" }).click();

    // After save, redirected back to the post
    await expect(page).toHaveURL(/\/post\/[a-z0-9]+/, { timeout: 10_000 });
  });

  test("can delete the post", async ({ page }) => {
    if (!postId) test.skip();
    await loginOnly(page);

    await page.goto(`/post/${postId}`);

    // Click delete button and confirm the dialog
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "删除帖子" }).click();

    // After deletion, redirected away from the post
    await expect(page).not.toHaveURL(new RegExp(`/post/${postId}$`), {
      timeout: 10_000,
    });
  });
});
