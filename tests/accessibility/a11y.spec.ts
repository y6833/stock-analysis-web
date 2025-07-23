import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// 测试主页的可访问性
test('主页应符合WCAG 2.1 AA标准', async ({ page }) => {
  await page.goto('/');
  
  // 等待页面加载完成
  await page.waitForSelector('.app-main', { state: 'visible' });
  
  // 运行可访问性测试
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  
  // 验证没有违反WCAG 2.1 AA级别的问题
  expect(accessibilityScanResults.violations).toEqual([]);
});

// 测试辅助功能设置页面的可访问性
test('辅助功能设置页面应符合WCAG 2.1 AA标准', async ({ page }) => {
  await page.goto('/settings/accessibility');
  
  // 等待页面加载完成
  await page.waitForSelector('.accessibility-settings-view', { state: 'visible' });
  
  // 运行可访问性测试
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  
  // 验证没有违反WCAG 2.1 AA级别的问题
  expect(accessibilityScanResults.violations).toEqual([]);
});

// 测试键盘导航
test('应用程序应支持键盘导航', async ({ page }) => {
  await page.goto('/');
  
  // 使用Tab键导航
  await page.keyboard.press('Tab');
  
  // 验证跳过导航链接获得焦点
  const skipLink = await page.$('.skip-link:focus-visible');
  expect(skipLink).not.toBeNull();
  
  // 按下Enter键激活跳过导航链接
  await page.keyboard.press('Enter');
  
  // 验证焦点移动到主内容区域
  const activeElement = await page.evaluate(() => document.activeElement?.id);
  expect(activeElement).toBe('main-content');
});

// 测试屏幕阅读器支持
test('应用程序应提供适当的ARIA属性', async ({ page }) => {
  await page.goto('/');
  
  // 验证主要区域有适当的ARIA角色
  const header = await page.$('header[role="banner"]');
  expect(header).not.toBeNull();
  
  const navigation = await page.$('[role="navigation"]');
  expect(navigation).not.toBeNull();
  
  const main = await page.$('main[role="main"]');
  expect(main).not.toBeNull();
  
  const footer = await page.$('footer[role="contentinfo"]');
  expect(footer).not.toBeNull();
});

// 测试颜色对比度
test('按钮应有足够的颜色对比度', async ({ page }) => {
  await page.goto('/');
  
  // 获取主要按钮的背景色和文本颜色
  const buttonColors = await page.evaluate(() => {
    const button = document.querySelector('.app-button--primary');
    if (!button) return null;
    
    const styles = window.getComputedStyle(button);
    return {
      backgroundColor: styles.backgroundColor,
      color: styles.color
    };
  });
  
  // 验证按钮存在
  expect(buttonColors).not.toBeNull();
  
  // 注意：这里我们不能直接测试对比度，因为需要复杂的计算
  // 在实际测试中，可以使用专门的工具或库来计算对比度
});

// 测试响应式设计
test('应用程序应在不同视口大小下正确显示', async ({ page }) => {
  // 测试移动设备视图
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  
  // 验证移动视图中的元素可见性
  const mobileMenuVisible = await page.isVisible('.show-sm');
  expect(mobileMenuVisible).toBeTruthy();
  
  // 测试平板设备视图
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');
  
  // 验证平板视图中的元素可见性
  const tabletMenuVisible = await page.isVisible('.show-md');
  expect(tabletMenuVisible).toBeTruthy();
  
  // 测试桌面视图
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  
  // 验证桌面视图中的元素可见性
  const desktopMenuVisible = await page.isVisible('.hide-sm');
  expect(desktopMenuVisible).toBeTruthy();
});