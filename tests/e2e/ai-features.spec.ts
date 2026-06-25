/**
 * AI 功能端到端测试
 */
import { test, expect } from '@playwright/test'

test.describe('AI 智能中心', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/ai/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            aiEnabled: true,
            provider: 'deepseek',
            model: 'deepseek-chat',
            profileName: '默认配置',
            features: {},
          },
        }),
      })
    })
  })

  test('AI Hub 应展示标题与功能卡片', async ({ page }) => {
    await page.goto('/ai')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('.page-layout__heading h1')).toHaveText('智能投资中心')
    await expect(page.locator('.ai-card')).toHaveCount(5)
    await expect(page.locator('.ai-card').first()).toBeVisible()
  })

  test('AI Hub 卡片应可导航到子页面', async ({ page }) => {
    await page.goto('/ai')
    await page.waitForLoadState('networkidle')

    await page.locator('.ai-card').filter({ hasText: 'AI 条件筛选' }).click()
    await expect(page).toHaveURL(/\/ai\/screening/)
    await expect(page.locator('.page-layout__heading h1')).toContainText('AI')
  })

  test('AI 状态 API 应被调用', async ({ page }) => {
    let statusCalled = false
    await page.route('**/api/ai/status', async (route) => {
      statusCalled = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { aiEnabled: false, provider: 'deepseek' } }),
      })
    })

    await page.goto('/ai')
    await page.waitForLoadState('networkidle')
    expect(statusCalled).toBe(true)
  })
})

test.describe('AI 推荐历史页', () => {
  test('未登录访问应跳转或展示登录相关状态', async ({ page }) => {
    await page.goto('/ai/history')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    const hasLogin = url.includes('/login') || url.includes('/auth')
    const hasHistoryTitle = await page
      .locator('.page-layout__heading h1')
      .filter({ hasText: /历史|推荐/ })
      .count()

    expect(hasLogin || hasHistoryTitle > 0).toBeTruthy()
  })
})
