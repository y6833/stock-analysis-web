/**
 * 股票仪表盘端到端测试
 */

import { test, expect } from '@playwright/test'

test.describe('股票仪表盘端到端测试', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到应用首页
    await page.goto('/')
    
    // 等待应用加载完成
    await page.waitForLoadState('networkidle')
    
    // 如果需要登录，先执行登录操作
    await loginIfNeeded(page)
  })

  test('应该正确加载仪表盘页面', async ({ page }) => {
    // 导航到仪表盘页面
    await page.goto('/dashboard')
    
    // 验证页面标题
    await expect(page).toHaveTitle(/仪表盘|Dashboard/)
    
    // 验证关键元素存在
    await expect(page.locator('[data-testid="market-overview"]')).toBeVisible()
    await expect(page.locator('[data-testid="watchlist-summary"]')).toBeVisible()
    await expect(page.locator('[data-testid="portfolio-summary"]')).toBeVisible()
    
    // 验证市场数据加载
    await expect(page.locator('[data-testid="market-index-item"]')).toHaveCount.greaterThan(0)
  })

  test('应该正确显示市场概览', async ({ page }) => {
    await page.goto('/dashboard')
    
    // 等待市场数据加载
    await page.waitForSelector('[data-testid="market-index-item"]')
    
    // 验证市场指数数据
    const marketIndices = page.locator('[data-testid="market-index-item"]')
    await expect(marketIndices).toHaveCount.greaterThan(0)
    
    // 验证第一个市场指数有正确的数据格式
    const firstIndex = marketIndices.first()
    await expect(firstIndex.locator('.index-name')).toBeVisible()
    await expect(firstIndex.locator('.index-value')).toBeVisible()
    await expect(firstIndex.locator('.index-change')).toBeVisible()
    
    // 验证市场热图存在
    await expect(page.locator('[data-testid="market-heatmap"]')).toBeVisible()
  })

  test('应该能够切换市场指数时间范围', async ({ page }) => {
    await page.goto('/dashboard')
    
    // 等待市场数据加载
    await page.waitForSelector('[data-testid="market-index-chart"]')
    
    // 获取当前图表数据
    const initialChartData = await getChartData(page)
    
    // 点击切换到周视图
    await page.locator('[data-testid="timeframe-selector"] [data-value="week"]').click()
    
    // 等待图表更新
    await page.waitForTimeout(1000)
    
    // 获取更新后的图表数据
    const updatedChartData = await getChartData(page)
    
    // 验证图表数据已更新
    expect(updatedChartData).not.toEqual(initialChartData)
  })

  test('应该正确显示关注列表摘要', async ({ page }) => {
    await page.goto('/dashboard')
    
    // 等待关注列表加载
    await page.waitForSelector('[data-testid="watchlist-item"]')
    
    // 验证关注列表项
    const watchlistItems = page.locator('[data-testid="watchlist-item"]')
    
    // 如果没有关注的股票，应该显示空状态
    if (await watchlistItems.count() === 0) {
      await expect(page.locator('[data-testid="empty-watchlist"]')).toBeVisible()
    } else {
      // 验证关注列表项格式
      const firstItem = watchlistItems.first()
      await expect(firstItem.locator('.stock-symbol')).toBeVisible()
      await expect(firstItem.locator('.stock-price')).toBeVisible()
      await expect(firstItem.locator('.stock-change')).toBeVisible()
    }
    
    // 验证"查看全部"链接
    await expect(page.locator('[data-testid="view-all-watchlist"]')).toBeVisible()
  })

  test('应该正确显示投资组合摘要', async ({ page }) => {
    await page.goto('/dashboard')
    
    // 等待投资组合加载
    await page.waitForSelector('[data-testid="portfolio-summary"]')
    
    // 验证投资组合总值
    await expect(page.locator('[data-testid="portfolio-total-value"]')).toBeVisible()
    
    // 验证日收益
    await expect(page.locator('[data-testid="portfolio-daily-change"]')).toBeVisible()
    
    // 验证总收益
    await expect(page.locator('[data-testid="portfolio-total-gain"]')).toBeVisible()
    
    // 验证资产分配图表
    await expect(page.locator('[data-testid="portfolio-allocation-chart"]')).toBeVisible()
  })

  test('应该能够添加股票到关注列表', async ({ page }) => {
    await page.goto('/dashboard')
    
    // 点击添加股票按钮
    await page.locator('[data-testid="add-to-watchlist-button"]').click()
    
    // 等待搜索对话框出现
    await page.waitForSelector('[data-testid="stock-search-dialog"]')
    
    // 输入股票代码
    await page.locator('[data-testid="stock-search-input"]').fill('000001')
    
    // 等待搜索结果
    await page.waitForSelector('[data-testid="search-result-item"]')
    
    // 点击第一个搜索结果
    await page.locator('[data-testid="search-result-item"]').first().click()
    
    // 点击添加按钮
    await page.locator('[data-testid="confirm-add-to-watchlist"]').click()
    
    // 验证成功提示
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible()
    
    // 验证关注列表中包含新添加的股票
    await expect(page.locator('[data-testid="watchlist-item"]')).toHaveCount.greaterThan(0)
  })

  test('应该能够查看股票详情', async ({ page }) => {
    await page.goto('/dashboard')
    
    // 等待关注列表加载
    await page.waitForSelector('[data-testid="watchlist-item"]')
    
    // 如果没有关注的股票，先添加一只
    if (await page.locator('[data-testid="watchlist-item"]').count() === 0) {
      // 添加股票到关注列表
      await page.locator('[data-testid="add-to-watchlist-button"]').click()
      await page.waitForSelector('[data-testid="stock-search-dialog"]')
      await page.locator('[data-testid="stock-search-input"]').fill('000001')
      await page.waitForSelector('[data-testid="search-result-item"]')
      await page.locator('[data-testid="search-result-item"]').first().click()
      await page.locator('[data-testid="confirm-add-to-watchlist"]').click()
      await page.waitForSelector('[data-testid="watchlist-item"]')
    }
    
    // 点击第一个关注列表项
    await page.locator('[data-testid="watchlist-item"]').first().click()
    
    // 验证跳转到股票详情页
    await expect(page).toHaveURL(/\/stock\//)
    
    // 验证股票详情页面元素
    await expect(page.locator('[data-testid="stock-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="stock-price"]')).toBeVisible()
    await expect(page.locator('[data-testid="stock-chart"]')).toBeVisible()
  })

  test('应该能够查看和切换技术指标', async ({ page }) => {
    // 导航到股票详情页
    await page.goto('/stock/000001')
    
    // 等待图表加载
    await page.waitForSelector('[data-testid="stock-chart"]')
    
    // 点击技术指标按钮
    await page.locator('[data-testid="technical-indicators-button"]').click()
    
    // 等待指标选择器出现
    await page.waitForSelector('[data-testid="indicator-selector"]')
    
    // 选择MA指标
    await page.locator('[data-testid="indicator-item-MA"]').click()
    
    // 等待图表更新
    await page.waitForTimeout(1000)
    
    // 验证MA指标已添加到图表
    await expect(page.locator('[data-testid="indicator-MA"]')).toBeVisible()
    
    // 选择MACD指标
    await page.locator('[data-testid="indicator-item-MACD"]').click()
    
    // 等待图表更新
    await page.waitForTimeout(1000)
    
    // 验证MACD指标已添加到图表
    await expect(page.locator('[data-testid="indicator-MACD"]')).toBeVisible()
    
    // 移除MA指标
    await page.locator('[data-testid="remove-indicator-MA"]').click()
    
    // 等待图表更新
    await page.waitForTimeout(1000)
    
    // 验证MA指标已移除
    await expect(page.locator('[data-testid="indicator-MA"]')).not.toBeVisible()
  })

  test('应该能够查看财务数据', async ({ page }) => {
    // 导航到股票详情页
    await page.goto('/stock/000001')
    
    // 点击财务数据标签
    await page.locator('[data-testid="financials-tab"]').click()
    
    // 等待财务数据加载
    await page.waitForSelector('[data-testid="financial-statements"]')
    
    // 验证财务报表存在
    await expect(page.locator('[data-testid="income-statement"]')).toBeVisible()
    
    // 切换到资产负债表
    await page.locator('[data-testid="balance-sheet-button"]').click()
    
    // 验证资产负债表存在
    await expect(page.locator('[data-testid="balance-sheet"]')).toBeVisible()
    
    // 切换到现金流量表
    await page.locator('[data-testid="cash-flow-button"]').click()
    
    // 验证现金流量表存在
    await expect(page.locator('[data-testid="cash-flow"]')).toBeVisible()
  })

  test('应该能够响应式适应不同屏幕尺寸', async ({ page }) => {
    // 测试桌面视图
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/dashboard')
    
    // 验证桌面布局
    await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-menu-button"]')).not.toBeVisible()
    
    // 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/dashboard')
    
    // 验证平板布局
    await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible()
    
    // 测试移动视图
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')
    
    // 验证移动布局
    await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
    
    // 测试移动菜单
    await page.locator('[data-testid="mobile-menu-button"]').click()
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
  })

  test('应该正确处理错误状态', async ({ page }) => {
    // 模拟网络错误
    await page.route('**/api/market/indices', route => route.abort())
    
    // 导航到仪表盘
    await page.goto('/dashboard')
    
    // 验证错误状态显示
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible()
    
    // 点击重试按钮
    await page.locator('[data-testid="retry-button"]').click()
    
    // 验证重试操作
    await expect(page.locator('[data-testid="loading-state"]')).toBeVisible()
  })

  test('应该正确处理加载状态', async ({ page }) => {
    // 模拟慢速网络
    await page.route('**/api/market/indices', async route => {
      // 延迟2秒
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.continue()
    })
    
    // 导航到仪表盘
    await page.goto('/dashboard')
    
    // 验证加载状态显示
    await expect(page.locator('[data-testid="loading-state"]')).toBeVisible()
    
    // 等待加载完成
    await page.waitForSelector('[data-testid="market-overview"]', { state: 'visible' })
    
    // 验证加载状态消失
    await expect(page.locator('[data-testid="loading-state"]')).not.toBeVisible()
  })
})

// 辅助函数
async function loginIfNeeded(page: any) {
  // 检查是否需要登录
  const isLoggedIn = await page.evaluate(() => {
    return localStorage.getItem('auth_token') !== null
  })
  
  if (!isLoggedIn) {
    // 导航到登录页
    await page.goto('/login')
    
    // 填写登录表单
    await page.locator('[data-testid="username-input"]').fill('testuser')
    await page.locator('[data-testid="password-input"]').fill('password123')
    
    // 提交表单
    await page.locator('[data-testid="login-button"]').click()
    
    // 等待登录完成
    await page.waitForNavigation()
  }
}

async function getChartData(page: any) {
  // 从图表中提取数据
  return await page.evaluate(() => {
    const chartElement = document.querySelector('[data-testid="market-index-chart"]')
    if (!chartElement) return null
    
    // 这里假设图表数据存储在元素的dataset中
    // 实际实现可能需要根据具体的图表库调整
    return chartElement.dataset.chartData
  })
}