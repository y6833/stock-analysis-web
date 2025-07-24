/**
 * 股票分析端到端测试
 */

import { test, expect } from '@playwright/test'

test.describe('Stock Analysis E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到应用首页
    await page.goto('/')
    
    // 等待应用加载完成
    await page.waitForLoadState('networkidle')
  })

  test.describe('Stock Search', () => {
    test('should search for stocks successfully', async ({ page }) => {
      // 查找搜索输入框
      const searchInput = page.locator('[data-testid="stock-search-input"]')
      await expect(searchInput).toBeVisible()

      // 输入搜索关键词
      await searchInput.fill('平安银行')
      await searchInput.press('Enter')

      // 等待搜索结果加载
      await page.waitForSelector('[data-testid="search-results"]')

      // 验证搜索结果
      const searchResults = page.locator('[data-testid="search-result-item"]')
      await expect(searchResults).toHaveCount.greaterThan(0)

      // 验证第一个结果包含搜索关键词
      const firstResult = searchResults.first()
      await expect(firstResult).toContainText('平安银行')
    })

    test('should show search suggestions', async ({ page }) => {
      const searchInput = page.locator('[data-testid="stock-search-input"]')
      
      // 输入部分关键词
      await searchInput.fill('平安')
      
      // 等待搜索建议出现
      await page.waitForSelector('[data-testid="search-suggestions"]')
      
      // 验证搜索建议
      const suggestions = page.locator('[data-testid="search-suggestion-item"]')
      await expect(suggestions).toHaveCount.greaterThan(0)
      
      // 点击第一个建议
      await suggestions.first().click()
      
      // 验证搜索框被填充
      await expect(searchInput).toHaveValue(/平安/)
    })

    test('should handle empty search results', async ({ page }) => {
      const searchInput = page.locator('[data-testid="stock-search-input"]')
      
      // 搜索不存在的股票
      await searchInput.fill('不存在的股票代码xyz123')
      await searchInput.press('Enter')
      
      // 等待搜索完成
      await page.waitForTimeout(2000)
      
      // 验证显示无结果消息
      const noResults = page.locator('[data-testid="no-search-results"]')
      await expect(noResults).toBeVisible()
      await expect(noResults).toContainText('未找到相关股票')
    })
  })

  test.describe('Stock Details', () => {
    test('should display stock details page', async ({ page }) => {
      // 搜索并选择一只股票
      const searchInput = page.locator('[data-testid="stock-search-input"]')
      await searchInput.fill('000001')
      await searchInput.press('Enter')
      
      // 等待搜索结果并点击第一个
      await page.waitForSelector('[data-testid="search-result-item"]')
      await page.locator('[data-testid="search-result-item"]').first().click()
      
      // 验证跳转到股票详情页
      await expect(page).toHaveURL(/\/stock\/000001/)
      
      // 验证股票详情页面元素
      await expect(page.locator('[data-testid="stock-name"]')).toBeVisible()
      await expect(page.locator('[data-testid="stock-price"]')).toBeVisible()
      await expect(page.locator('[data-testid="stock-change"]')).toBeVisible()
      await expect(page.locator('[data-testid="stock-chart"]')).toBeVisible()
    })

    test('should display stock chart', async ({ page }) => {
      // 直接导航到股票详情页
      await page.goto('/stock/000001')
      
      // 等待图表加载
      await page.waitForSelector('[data-testid="stock-chart"]')
      
      // 验证图表容器存在
      const chartContainer = page.locator('[data-testid="stock-chart"]')
      await expect(chartContainer).toBeVisible()
      
      // 验证图表工具栏
      const chartToolbar = page.locator('[data-testid="chart-toolbar"]')
      await expect(chartToolbar).toBeVisible()
      
      // 测试时间周期切换
      const dayButton = page.locator('[data-testid="chart-period-1d"]')
      await dayButton.click()
      
      // 等待图表更新
      await page.waitForTimeout(1000)
      
      // 验证按钮状态
      await expect(dayButton).toHaveClass(/active/)
    })

    test('should add stock to watchlist', async ({ page }) => {
      // 导航到股票详情页
      await page.goto('/stock/000001')
      
      // 查找添加到关注列表按钮
      const addToWatchlistBtn = page.locator('[data-testid="add-to-watchlist"]')
      await expect(addToWatchlistBtn).toBeVisible()
      
      // 点击添加到关注列表
      await addToWatchlistBtn.click()
      
      // 验证成功提示
      const successToast = page.locator('[data-testid="toast-success"]')
      await expect(successToast).toBeVisible()
      await expect(successToast).toContainText('已添加到关注列表')
      
      // 验证按钮状态变化
      await expect(addToWatchlistBtn).toContainText('已关注')
    })
  })

  test.describe('Watchlist', () => {
    test('should display watchlist page', async ({ page }) => {
      // 导航到关注列表页面
      await page.goto('/watchlist')
      
      // 验证页面标题
      await expect(page.locator('h1')).toContainText('我的关注')
      
      // 验证关注列表容器
      const watchlistContainer = page.locator('[data-testid="watchlist-container"]')
      await expect(watchlistContainer).toBeVisible()
    })

    test('should remove stock from watchlist', async ({ page }) => {
      // 先添加一只股票到关注列表
      await page.goto('/stock/000001')
      await page.locator('[data-testid="add-to-watchlist"]').click()
      
      // 导航到关注列表
      await page.goto('/watchlist')
      
      // 查找删除按钮
      const removeBtn = page.locator('[data-testid="remove-from-watchlist"]').first()
      await expect(removeBtn).toBeVisible()
      
      // 点击删除
      await removeBtn.click()
      
      // 确认删除
      const confirmBtn = page.locator('[data-testid="confirm-remove"]')
      await confirmBtn.click()
      
      // 验证成功提示
      const successToast = page.locator('[data-testid="toast-success"]')
      await expect(successToast).toBeVisible()
      await expect(successToast).toContainText('已从关注列表移除')
    })

    test('should sort watchlist', async ({ page }) => {
      await page.goto('/watchlist')
      
      // 点击排序按钮
      const sortBtn = page.locator('[data-testid="sort-watchlist"]')
      await sortBtn.click()
      
      // 选择按涨跌幅排序
      const sortByChange = page.locator('[data-testid="sort-by-change"]')
      await sortByChange.click()
      
      // 等待排序完成
      await page.waitForTimeout(1000)
      
      // 验证排序结果（这里需要根据实际数据验证）
      const watchlistItems = page.locator('[data-testid="watchlist-item"]')
      await expect(watchlistItems).toHaveCount.greaterThan(0)
    })
  })

  test.describe('Portfolio', () => {
    test('should display portfolio page', async ({ page }) => {
      await page.goto('/portfolio')
      
      // 验证页面标题
      await expect(page.locator('h1')).toContainText('投资组合')
      
      // 验证投资组合概览
      const portfolioOverview = page.locator('[data-testid="portfolio-overview"]')
      await expect(portfolioOverview).toBeVisible()
      
      // 验证持仓列表
      const holdingsList = page.locator('[data-testid="holdings-list"]')
      await expect(holdingsList).toBeVisible()
    })

    test('should add new position', async ({ page }) => {
      await page.goto('/portfolio')
      
      // 点击添加持仓按钮
      const addPositionBtn = page.locator('[data-testid="add-position"]')
      await addPositionBtn.click()
      
      // 填写持仓信息
      await page.locator('[data-testid="stock-symbol-input"]').fill('000001')
      await page.locator('[data-testid="quantity-input"]').fill('1000')
      await page.locator('[data-testid="price-input"]').fill('10.50')
      
      // 提交表单
      const submitBtn = page.locator('[data-testid="submit-position"]')
      await submitBtn.click()
      
      // 验证成功提示
      const successToast = page.locator('[data-testid="toast-success"]')
      await expect(successToast).toBeVisible()
      await expect(successToast).toContainText('持仓添加成功')
      
      // 验证持仓出现在列表中
      const newPosition = page.locator('[data-testid="position-000001"]')
      await expect(newPosition).toBeVisible()
    })
  })

  test.describe('Data Source Management', () => {
    test('should switch data source', async ({ page }) => {
      // 导航到设置页面
      await page.goto('/settings/data-source')
      
      // 查找数据源选择器
      const dataSourceSelect = page.locator('[data-testid="data-source-select"]')
      await expect(dataSourceSelect).toBeVisible()
      
      // 切换到新浪财经数据源
      await dataSourceSelect.selectOption('sina')
      
      // 点击保存按钮
      const saveBtn = page.locator('[data-testid="save-data-source"]')
      await saveBtn.click()
      
      // 验证成功提示
      const successToast = page.locator('[data-testid="toast-success"]')
      await expect(successToast).toBeVisible()
      await expect(successToast).toContainText('数据源切换成功')
    })

    test('should test data source connection', async ({ page }) => {
      await page.goto('/settings/data-source')
      
      // 点击测试连接按钮
      const testBtn = page.locator('[data-testid="test-data-source"]')
      await testBtn.click()
      
      // 等待测试完成
      await page.waitForSelector('[data-testid="test-result"]')
      
      // 验证测试结果
      const testResult = page.locator('[data-testid="test-result"]')
      await expect(testResult).toBeVisible()
      await expect(testResult).toContainText(/连接/)
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      // 设置移动设备视口
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto('/')
      
      // 验证移动端导航
      const mobileNav = page.locator('[data-testid="mobile-nav"]')
      await expect(mobileNav).toBeVisible()
      
      // 测试搜索功能
      const searchBtn = page.locator('[data-testid="mobile-search-btn"]')
      await searchBtn.click()
      
      const searchInput = page.locator('[data-testid="stock-search-input"]')
      await expect(searchInput).toBeVisible()
      
      await searchInput.fill('000001')
      await searchInput.press('Enter')
      
      // 验证搜索结果在移动端正常显示
      await page.waitForSelector('[data-testid="search-results"]')
      const searchResults = page.locator('[data-testid="search-result-item"]')
      await expect(searchResults).toHaveCount.greaterThan(0)
    })

    test('should work on tablet devices', async ({ page }) => {
      // 设置平板设备视口
      await page.setViewportSize({ width: 768, height: 1024 })
      
      await page.goto('/')
      
      // 验证平板端布局
      const mainContent = page.locator('[data-testid="main-content"]')
      await expect(mainContent).toBeVisible()
      
      // 测试图表在平板端的显示
      await page.goto('/stock/000001')
      const stockChart = page.locator('[data-testid="stock-chart"]')
      await expect(stockChart).toBeVisible()
      
      // 验证图表尺寸适配
      const chartRect = await stockChart.boundingBox()
      expect(chartRect?.width).toBeLessThanOrEqual(768)
    })
  })

  test.describe('Performance', () => {
    test('should load pages within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      
      // 验证首页加载时间不超过3秒
      expect(loadTime).toBeLessThan(3000)
    })

    test('should handle large datasets efficiently', async ({ page }) => {
      // 导航到包含大量数据的页面
      await page.goto('/market-scanner')
      
      // 等待数据加载
      await page.waitForSelector('[data-testid="market-data-table"]')
      
      // 验证虚拟滚动或分页功能
      const dataTable = page.locator('[data-testid="market-data-table"]')
      await expect(dataTable).toBeVisible()
      
      // 测试滚动性能
      await page.evaluate(() => {
        const table = document.querySelector('[data-testid="market-data-table"]')
        if (table) {
          table.scrollTop = 1000
        }
      })
      
      // 验证滚动后数据仍然正常显示
      await page.waitForTimeout(500)
      await expect(dataTable).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // 模拟网络离线
      await page.context().setOffline(true)
      
      await page.goto('/')
      
      // 尝试搜索股票
      const searchInput = page.locator('[data-testid="stock-search-input"]')
      await searchInput.fill('000001')
      await searchInput.press('Enter')
      
      // 验证离线提示
      const offlineMessage = page.locator('[data-testid="offline-message"]')
      await expect(offlineMessage).toBeVisible()
      await expect(offlineMessage).toContainText('网络连接不可用')
      
      // 恢复网络连接
      await page.context().setOffline(false)
      
      // 验证自动重试或手动重试功能
      const retryBtn = page.locator('[data-testid="retry-btn"]')
      if (await retryBtn.isVisible()) {
        await retryBtn.click()
      }
      
      // 验证网络恢复后功能正常
      await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 })
    })

    test('should display user-friendly error messages', async ({ page }) => {
      // 导航到可能出错的页面
      await page.goto('/stock/INVALID_SYMBOL')
      
      // 验证错误消息显示
      const errorMessage = page.locator('[data-testid="error-message"]')
      await expect(errorMessage).toBeVisible()
      await expect(errorMessage).toContainText('股票代码不存在')
      
      // 验证错误页面包含有用的操作
      const backBtn = page.locator('[data-testid="back-to-search"]')
      await expect(backBtn).toBeVisible()
      
      await backBtn.click()
      
      // 验证返回到搜索页面
      await expect(page).toHaveURL('/')
    })
  })
})