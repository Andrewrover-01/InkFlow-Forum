/**
 * E2E — Interaction flows
 *
 * Covers:
 *  1. Reply to a post
 *  2. Like a post
 *  3. Unlike a post (toggle)
 *
 * Each test registers its own fresh user so tests remain isolated.
 */
import { test, expect, Page } from "@playwright/test";

const TS = Date.now();
const EMAIL = `interact_${TS}@example.com`;
const PASSWORD = "Test@1234";
const NAME = `互动用户_${TS}`;

async function registerAndLogin(page: Page) {
  await page.goto("/auth/register");
  await page.getByPlaceholder("你的昵称").fill(NAME);
  await page.getByPlaceholder("email@example.com").fill(EMAIL);
  const pwFields = page.locator('input[type="password"]');
  await pwFields.nth(0).fill(PASSWORD);
  await pwFields.nth(1).fill(PASSWORD);
  await page.getByRole("button", { name: "注册" }).click();
  await expect(page).toHaveURL(/\/auth\/login/);

  await page.getByPlaceholder(/邮箱/).fill(EMAIL);
  await page.getByPlaceholder(/密码/).fill(PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/forum/, { timeout: 10_000 });
}

async function createPost(page: Page): Promise<string> {
  await page.goto("/post/create");
  const categorySelect = page.locator("select[name='categoryId']");
  await categorySelect.selectOption({ index: 1 });
  await page.locator("input[name='title']").fill(`互动测试帖子 ${TS}`);
  await page.locator("textarea[name='content']").fill(
    "这是互动 E2E 测试的帖子，内容超过10个字符。"
  );
  await page.getByRole("button", { name: "发布帖子" }).click();
  await expect(page).toHaveURL(/\/post\/[a-z0-9]+/, { timeout: 10_000 });
  return page.url().split("/post/")[1];
}

test.describe("Interaction — reply", () => {
  test("can reply to a post", async ({ page }) => {
    await registerAndLogin(page);
    const postId = await createPost(page);

    await page.goto(`/post/${postId}`);

    const replyTextarea = page.locator("textarea").first();
    await replyTextarea.fill("这是一条 E2E 测试回复，内容要超过一定长度。");
    await page.getByRole("button", { name: "发表回复" }).click();

    // Reply should appear on the page
    await expect(
      page.locator("text=这是一条 E2E 测试回复")
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Interaction — like / unlike", () => {
  test("can like and unlike a post", async ({ page }) => {
    await registerAndLogin(page);
    const postId = await createPost(page);

    // Need another user's post to like (same-user likes are still toggled)
    await page.goto(`/post/${postId}`);

    // Find the like button for the post
    const likeBtn = page.locator("[data-testid='like-button'], button").filter({
      hasText: /\d+/,
    }).first();

    const initialText = await likeBtn.textContent();

    // Like
    await likeBtn.click();
    await expect(likeBtn).not.toHaveText(initialText ?? "", { timeout: 5_000 });

    // Unlike (toggle back)
    await likeBtn.click();
    await expect(likeBtn).toHaveText(initialText ?? "", { timeout: 5_000 });
  });
});
